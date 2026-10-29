import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { RegionSearch, Seg, Pill, Callout } from '../components/ui';
import { RegionCard } from '../components/RegionCard';
import { AmbangInfo } from '../components/AmbangInfo';
import { alertFor, PROGRAM_LABEL, resepPemda, resepPencari, resepPelatihanText, skorPelatihan, ROLE_LABEL, type Edu, type Program, type Usia } from '../lib/reco';
import { approx, n1, pct, shortName } from '../lib/format';
import { C } from '../lib/colors';
import type { Region, Role } from '../lib/types';

export default function Kompas() {
  const { role, setParam, selected, select, go } = useApp();
  return (
    <div className="page kompas">
      <header className="page-head">
        <div className="eyebrow">KOMPAS PELUANG</div>
        <h1>Pilih peran. Dapatkan arah.</h1>
        <p className="lead">Rekomendasi di bawah dihasilkan dari aturan yang terbuka dan setiap saran menampilkan data pemicunya. Ini alat bantu keputusan, bukan vonis.</p>
        <Seg<Role> label="Peran" value={role} onChange={(v) => setParam('r', v)} options={(['pemda', 'pencari', 'pelatihan'] as Role[]).map((v) => ({ v, l: ROLE_LABEL[v] }))} />
      </header>
      {role === 'pemda' && <Pemda />}
      {role === 'pencari' && <Pencari />}
      {role === 'pelatihan' && <Pelatihan />}
      <p className="note center">Ingin melihat letaknya di peta? <button className="link" onClick={() => go('peta', selected ? { w: String(selected.id) } : {})}>Buka Peta Alamat</button></p>
    </div>
  );
}

/** Kartu Alamat di samping daftar (desktop) atau sebagai lembar bawah (ponsel), bukan di bawah daftar. */
function SideCard({ hint }: { hint: string }) {
  const { selected, select } = useApp();
  if (!selected) return <aside className="side-card empty-card"><div className="eyebrow">KARTU ALAMAT</div><h3>Pilih satu daerah</h3><p>{hint}</p></aside>;
  return (
    <aside className="side-card has" aria-live="polite">
      <div className="sheet-backdrop" onClick={() => select(null)} aria-hidden />
      <div className="sheet"><RegionCard r={selected} onClose={() => select(null)} onPick={(id) => select(id)} /></div>
    </aside>
  );
}

