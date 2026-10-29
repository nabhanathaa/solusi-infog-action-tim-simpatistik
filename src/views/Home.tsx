import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

function useMobile() { const [m, setM] = useState(() => window.matchMedia('(max-width:900px)').matches); useEffect(() => { const q = window.matchMedia('(max-width:900px)'); const f = () => setM(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []); return m; }
import { useApp } from '../lib/store';
import { MapView, boxOf } from '../components/MapView';
import { AgeBars, Bullets, FanChart, IOQuadrant, ThemeBars, TrendChart } from '../components/Charts';
import { RegionSearch, Callout } from '../components/ui';
import { C, type LayerKey } from '../lib/colors';
import { n0, n1, n2, pct, shortName } from '../lib/format';
import type { Region } from '../lib/types';
import { PlayZone } from '../components/Play';
import { WordCloud } from '../components/Sentimen';

function CountUp({ to, dec = 0, suffix = '' }: { to: number; dec?: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / 1400); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{dec ? v.toFixed(dec).replace('.', ',') : n0(v)}{suffix}</>;
}

type Vis =
  | { t: 'map'; layer: LayerKey; hl?: 'HH' | 'LL' | null; focus?: 'hh' | null; labels?: 'top5' | null; stat?: { k: string; v: string; s?: string } }
  | { t: 'profil' } | { t: 'age' } | { t: 'trend' } | { t: 'fan' } | { t: 'io' } | { t: 'voice' };
interface Step { id: string; kicker: string; title: string; body: ReactNode; vis: Vis }

export default function Home() {
  const { data, go } = useApp();
  const { regions, nat, sent, geo } = data;
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const L = nat.lisa as Record<string, number>;
  const top5 = useMemo(() => [...regions].filter((r) => !r.art).sort((a, b) => b.tpt - a.tpt).slice(0, 5), [regions]);
  const hhIds = useMemo(() => regions.filter((r) => r.lisa === 'HH').map((r) => r.id), [regions]);
  const hhSet = useMemo(() => new Set(hhIds), [hhIds]);
  const latest = nat.tpt_terbaru[nat.tpt_terbaru.length - 1];
  const prof = nat.profil;

  const steps: Step[] = [
    { id: 'rata', kicker: '01 · RATA-RATA YANG MENIPU', title: 'Satu angka nasional, 514 cerita lokal', vis: { t: 'map', layer: 'tpt', stat: { k: 'TPT kab/kota, Agu 2024', v: '0 – 11,4%', s: `median ${n1(prof.semua.tpt)}% · nasional ${n2(latest.v)}%` } },
      body: <><p>TPT nasional <b>{n2(latest.v)}%</b> ({latest.p}), setara ±{n2(nat.penganggur_feb2026_juta)} juta orang. Angka itu menenangkan, tetapi ia rata-rata.</p><p>Pada tingkat kabupaten/kota (Agustus 2024) TPT berkisar <b>0 sampai 11,4%</b>. Setiap area di peta ini adalah satu alamat.</p></> },
    { id: 'sebaran', kicker: '02 · SEBARAN', title: 'Lima alamat dengan TPT tertinggi', vis: { t: 'map', layer: 'tpt', labels: 'top5', stat: { k: 'tertinggi', v: pct(top5[0].tpt), s: shortName(top5[0].n) } },
      body: <><p>{top5.map((r, i) => <span key={r.id}>{i > 0 && ', '}<b>{shortName(r.n)}</b> ({pct(r.tpt)})</span>)}.</p><p>{nat.jumlah_artefak} kabupaten di Papua mencatat TPT 0,5% atau kurang (diarsir). Kami menandainya sebagai kemungkinan <b>artefak pengukuran</b> dan tidak memasukkannya ke peringkat.</p></> },
    { id: 'tetangga', kicker: '03 · POLA SPASIAL', title: 'Daerah bertetangga cenderung mirip', vis: { t: 'map', layer: 'lisa', stat: { k: 'Indeks Moran I (k=6)', v: n2(Number(L.moran_I_k6)), s: `z = ${n1(Number(L.moran_z))} · p < 0,001` } },
      body: <><p>Indeks Moran <b>{n2(Number(L.moran_I_k6))}</b> (z = {n1(Number(L.moran_z))}, p &lt; 0,001) menunjukkan TPT <b>mengelompok</b> di ruang, tidak tersebar acak.</p><p>LISA memisahkan klaster tinggi (merah), klaster rendah (biru), dan pencilan. Uji dengan 9.999 permutasi dan diperiksa ulang dengan koreksi FDR.</p></> },
    { id: 'hh', kicker: '04 · KLASTER TINGGI', title: `${L.HH_p05} alamat, 11% wilayah, ${n1(Number(L.HH_pct_penduduk))}% penduduk`, vis: { t: 'map', layer: 'lisa', hl: 'HH', focus: 'hh', stat: { k: 'penduduk di klaster HH', v: n1(Number(L.HH_pct_penduduk)) + '%', s: '11% dari kab/kota' } },
      body: <><p>Klaster tinggi (HH) hanya <b>11%</b> dari kab/kota tetapi dihuni <b>{n1(Number(L.HH_pct_penduduk))}%</b> penduduk dan menampung kira-kira <b>{n0(Number(L.HH_pct_penganggur_proksi))}%</b> penganggur (proksi).</p><p>Ketahanan: dengan koreksi FDR 5% tersisa 32; yang stabil terhadap pilihan tetangga ada 47. Kami melaporkan semuanya, bukan hanya angka terbesar.</p></> },
    { id: 'profil', kicker: '05 · BUKAN SOAL MISKIN', title: 'Klaster tinggi justru padat dan lebih terdidik', vis: { t: 'profil' },
      body: <><p>Dibanding klaster rendah, klaster tinggi lebih padat, sekolahnya lebih lama, dan PDRB per kapita lebih besar. Kemiskinannya lebih rendah.</p><p>Artinya masalah di sini <b>berkaitan dengan</b> daya serap dan kecocokan keahlian di pusat-pusat urban, bukan sekadar kekurangan pembangunan. Ini pola, bukan bukti sebab-akibat.</p></> },
    { id: 'usia', kicker: '06 · SIAPA', title: 'Yang paling sulit: anak muda', vis: { t: 'age' },
      body: <><p>Pada 2025, TPT usia 15–19 tahun <b>23,3%</b> dan 20–24 tahun <b>14,4%</b>, jauh di atas rata-rata nasional ({n2(4.85)}%).</p><p>Transisi sekolah-ke-kerja adalah titik rawan. Garis hitam menandai posisi tahun 2019.</p></> },
    { id: 'tren', kicker: '07 · WAKTU', title: 'Turun, tetapi apakah sudah aman?', vis: { t: 'trend' },
      body: <><p>Dari puncak <b>11,24%</b> pada 2005, TPT turun ke <b>{n2(4.91)}%</b> (2024) dan <b>{n2(latest.v)}%</b> ({latest.p}), setara level 1996–1997. Pandemi 2020 hanya jeda sementara.</p><p>Namun TPT yang rendah tidak otomatis berarti pekerjaannya <b>layak</b>. Itu sebabnya kita menengok kualitas kerja.</p></> },
    { id: 'fc', kicker: '08 · KE DEPAN', title: 'Kisaran, bukan kepastian', vis: { t: 'fan' },
      body: <><p>Model deret waktu (local linear trend dengan dummi COVID) memproyeksikan median <b>{n2(nat.forecast[nat.forecast.length - 1].median)}%</b> pada Agustus 2028 dengan interval 80% <b>{n2(nat.forecast[nat.forecast.length - 1].lo80)}–{n2(nat.forecast[nat.forecast.length - 1].hi80)}%</b>.</p><p>Tiga realisasi terakhir masuk dalam interval 80%. Interval yang lebar adalah pesan jujur tentang ketidakpastian.</p></> },
    { id: 'io', kicker: '09 · KERJA LAYAK', title: 'Banyak kerja belum tentu kerja layak', vis: { t: 'io' },
      body: <><p>Dari tabel Input-Output, pertanian dan jasa lainnya menyerap paling banyak tetapi berupah rendah. <b>Industri pengolahan</b>, kesehatan, dan administrasi pemerintahan memadukan serapan besar dengan upah sekitar rata-rata atau lebih.</p><p>Tekan titik untuk menyorot sektor.</p></> },
    { id: 'suara', kicker: '10 · SUARA PUBLIK', title: 'Apa yang dikeluhkan pencari kerja', vis: { t: 'voice' },
      body: <><p>Dari <b>{n0(sent.n_dianalisis ?? 0)}</b> komentar YouTube yang relevan, sekitar <b>dua dari tiga</b> bernada negatif. Yang paling sering disebut: <b>kualitas pekerjaan</b> (gaji, UMR, kontrak), disusul ketat kelangkaan lowongan dan ketidakcocokan ijazah.</p><p>Ketuk kata di wordcloud untuk melihat nadanya.</p><p>Akses informasi dan keadilan (orang dalam, calo) jarang disebut, tetapi paling memancing marah.</p>{sent.data_demo && <p className="demo-note">Angka pada panel ini <b>ilustrasi</b>.</p>}</> },
    { id: 'aksi', kicker: '11 · DARI INSIGHT KE AKSI', title: 'Sekarang giliran Anda', vis: { t: 'map', layer: 'lisa', stat: { k: '514 alamat', v: `${L.HH_p05} HH · ${L.LL_p05} LL`, s: 'klaster signifikan p<0,05' } },
      body: <><p>Pilih peran, dan Kompas akan memberi rekomendasi yang disesuaikan, lengkap dengan alasan datanya.</p><div className="cta-row"><button className="btn" onClick={() => go('kompas', { r: 'pemda' })}>Saya pemda</button><button className="btn" onClick={() => go('kompas', { r: 'pencari' })}>Saya pencari kerja</button><button className="btn" onClick={() => go('kompas', { r: 'pelatihan' })}>Saya penyelenggara pelatihan</button></div></> },
  ];

  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.k)); });
    }, { rootMargin: '-40% 0px -45% 0px', threshold: 0 });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const st = steps[active]; const v = st.vis;
  const mapLayer: LayerKey = v.t === 'map' ? v.layer : 'lisa';
  const mapHL = v.t === 'map' && v.hl === 'HH' ? hhSet : null;
  const mapFocus = v.t === 'map' && v.focus === 'hh' ? boxOf(hhIds, geo) : null;
  const labels = v.t === 'map' && v.labels === 'top5' ? top5.map((r) => r.id) : undefined;
  const heroRef = useRef<HTMLDivElement>(null); const mob = useMobile(); const ch = mob ? 200 : 300;
  const pickRegion = (r: Region) => go('peta', { w: String(r.id) });
  const hh = prof.lisa.HH, ll = prof.lisa.LL;

  return (
    <div className="home">
      <section className="hero" ref={heroRef}>
        <div className="hero-glow" aria-hidden><i /><i /><i /></div>
        <div className="hero-in">
          <div className="hero-txt">
            <div className="eyebrow light">ACTION 2026 · TURNING INSIGHT INTO OPPORTUNITY</div>
            <h1>Nganggur juga<br /><em>punya alamat.</em></h1>
            <p className="hero-lead">Peta 514 kabupaten/kota yang menunjukkan di mana pengangguran mengelompok, mengapa, dan apa yang bisa dilakukan, bagi pemerintah daerah, pencari kerja, dan penyelenggara pelatihan.</p>
            <div className="hero-search"><RegionSearch onPick={pickRegion} placeholder="Cari alamat kabupaten/kota Anda…" /></div>
            <div className="hero-nums">
              <div><b><CountUp to={latest.v} dec={2} suffix="%" /></b><span>TPT nasional {latest.p}</span></div>
              <div><b><CountUp to={nat.penganggur_feb2026_juta} dec={2} /> jt</b><span>penganggur</span></div>
              <div><b><CountUp to={Number(L.HH_pct_penduduk)} dec={1} suffix="%" /></b><span>penduduk di klaster tinggi</span></div>
            </div>
            <div className="hero-cta"><button className="btn gold" onClick={() => go('peta')}>Jelajahi peta</button><a className="btn ghost light" href="#giliran" onClick={(e) => { e.preventDefault(); document.getElementById('giliran')?.scrollIntoView({ behavior: 'smooth' }); }}>Tebak TPT daerahmu</a><a className="btn ghost light" href="#alur" onClick={(e) => { e.preventDefault(); document.getElementById('alur')?.scrollIntoView({ behavior: 'smooth' }); }}>Ikuti ceritanya ↓</a></div>
          </div>
          <div className="hero-map"><MapView layer="lisa" interactive={false} showLegend={false} showControls={false} ariaLabel="Peta klaster LISA pengangguran kabupaten/kota" /></div>
        </div>
      </section>

      <section id="alur" className="scrolly">
        <div className="vis-col">
          <div className="vis" aria-live="polite">
            <div className={'vis-pane map-pane' + (['map'].includes(v.t) ? ' on' : '')}>
              <MapView layer={mapLayer} highlight={mapHL} focus={mapFocus} labelIds={labels} interactive={false} showControls={false} />
              {v.t === 'map' && v.stat && <div className="mapstat" key={st.id}><span>{v.stat.k}</span><b>{v.stat.v}</b>{v.stat.s && <em>{v.stat.s}</em>}</div>}
            </div>
            <div className={'vis-pane chart-pane' + (v.t !== 'map' ? ' on' : '')}>
              {v.t === 'profil' && <div className="vcard"><h4>Klaster tinggi (HH) vs rendah (LL)</h4><div className="two"><div><div className="vlab" style={{ color: C.red }}>HH · {hh.n} wilayah</div><Bullets color={C.red} c1="klaster rendah" rows={[
                { label: 'Lama sekolah (th)', value: hh.rls, ref1: ll.rls, max: 12, fmt: n1 }, { label: 'PDRB/kapita (jt)', value: hh.pdrb, ref1: ll.pdrb, max: 80, fmt: n1 },
                { label: 'Miskin (%)', value: hh.p0, ref1: ll.p0, max: 16, fmt: n1 }, { label: 'Kepadatan (jiwa/km²)', value: Math.min(hh.dens, 1600), ref1: Math.min(ll.dens, 1600), max: 1600, fmt: () => n0(hh.dens) }]} /></div></div>
                <p className="note">Penanda hitam = median klaster rendah (LL, {ll.n} wilayah): sekolah {n1(ll.rls)} th, PDRB {n1(ll.pdrb)} jt, miskin {n1(ll.p0)}%, kepadatan {n0(ll.dens)}/km².</p></div>}
              {v.t === 'age' && <div className="vcard"><h4>TPT menurut kelompok umur, 2025 (%)</h4><AgeBars kelompok={nat.umur.kelompok} tahun={nat.umur.tahun} h={mob ? 230 : 300} /></div>}
              {v.t === 'trend' && <div className="vcard"><h4>TPT nasional 1996–2026 (%)</h4><TrendChart seri={nat.tpt_seri} latest={nat.tpt_terbaru} h={ch} /><p className="note">Titik emas = Feb 2025 sampai Mei 2026. Seri 1986–1994 memakai definisi lama (TPT ≈ 2,6%) sehingga tidak ditampilkan.</p></div>}
              {v.t === 'fan' && <div className="vcard"><h4>Proyeksi TPT nasional sampai 2028 (%)</h4><FanChart seri={nat.tpt_seri} fc={nat.forecast} h={ch} /><p className="note">Pita gelap = interval 80%, pita terang = 95%. Titik emas = realisasi 2025–2026.</p></div>}
              {v.t === 'io' && <div className="vcard"><h4>Serapan kerja vs upah per sektor</h4><IOQuadrant sek={nat.io.sektor} h={mob ? 250 : 340} /></div>}
              {v.t === 'voice' && <div className="vcard"><h4>Kata yang paling sering muncul di komentar</h4>{sent.wordcloud ? <WordCloud wc={sent.wordcloud} /> : <ThemeBars demo={sent.data_demo} rows={Object.entries(sent.tema).map(([name, t]) => ({ name, v: t['% komentar'], lo: t['CI95 bawah'], hi: t['CI95 atas'], w: t['% berbobot-like'] })).sort((a, b) => b.v - a.v)} />}</div>}
            </div>
            <div className="vis-step" aria-hidden><span>{String(active + 1).padStart(2, '0')}</span>/{steps.length}</div>
          </div>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <article key={s.id} data-k={i} ref={(el) => (refs.current[i] = el)} className={'step' + (i === active ? ' on' : '')}>
              <div className="step-in"><div className="kicker">{s.kicker}</div><h2>{s.title}</h2><div className="step-body">{s.body}</div></div>
            </article>
          ))}
        </div>
      </section>
      <PlayZone />
    </div>
  );
}
