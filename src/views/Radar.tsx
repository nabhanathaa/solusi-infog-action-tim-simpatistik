import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { FanChart, Frame, Spark } from '../components/Charts';
import { Callout, Pill } from '../components/ui';
import { alertFor } from '../lib/reco';
import { AmbangInfo } from '../components/AmbangInfo';
import { C } from '../lib/colors';
import { approx, n0, n1, n2, pct, shortName } from '../lib/format';

export default function Radar() {
  const { data, select, go } = useApp();
  const { nat, regions } = data;
  const [shock, setShock] = useState(0);
  const [ambang, setAmbang] = useState(6);
  const fc = nat.forecast; const last = fc[fc.length - 1];
  const lf = (nat.penganggur_feb2026_juta / (nat.tpt_terbaru[nat.tpt_terbaru.length - 1].v / 100)); // juta
  const extra = (shock / 100) * lf;
  const realised = fc.filter((f) => f.realisasi != null);
  const alerts = useMemo(() => regions.map((r) => ({ r, a: alertFor(r, nat, ambang) })), [regions, nat, ambang]);
  const grp = (l: string) => alerts.filter((x) => x.a.level === l);
  const merah = grp('merah'); const oranye = grp('oranye');
  const edu = nat.pendidikan_share; const iy = edu.kolom.indexOf('SMA+SMK+Dipl+Univ');
  const sma = edu.data.map((r) => r[iy]); const yrs = edu.tahun;
  const i05 = yrs.indexOf(2005), i24 = yrs.indexOf(2024);
  const top = useMemo(() => [...merah, ...oranye].sort((a, b) => (b.r.skor ?? 0) - (a.r.skor ?? 0)).slice(0, 10), [merah, oranye]);
  return (
    <div className="page radar">
      <header className="page-head">
        <div className="eyebrow">RADAR PERINGATAN DINI</div>
        <h1>Apa yang perlu diwaspadai?</h1>
        <p className="lead">Dua lapis: kisaran proyeksi nasional (model deret waktu) dan status siaga per daerah (aturan eksplisit dari klaster dan indikator). Keduanya menunjukkan potensi, bukan ramalan pasti.</p>
      </header>

      <div className="grid2">
        <div className="panel">
          <h3>Proyeksi TPT nasional</h3>
          <FanChart seri={nat.tpt_seri} fc={fc} shift={shock} h={300} />
          <div className="scn"><label className="fld">Skenario guncangan ekonomi (what-if): <b>+{n1(shock)} poin TPT</b><input type="range" min={0} max={3} step={0.25} value={shock} onChange={(e) => setShock(Number(e.target.value))} /></label>
            {shock > 0 ? <p>Pada Agustus 2028 median bergeser ke <b>{n2(last.median + shock)}%</b> (interval 80%: {n2(last.lo80 + shock)}–{n2(last.hi80 + shock)}%), tambahan ≈ <b>{n1(extra)} juta</b> penganggur dibanding proyeksi dasar.</p> : <p>Dasar: median <b>{n2(last.median)}%</b> (interval 80%: {n2(last.lo80)}–{n2(last.hi80)}%) pada {last.periode}. Geser slider untuk melihat dampak guncangan hipotetis (bertahap dalam tiga periode pertama).</p>}
          </div>
          <Callout kind="demo" title="Skenario bukan hasil model">Pergeseran di atas hanya menambahkan selisih tetap pada median dan interval. Gunakan untuk bertanya "bagaimana kalau", bukan untuk memperkirakan kemungkinan.</Callout>
        </div>
        <div className="panel">
          <h3>Uji ke belakang: apakah model jujur?</h3>
          <table className="tbl"><thead><tr><th>Periode</th><th>Proyeksi</th><th>Interval 80%</th><th>Realisasi</th></tr></thead>
            <tbody>{realised.map((f) => <tr key={f.periode}><td>{f.periode}</td><td>{n2(f.median)}%</td><td>{n2(f.lo80)}–{n2(f.hi80)}%</td><td><b>{n2(f.realisasi!)}%</b> {f.di_dalam_PI80 ? <Pill soft color={C.teal}>di dalam</Pill> : <Pill soft color={C.red}>di luar</Pill>}</td></tr>)}</tbody></table>
          <p className="note">Realisasi 2025–Feb 2026 (BRS BPS) masuk dalam interval 80%. Tiga titik terlalu sedikit untuk mengklaim akurasi. Pada validasi rolling-origin, model naif, ETS, dan local linear trend memiliki galat hampir sama (MASE ≈ 1,8) dan tidak ada yang meyakinkan mengalahkan naif: arah TPT tidak dapat diramal andal dari data semesteran ini. Karena itu yang kami tampilkan adalah <b>rentang ketidakpastian</b>, bukan satu garis tren.</p>
          <h4>Wajah penganggur berubah</h4>
          <div className="trendnote"><Spark values={sma.slice(i05)} w={220} h={52} color={C.red} /><div><b>{n0(sma[i05])}% → {n0(sma[i24])}%</b><span>penganggur lulusan SMA ke atas, 2005 → 2024</span></div></div>
          <p className="note">Masalahnya bergeser dari akses sekolah ke kecocokan keahlian. Penganggur lulusan universitas ≈ 0,84 juta (Agu 2024); proyeksi median Agustus 2028 ≈ 1,0 juta dengan interval 80% 0,59–1,72 juta, jadi peluang melewati 1 juta kira-kira seimbang.</p>
        </div>
      </div>

      <div className="panel">
        <div className="rh"><h3>Status siaga per daerah</h3><label className="fld inl">Ambang TPT: <b>{pct(ambang)}</b><input type="range" min={4} max={9} step={0.5} value={ambang} onChange={(e) => setAmbang(Number(e.target.value))} /></label></div>
        <div className="alerts big">
          {([['merah', 'Siaga merah', C.red], ['oranye', 'Waspada', C.orange], ['kuning', 'Pantau', C.gold], ['hijau', 'Relatif aman', C.teal], ['abu', 'Data diragukan', C.grey]] as const).map(([k, l, c]) => { const g = grp(k); const p = g.reduce((s, x) => s + x.r.pop, 0); return <div key={k}><i style={{ background: c }} /><b>{g.length}</b><span>{l}</span><small>{n1(p / 1e6)} jt jiwa</small></div>; })}
        </div>
        <AmbangInfo ambang={ambang} open />
        <h4>Sepuluh alamat teratas</h4>
        <ol className="queue">
          {top.map(({ r, a }, i) => (
            <li key={r.id}><button onClick={() => { select(r.id); go('peta', { w: String(r.id) }); }}>
              <span className="rk">{i + 1}</span><span className="qn"><b>{shortName(r.n)}</b><em>{r.pv}</em><small>{a.why}</small></span><span className="qb"><Pill color={a.color} soft>{a.label}</Pill><small>{approx(r.est)}</small></span>
            </button></li>
          ))}
        </ol>
        <p className="note">Belum ada deret waktu per daerah, sehingga peringatan dini tingkat daerah berbasis kondisi saat ini (klaster dan indikator), bukan proyeksi naik-turun per daerah. Setelah data Sakernas semesteran kab/kota terkumpul, lapisan ini dapat diganti model prediktif.</p>
      </div>
    </div>
  );
}