function Pemda() {
  const { data, select, selected } = useApp();
  const { regions, nat } = data;
  const [prov, setProv] = useState(''); const [ambang, setAmbang] = useState(6);
  const provs = useMemo(() => [...new Set(regions.map((r) => r.pv))].sort(), [regions]);
  const rows = useMemo(() => regions.filter((r) => !r.art && (!prov || r.pv === prov)).map((r) => ({ r, a: alertFor(r, nat, ambang) })), [regions, prov, nat, ambang]);
  const counts = useMemo(() => { const c: Record<string, number> = { merah: 0, oranye: 0, kuning: 0, hijau: 0 }; rows.forEach((x) => { c[x.a.level]++; }); return c; }, [rows]);
  const top = useMemo(() => [...rows].sort((a, b) => (b.r.skor ?? 0) - (a.r.skor ?? 0)).slice(0, 15), [rows]);
  const popAt = rows.filter((x) => x.a.level === 'merah' || x.a.level === 'oranye').reduce((s, x) => s + x.r.pop, 0);
  const sel = selected;
  // portofolio intervensi: ringkas jenis resep utama dari 15 teratas
  const portfolio = useMemo(() => {
    const m = new Map<string, number>();
    top.forEach((x) => { resepPemda(x.r, data).filter((a) => a.prioritas <= 2).forEach((a) => m.set(a.judul, (m.get(a.judul) ?? 0) + 1)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [top, data]);
  return (
    <>
      <div className="panel">
        <div className="scope">
          <div>
          <h3>Atur cakupan</h3>
          <label className="fld">Provinsi<select value={prov} onChange={(e) => setProv(e.target.value)}><option value="">Seluruh Indonesia</option>{provs.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="fld">Ambang TPT untuk siaga: <b>{pct(ambang)}</b><input type="range" min={4} max={9} step={0.5} value={ambang} onChange={(e) => setAmbang(Number(e.target.value))} /></label>
          <div className="alerts">
            {([['merah', 'Siaga merah', C.red], ['oranye', 'Waspada', C.orange], ['kuning', 'Pantau', C.gold], ['hijau', 'Relatif aman', C.teal]] as const).map(([k, l, c]) => <div key={k}><i style={{ background: c }} /><b>{counts[k]}</b><span>{l}</span></div>)}
          </div>
          <p className="note">Wilayah siaga merah atau waspada dihuni ± {n1(popAt / 1e6)} juta orang.</p>
          </div>
          {portfolio.length > 0 && <div><h4>Intervensi yang paling sering muncul (15 teratas)</h4><ul className="port">{portfolio.slice(0, 6).map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul></div>}
        </div>
        <AmbangInfo ambang={ambang} />
      </div>
      <div className="split">
        <div className="panel">
          <h3>Antrean prioritas {prov ? `· ${prov}` : ''}</h3>
          <ol className="queue">
            {top.map(({ r, a }, i) => (
              <li key={r.id} className={sel?.id === r.id ? 'on' : ''}>
                <button onClick={() => select(r.id)}>
                  <span className="rk">{i + 1}</span>
                  <span className="qn"><b>{shortName(r.n)}</b><em>{r.pv} · {r.lisa === 'ns' ? 'tanpa klaster' : 'klaster ' + r.lisa} · {r.tip.toLowerCase()}</em><small>{resepPemda(r, data)[0]?.judul}</small></span>
                  <span className="qb"><Pill color={a.color} soft>{a.label}</Pill><small>{n1(r.skor ?? 0)} · TPT {pct(r.tpt)}</small></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <SideCard hint="Klik salah satu daerah di antrean untuk membuka kartunya di sini: status siaga beserta alasannya, profil, tetangga, dan resep kebijakan." />
      </div>
    </>
  );
}

function Pencari() {
  const { data, selected, select } = useApp();
  const [edu, setEdu] = useState<Edu>('SMK'); const [usia, setUsia] = useState<Usia>('15-24');
  const r = selected;
  const res = useMemo(() => (r ? resepPencari(r, edu, usia, data) : null), [r, edu, usia, data]);
  return (
    <div className="grid2">
      <div className="panel">
        <h3>Ceritakan sedikit tentang Anda</h3>
        <p className="note">Tidak ada data pribadi yang dikirim ke mana pun; semuanya dihitung di peramban Anda.</p>
        <label className="fld">Daerah tempat tinggal</label>
        <RegionSearch value={r} onPick={(x) => select(x.id)} autoFocus={!r} />
        {r && <div className="chosen"><b>{r.n}</b><span>{r.pv}</span></div>}
        <label className="fld">Pendidikan terakhir</label>
        <Seg<Edu> label="Pendidikan" value={edu} onChange={setEdu} options={(['SD', 'SMP', 'SMA', 'SMK', 'Diploma', 'Sarjana'] as Edu[]).map((v) => ({ v, l: v }))} />
        <label className="fld">Usia</label>
        <Seg<Usia> label="Usia" value={usia} onChange={setUsia} options={[{ v: '15-24', l: '15–24' }, { v: '25-34', l: '25–34' }, { v: '35+', l: '35+' }]} />
      </div>
      <div className="panel">
        {!res || !r ? <div className="empty"><h3>Mulai dari daerah Anda</h3><p>Pilih kabupaten/kota untuk melihat peta peluang yang disesuaikan.</p></div> : (
          <>
            <h3>Peta peluang untuk Anda</h3>
            <ul className="ctx">{res.konteks.map((k, i) => <li key={i}>{k}</li>)}</ul>
            <h4>Sektor yang layak dilirik <Pill soft>heuristik</Pill></h4>
            <ol className="sekl">{res.sektor.map((s) => <li key={s.s.nama}><b>{s.s.nama.split(',')[0].split(';')[0]}</b><span>{s.catatan} · upah rata-rata ≈ {n1(s.s.upah_juta)} jt/bulan</span></li>)}</ol>
            <h4>Hambatan yang paling mungkin <Pill soft>hipotesis dari indikator</Pill></h4>
            {res.hambatan.slice(0, 3).map((h) => (
              <div key={h.kode} className="hb"><div className="hbh"><b>{h.judul}</b><i style={{ width: `${Math.round(h.skor * 100)}%` }} /></div><small>{h.alasan}</small><ul>{h.solusi.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            ))}
            <h4>Langkah berikutnya</h4>
            <ol className="steps2">{res.langkah.map((x, i) => <li key={i}>{x}</li>)}</ol>
            {res.tetangga.length > 0 && <div className="chips">{res.tetangga.map((t) => <span className="chip" key={t.id}>{shortName(t.n)} <b>{pct(t.tpt)}</b></span>)}</div>}
            <Callout kind="warn" title="Perlu diingat">Ini peta konteks, bukan daftar lowongan. Tidak ada data lowongan atau upah daerah di sini; sektor diurutkan dari pengganda kerja nasional dan kecocokan tipologi daerah.</Callout>
          </>
        )}
      </div>
    </div>
  );
}

function Pelatihan() {
  const { data, select, selected, go } = useApp();
  const { regions } = data;
  const [prog, setProg] = useState<Program>('vokasi'); const [n, setN] = useState(8); const [prov, setProv] = useState('');
  const provs = useMemo(() => [...new Set(regions.map((r) => r.pv))].sort(), [regions]);
  const ranked = useMemo(() => regions.filter((r) => !prov || r.pv === prov).map((r) => ({ r, s: skorPelatihan(r, prog) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s), [regions, prog, prov]);
  const picks = ranked.slice(0, n);
  const cover = picks.reduce((s, x) => s + x.r.est, 0);
  const totalEst = regions.filter((r) => !prov || r.pv === prov).reduce((s, r) => s + r.est, 0);
  const max = picks[0]?.s ?? 1;
  return (
    <>
    <div className="panel">
      <div className="scope">
      <div>
        <h3>Di mana kelas paling dibutuhkan?</h3>
        <label className="fld">Jenis program</label>
        <div className="progs">{(Object.keys(PROGRAM_LABEL) as Program[]).map((k) => <button key={k} className={'progbtn' + (prog === k ? ' on' : '')} onClick={() => setProg(k)}>{PROGRAM_LABEL[k]}</button>)}</div>
      </div>
      <div>
        <label className="fld">Provinsi<select value={prov} onChange={(e) => setProv(e.target.value)}><option value="">Seluruh Indonesia</option>{provs.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="fld">Jumlah lokasi: <b>{n}</b><input type="range" min={3} max={20} value={n} onChange={(e) => setN(Number(e.target.value))} /></label>
        <div className="coverage"><b>{approx(cover)}</b><span>penganggur (estimasi) berada di {n} lokasi ini, ≈ {n1((cover / Math.max(totalEst, 1)) * 100)}% dari cakupan terpilih</span></div>
        <p className="note">Skor = estimasi jumlah penganggur × kecocokan program dengan tipologi dan pendidikan setempat × bobot TPT (klaster HH diberi tambahan 25%). Aturan eksplisit, bukan model terlatih.</p>
      </div>
      </div>
    </div>
    <div className="split">
      <div className="panel">
        <h3>Lokasi yang disarankan</h3>
        <ol className="queue">
          {picks.map(({ r, s }, i) => (
            <li key={r.id} className={selected?.id === r.id ? 'on' : ''}>
              <button onClick={() => select(r.id)}>
                <span className="rk">{i + 1}</span>
                <span className="qn"><b>{shortName(r.n)}</b><em>{r.pv}</em><small>{resepPelatihanText(r, prog)}</small></span>
                <span className="qb"><i className="bar" style={{ width: `${(s / max) * 100}%` }} /><small>{approx(r.est)}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <button className="btn ghost" onClick={() => go('peta', selected ? { w: String(selected.id) } : { l: 'tpt' })}>Lihat di peta</button>
      </div>
      <SideCard hint="Klik lokasi di daftar untuk melihat kartu alamatnya di sini, lengkap dengan alasan mengapa kelas layak dibuka." />
    </div>
    </>
  );
}
