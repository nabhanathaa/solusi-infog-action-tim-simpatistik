"""
build_data.py — mengubah keluaran notebook 01–04 menjadi berkas JSON ringan untuk aplikasi web.

Mengapa skrip ini ada: aplikasi berjalan 100% di peramban (tanpa server). Semua angka yang
ditampilkan harus sudah "matang" sebelum deploy: geometri disederhanakan menjadi path SVG,
tetangga spasial dihitung, skor kewaspadaan dan wilayah mirip dihitung, lalu semuanya ditulis ke
public/data/*.json. Jalankan ulang setiap kali notebook menghasilkan angka baru.

Penggunaan:
  ACTION_DATA_DIR="D:/Infografis Action Unesa 2026" python scripts/build_data.py
  (opsional) SENT_JSON=path/ke/sentimen_ringkasan.json  -> memakai hasil notebook 04 sungguhan.
"""
import json, os, math, sys
from pathlib import Path
import numpy as np, pandas as pd, geopandas as gpd
from shapely.geometry import MultiPolygon, Polygon
from scipy.stats import rankdata

DATA = Path(os.environ.get("ACTION_DATA_DIR", "/home/claude/work/data_local"))
OUT_NB = DATA / "output"
PUB = Path(__file__).resolve().parent.parent / "public" / "data"
PUB.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- 1. data atribut + geometri
df = pd.read_csv(OUT_NB / "lisa_kabkota_2024.csv", encoding="utf-8-sig")
gdf = gpd.read_file(OUT_NB / "lisa_kabkota_2024.geojson")
gdf["kode_bps"] = gdf["kode_bps"].astype(int)
gdf = gdf.set_index("kode_bps").loc[df.kode_bps].reset_index()
assert len(gdf) == len(df) == 514

# ---------------------------------------------------------------- 2. proyeksi Mercator -> path SVG
LON0, LON1, LAT0, LAT1 = 94.5, 141.5, -11.5, 6.5
def merc_y(lat): return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
Y_TOP, Y_BOT = merc_y(LAT1), merc_y(LAT0)
W = 2400.0
SCALE = W / (math.radians(LON1) - math.radians(LON0))
H = round((Y_TOP - Y_BOT) * SCALE)
def proj(lon, lat):
    return ((math.radians(lon) - math.radians(LON0)) * SCALE, (Y_TOP - merc_y(lat)) * SCALE)

def ring_path(coords, tol):
    pts = [proj(x, y) for x, y in coords]
    poly = Polygon(pts)
    if tol > 0:
        poly = poly.simplify(tol, preserve_topology=True)
    if poly.is_empty or poly.geom_type != "Polygon":
        return ""
    c = [(round(x), round(y)) for x, y in poly.exterior.coords]
    dd = [c[0]]
    for p in c[1:]:
        if p != dd[-1]:
            dd.append(p)
    if len(dd) < 3:
        return ""
    s = f"M{dd[0][0]},{dd[0][1]}l" + " ".join(f"{b[0]-a[0]},{b[1]-a[1]}" for a, b in zip(dd[:-1], dd[1:])) + "z"
    return s

items, cents = [], []
for g in gdf.geometry:
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    d, xs, ys = "", [], []
    area_max = max(p.area for p in polys)
    for p in polys:
        pp = Polygon([proj(x, y) for x, y in p.exterior.coords])
        if pp.area < 0.35 and p.area < area_max:     # pulau sangat kecil di bawah ~1 px dibuang
            continue
        d += ring_path(p.exterior.coords, 0.22)
        b = pp.bounds
        xs += [b[0], b[2]]; ys += [b[1], b[3]]
    cx, cy = proj(g.centroid.x, g.centroid.y)
    items.append({"d": d, "b": [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))], "c": [round(cx), round(cy)]})
    cents.append((g.centroid.x, g.centroid.y))
for i, k in enumerate(df.kode_bps): items[i]["id"] = int(k)
json.dump({"W": W, "H": H, "items": items}, open(PUB / "geo.json", "w"), separators=(",", ":"))

# ---------------------------------------------------------------- 3. tetangga KNN k=6 (EPSG:3395, sama dengan notebook 01)
cg = gpd.GeoSeries(gpd.points_from_xy(*zip(*cents)), crs=4326).to_crs(3395)
XY = np.c_[cg.x, cg.y]
D2 = ((XY[:, None, :] - XY[None, :, :]) ** 2).sum(-1)
np.fill_diagonal(D2, np.inf)
NB = np.argsort(D2, 1)[:, :6]

