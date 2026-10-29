import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { RegionSearch, Callout, Pill } from '../components/ui';
import { IOQuadrant } from '../components/Charts';
import { investasiUntuk, PRESET, simulasi } from '../lib/sim';
import { approx, n0, n1, pct, shortName } from '../lib/format';
import { C } from '../lib/colors';

const short = (n: string) => n.replace(/ dan .*$/, '').replace(/,.*$/, '').replace(/;.*$/, '').replace(/^Penyediaan /, '').replace(/^Pengadaan /, '');

export default function Simulator() {
  const { data, selected, select } = useApp();
  const sek = data.nat.io.sektor;
  const [preset, setPreset] = useState<string>('seimbang');
  const [alok, setAlok] = useState<Record<string, number>>(() => PRESET.seimbang.alokasi(sek));
  const [tril, setTril] = useState(5); const [infl, setInfl] = useState(18); const [kap, setKap] = useState(50);
  const [hi, setHi] = useState<string | null>(null);
  const inp = { alokasi: alok, totalMiliar: tril * 1000, inflasi: infl / 100, kapture: kap / 100 };
  const out = useMemo(() => simulasi(sek, inp), [sek, alok, tril, infl, kap]);
  const rows = useMemo(() => [...out.perSektor].filter((x) => x.total > 0.5).sort((a, b) => b.total - a.total), [out]);
  const maxRow = rows[0]?.total ?? 1;
  const cmp = useMemo(() => Object.entries(PRESET).map(([k, p]) => { const o = simulasi(sek, { ...inp, alokasi: p.alokasi(sek) }); return { k, label: p.label, total: o.total, upah: o.upahRata ?? 0 }; }), [sek, tril, infl, kap]);
  const maxCmp = Math.max(...cmp.map((c) => c.total));
  const unemp = selected && !selected.art ? selected.est : null;
  const serap = unemp ? (out.efekLokal / unemp) * 100 : null;
  const need = (frac: number) => (unemp ? investasiUntuk(sek, alok, infl / 100, kap / 100, unemp * frac) : null);
  const applyPreset = (k: string) => { setPreset(k); setAlok(PRESET[k].alokasi(sek)); };
  const fmtTril = (miliar: number) => (miliar >= 1000 ? n1(miliar / 1000) + ' triliun' : n0(miliar) + ' miliar');
  const quality = out.upahRata;

  return (
    <div className="page sim">
      <header className="page-head">
        <div className="eyebrow">SIMULATOR INVESTASI → KERJA</div>
        <h1>Berapa kerja yang lahir dari satu rupiah?</h1>
        <p className="lead">Geser anggaran dan bauran sektor. Simulator memakai pengganda kerja dari tabel Input-Output 2020 (efek langsung + tidak langsung), lalu membandingkannya dengan penganggur di daerah pilihan.</p>
      </header>
      <div className="grid2 sim-grid">
        <div className="panel">
          <h3>Skenario</h3>
          <div className="presets">{Object.entries(PRESET).map(([k, p]) => <button key={k} className={'progbtn' + (preset === k ? ' on' : '')} onClick={() => applyPreset(k)} title={p.desc}><b>{p.label}</b><small>{p.desc}</small></button>)}</div>
          <label className="fld">Total investasi: <b>{n1(tril)} triliun Rp</b><input type="range" min={0.5} max={100} step={0.5} value={tril} onChange={(e) => setTril(Number(e.target.value))} /></label>
          <label className="fld">Kenaikan harga sejak 2020 (asumsi): <b>{infl}%</b><input type="range" min={0} max={40} value={infl} onChange={(e) => setInfl(Number(e.target.value))} /></label>
          <label className="fld">Bagian efek yang tinggal di daerah (asumsi): <b>{kap}%</b><input type="range" min={10} max={100} step={5} value={kap} onChange={(e) => setKap(Number(e.target.value))} /></label>
          <details className="alok" open>
            <summary>Bauran sektor (bobot relatif)</summary>
            {sek.map((s) => (
              <label key={s.nama} className="arow" onMouseEnter={() => setHi(s.nama)} onMouseLeave={() => setHi(null)}>
                <span>{short(s.nama)}</span>
                <input type="range" min={0} max={10} step={0.5} value={alok[s.nama] ?? 0} onChange={(e) => { setPreset('kustom'); setAlok({ ...alok, [s.nama]: Number(e.target.value) }); }} aria-label={`Bobot ${short(s.nama)}`} />
                <b>{n1(alok[s.nama] ?? 0)}</b>
              </label>
            ))}
          </details>
        </div>

        <div className="panel result">
          <div className="big"><span>Perkiraan kerja tercipta</span><b>{approx(out.total)}</b><em>{approx(out.langsung)} langsung + {approx(out.tidakLangsung)} tidak langsung</em></div>
          <div className="splitbar" role="img" aria-label="Porsi langsung dan tidak langsung"><i style={{ width: `${(out.langsung / Math.max(out.total, 1)) * 100}%`, background: C.blue }} /><i style={{ width: `${(out.tidakLangsung / Math.max(out.total, 1)) * 100}%`, background: C.gold }} /></div>
          <div className="legend2"><span><i style={{ background: C.blue }} />langsung</span><span><i style={{ background: C.gold }} />tidak langsung</span></div>
          <div className="kpis">
            <div><span>Upah rata-rata kerja langsung</span><b>{quality ? n1(quality) + ' jt' : '–'}</b><em>rata-rata nasional 3,29 jt</em></div>
            <div><span>Biaya per kerja</span><b>{out.total > 0 ? 'Rp ' + n0((tril * 1e6) / out.total) + ' jt' : '–'}</b><em>per pekerjaan (tak langsung ikut)</em></div>
          </div>
          <h4>Sumbangan tiap sektor</h4>
          <div className="srows">{rows.slice(0, 8).map((r) => <div key={r.nama} className="srow" onMouseEnter={() => setHi(r.nama)} onMouseLeave={() => setHi(null)}><span>{short(r.nama)}</span><div><i style={{ width: `${(r.total / maxRow) * 100}%` }} /></div><b>{approx(r.total).replace('± ', '')}</b></div>)}</div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Bandingkan skenario pada anggaran yang sama</h3>
          <p className="note">Dengan Rp {n1(tril)} triliun, sektor padat karya menciptakan lebih banyak kerja, sedangkan skenario kerja layak menghasilkan upah langsung lebih tinggi. Pilih sesuai tujuan kebijakan.</p>
          <div className="cmp">{cmp.map((c) => (
            <div key={c.k} className="cmprow"><span>{c.label}</span><div className="cb"><i style={{ width: `${(c.total / maxCmp) * 100}%`, background: C.blue }} /></div><b>{approx(c.total).replace('± ', '')}</b><em style={{ color: c.upah >= 3.29 ? C.teal : C.amber }}>{n1(c.upah)} jt</em></div>
          ))}</div>
          <div className="legend2"><span>batang = jumlah kerja</span><span>angka kanan = upah langsung rata-rata (jt/bulan)</span></div>
        </div>
        <div className="panel">
          <h3>Terapkan pada satu daerah</h3>
          <RegionSearch value={selected} onPick={(r) => select(r.id)} placeholder="Pilih kabupaten/kota…" />
          {selected && unemp != null ? (
            <div className="apply">
              <p><b>{selected.n}</b> memiliki estimasi {approx(unemp)} penganggur (TPT {pct(selected.tpt)}).</p>
              <div className="absorb"><div className="ab-bar"><i style={{ width: `${Math.min(100, serap!)}%` }} /></div><b>{n1(Math.min(serap!, 999))}%</b></div>
              <p className="note">Dengan asumsi {kap}% efek tinggal di daerah, investasi Rp {n1(tril)} triliun setara menyerap ≈ <b>{n1(serap!)}%</b> penganggur setempat.</p>
              <h4>Investasi yang dibutuhkan, dengan bauran ini</h4>
              <ul className="need">{[0.1, 0.25, 0.5].map((f) => { const v = need(f); return <li key={f}><span>menyerap {f * 100}% penganggur</span><b>{v ? fmtTril(v) : '–'}</b></li>; })}</ul>
            </div>
          ) : <p className="note">{selected?.art ? 'Data TPT daerah ini diragukan; pilih daerah lain.' : 'Pilih daerah untuk membandingkan hasil simulasi dengan jumlah penganggurnya.'}</p>}
        </div>
      </div>

      <div className="panel">
        <h3>Peta sektor: banyak kerja vs upah</h3>
        <IOQuadrant sek={sek} hi={hi} onPick={setHi} h={380} />
        <p className="note">Ukuran titik = keterkaitan ke belakang (BL). Hijau = banyak dan layak. Garis putus-putus = median 17 sektor (pengganda 6,78) dan rata-rata upah nasional (3,29 jt).</p>
      </div>

      <Callout kind="warn" title="Batas simulasi (baca sebelum mengutip)">
        <ul className="lim">
          <li>Tabel IO nasional 2020 (harga 2020); struktur produksi dan produktivitas sudah berubah. Penyesuaian harga di atas hanyalah asumsi sederhana.</li>
          <li>Pengganda bersifat nasional. Berapa bagian efek yang tinggal di satu daerah bergantung rantai pasok; slider "bagian efek di daerah" adalah <b>asumsi Anda</b>, bukan hasil estimasi.</li>
          <li>Upah dihitung dari BRS Sakernas Februari 2026 per sektor, hanya untuk kerja langsung; kerja tidak langsung tidak diberi upah.</li>
          <li>Hasil adalah kemungkinan (potensi), bukan prediksi.</li>
        </ul>
      </Callout>
    </div>
  );
}