# ---------------------------------------------------------------- 4. turunan
tpt = df.tpt_2024.values
art = (tpt <= 0.5)                                 # 7 kab. Papua: kemungkinan artefak pengukuran
lag = np.array([np.nanmean(np.where(art[NB[i]], np.nan, tpt[NB[i]])) if (~art[NB[i]]).any() else np.nan for i in range(514)])
LFPR_PROXY = 0.54                                  # angkatan kerja ≈ 54% penduduk (nasional ≈154 jt / 284 jt) — proksi kasar
est = df.penduduk_2024.values * LFPR_PROXY * tpt / 100
gap = df.tpt_perempuan_2024.values - df.tpt_laki_2024.values

def pct(v, mask=None):
    v = np.asarray(v, float).copy()
    ok = ~np.isnan(v) if mask is None else (~np.isnan(v)) & mask
    out = np.full(len(v), np.nan)
    out[ok] = (rankdata(v[ok]) - 1) / max(ok.sum() - 1, 1)
    return out

ok = ~art
p_tpt, p_est, p_lag, p_gap, p_pov = pct(tpt, ok), pct(est, ok), pct(lag), pct(gap, ok), pct(df.p0.values)
hh = (df.lisa_p05 == "HH").values.astype(float)
# Indeks Kewaspadaan 0–100 (HEURISTIK transparan, bukan hasil model prediktif; bobot ada di national.json -> skor_bobot)
BOBOT = {"TPT": 0.30, "Jumlah penganggur (estimasi)": 0.25, "TPT tetangga": 0.15, "Kesenjangan gender": 0.10, "Kemiskinan": 0.10, "Klaster HH signifikan": 0.10}
skor = 100 * (0.30 * np.nan_to_num(p_tpt) + 0.25 * np.nan_to_num(p_est) + 0.15 * np.nan_to_num(p_lag) + 0.10 * np.nan_to_num(p_gap) + 0.10 * np.nan_to_num(p_pov) + 0.10 * hh)
skor[art] = np.nan

# wilayah mirip: jarak Euclid ternormalisasi pada 6 fitur (sama dengan fitur tipologi)
F = np.c_[tpt, gap, df.rls_2024, np.log1p(df.pdrb_kapita_ribu), df.p0, np.log1p(df.kepadatan)]
F = (F - np.nanmean(F, 0)) / np.nanstd(F, 0)
DF = ((F[:, None, :] - F[None, :, :]) ** 2).sum(-1); np.fill_diagonal(DF, np.inf)
SIM = np.argsort(DF, 1)[:, :5]

R = []
for i, r in df.iterrows():
    R.append({
        "i": i, "id": int(r.kode_bps), "n": r.nama, "j": r.jenis, "pl": r.pulau, "pv": r.provinsi,
        "tpt": r.tpt_2024, "tl": r.tpt_laki_2024, "tp": r.tpt_perempuan_2024, "rls": r.rls_2024,
        "pdrb": round(r.pdrb_kapita_ribu / 1000, 1), "p0": r.p0, "pop": int(r.penduduk_2024), "dens": r.kepadatan,
        "I": round(r.I_local, 3), "pf": round(r.p_fdr, 4), "lisa": r.lisa_p05, "fdr": r.lisa_fdr,
        "quad": r.quad, "tip": r.tipologi, "art": bool(art[i]),
        "nb": [int(x) for x in NB[i]], "lag": None if np.isnan(lag[i]) else round(float(lag[i]), 2),
        "est": int(round(est[i])), "skor": None if np.isnan(skor[i]) else round(float(skor[i]), 1),
        "mirip": [int(x) for x in SIM[i]],
    })
json.dump(R, open(PUB / "regions.json", "w"), ensure_ascii=False, separators=(",", ":"), allow_nan=False)

# ---------------------------------------------------------------- 5. data nasional
def prof(g):
    g = g[~g.tpt_2024.le(0.5)]
    return {"n": int(len(g)), "tpt": round(float(g.tpt_2024.median()), 2), "rls": round(float(g.rls_2024.median()), 2),
            "pdrb": round(float(g.pdrb_kapita_ribu.median() / 1000), 1), "p0": round(float(g.p0.median()), 2),
            "dens": round(float(g.kepadatan.median()), 0), "pop": int(g.penduduk_2024.sum())}
profil = {"lisa": {k: prof(df[df.lisa_p05 == k]) for k in ["HH", "LL", "HL", "LH", "ns"]},
          "tipologi": {k: prof(df[df.tipologi == k]) for k in df.tipologi.unique()},
          "semua": prof(df)}

tn = pd.read_csv("/home/claude/work/tpt_nasional.csv", index_col=0).sort_index()
tn_series = [{"y": int(y), "v": float(v)} for y, v in tn["Total"].items() if pd.notna(v)]   # 1995 tidak ada datanya
# umur
a = pd.read_csv(DATA / "Tingkat Pengangguran Terbuka Berdasarkan Kelompok Umur 2015-2025.csv", header=None)
years = [int(float(x)) for x in a.iloc[1, 1:].tolist()]
umur = {"tahun": years, "kelompok": {}}
for _, row in a.iloc[2:].iterrows():
    if isinstance(row[0], str):
        try: umur["kelompok"][row[0]] = [float(x) for x in row[1:]]
        except ValueError: pass
umur["catatan"] = "Nilai 2015 tidak dipakai di grafik karena pola kelompok umur tampak berbeda (kemungkinan perbedaan definisi); pakai 2016–2025."
sek = pd.read_csv("/home/claude/work/struktur_9sektor_share.csv", index_col=0)
edu = pd.read_csv("/home/claude/work/penganggur_pendidikan_share.csv", index_col=0)
fc = pd.read_csv(OUT_NB / "forecast_tpt.csv")
fcu = pd.read_csv(OUT_NB / "forecast_univ_penganggur.csv")
io = json.load(open(OUT_NB / "io_untuk_web.json"))
lisa_sum = json.load(open(OUT_NB / "ringkasan_lisa.json"))

nasional = {
    "tpt_seri": tn_series,
    "tpt_terbaru": [{"p": "Agu 2024", "v": 4.91}, {"p": "Feb 2025", "v": 4.76}, {"p": "Agu 2025", "v": 4.85}, {"p": "Feb 2026", "v": 4.68}, {"p": "Mei 2026", "v": 4.65}],
    "catatan_terbaru": "Angka terbaru = Sakernas Mei 2026 (rilis resmi BPS 5 Agustus 2026): TPT 4,65%, 7,22 juta penganggur. Feb 2026 = 4,68% dan 7,24 juta (BRS No. 49/05/Th. XXIX). Upah sektor di tabel IO tetap memakai BRS Feb 2026.",
    "penganggur_feb2026_juta": 7.22,   # nama kolom lama; isinya angka periode terbaru (Mei 2026)
    "umur": umur,
    "sektor_share": {"tahun": [int(i) for i in sek.index], "kolom": list(sek.columns), "data": sek.round(2).values.tolist()},
    "pendidikan_share": {"tahun": [int(i) for i in edu.index], "kolom": list(edu.columns), "data": edu.round(2).values.tolist()},
    "forecast": fc.replace({np.nan: None}).to_dict("records"),
    "forecast_univ": fcu.to_dict("records"),
    "io": io, "lisa": lisa_sum, "profil": profil,
    "skor_bobot": BOBOT, "lfpr_proksi": LFPR_PROXY,
    "jumlah_artefak": int(art.sum()),
}
def clean(o):
    """JSON yang sah: NaN/Inf -> null, numpy -> python."""
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [clean(v) for v in o]
    if isinstance(o, (np.floating, float)): return None if (math.isnan(o) or math.isinf(o)) else float(o)
    if isinstance(o, np.integer): return int(o)
    if isinstance(o, np.bool_): return bool(o)
    return o
json.dump(clean(nasional), open(PUB / "national.json", "w"), ensure_ascii=False, separators=(",", ":"), allow_nan=False)

# ---------------------------------------------------------------- 6. sentimen
sj = os.environ.get("SENT_JSON")
dst = PUB / "sentimen_ringkasan.json"
if sj and Path(sj).exists():
    dst.write_text(Path(sj).read_text(encoding="utf-8"), encoding="utf-8"); print("Sentimen: memakai", sj)
elif not dst.exists():
    print("Sentimen: berkas ilustrasi akan dibuat oleh public/data (sudah ada di repo).")
print("OK:", {p.name: round(p.stat().st_size / 1024) for p in PUB.glob("*.json")}, "KB")
