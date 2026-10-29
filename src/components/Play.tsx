import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { RegionSearch, Pill } from './ui';
import { C, LISA_COLOR, LISA_LABEL } from '../lib/colors';
import { approx, n0, n1, shortName } from '../lib/format';
import type { Region } from '../lib/types';

const NAT_2024 = 4.91; // TPT nasional Agustus 2024, periode yang sama dengan data kab/kota
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* abaikan */ } } };

/* ---------------------------------------------------------------- tebak TPT */
function Tebak() {
  const { data, go } = useApp();
  const pool = useMemo(() => data.regions.filter((r) => !r.art), [data.regions]);
  const sorted = useMemo(() => pool.map((r) => r.tpt).sort((a, b) => a - b), [pool]);
  const rand = () => pool[Math.floor(Math.random() * pool.length)];
  const [r, setR] = useState<Region>(() => rand());
  const [g, setG] = useState(5);
  const [done, setDone] = useState(false);
  const [hist, setHist] = useState<number[]>([]);
  const next = (x?: Region) => { setR(x ?? rand()); setDone(false); setG(5); };
  const diff = r.tpt - g; const pts = Math.max(0, Math.round(100 - Math.abs(diff) * 30));
  const rank = Math.round((sorted.filter((v) => v < r.tpt).length / sorted.length) * 100);
  const X = (v: number) => `${Math.min(100, (v / 12) * 100)}%`;
  const submit = () => { setDone(true); setHist((h) => [...h, pts].slice(-5)); };
  const verdict = Math.abs(diff) < 0.5 ? 'Hampir tepat!' : Math.abs(diff) < 1.5 ? 'Cukup dekat.' : diff > 0 ? 'Lebih tinggi dari tebakanmu.' : 'Lebih rendah dari tebakanmu.';
  return (
    <div className="play-body tebak">
      <div className="tb-q">
        <span className="tb-k">Berapa TPT di</span>
        <h3>{shortName(r.n)}</h3>
        <span className="tb-pv">{r.pv} · {n0(r.pop / 1000)} ribu jiwa</span>
        <div className="tb-pick"><RegionSearch onPick={(x) => next(x)} placeholder="atau pilih daerahmu…" /><button className="btn sm ghost" onClick={() => next()}>Acak lagi</button></div>
      </div>
      <div className="tb-scale">
        <div className="tb-track">
          <i className="tb-nat" style={{ left: X(NAT_2024) }}>{!(done && Math.abs(r.tpt - NAT_2024) < 1.4) && <span>nasional {n1(NAT_2024)}%</span>}</i>
          <i className="tb-g" style={{ left: X(g) }}><span>{done ? 'tebakanmu' : n1(g) + '%'}</span></i>
          {done && <i className="tb-a" style={{ left: X(r.tpt) }}><span>asli {n1(r.tpt)}%</span></i>}
          <input type="range" min={0} max={12} step={0.1} value={g} disabled={done} onChange={(e) => setG(Number(e.target.value))} aria-label="Tebakan TPT (%)" />
        </div>
        <div className="tb-ax"><span>0%</span><span>3</span><span>6</span><span>9</span><span>12%</span></div>
      </div>
      {!done ? (
        <div className="tb-act"><span className="tb-hint">Geser penanda di pita warna</span><b className="tb-gv">{n1(g)}%</b><button className="btn gold" onClick={submit}>Kunci tebakan</button></div>
      ) : (
        <div className="tb-res">
          <div className="tb-score"><b>{pts}</b><span>poin</span></div>
          <div>
            <p><b>{verdict}</b> TPT {shortName(r.n)} pada Agustus 2024 adalah <b>{n1(r.tpt)}%</b>, lebih tinggi dari {rank}% kabupaten/kota lain. Kira-kira <b>{approx(r.est)}</b> orang menganggur.</p>
            <p className="tb-tags"><Pill color={LISA_COLOR[r.lisa]}>{LISA_LABEL[r.lisa]}</Pill><Pill soft>{r.tip}</Pill></p>
            <div className="tb-btns"><button className="btn sm" onClick={() => next()}>Daerah berikutnya</button><button className="btn sm ghost" onClick={() => go('peta', { w: String(r.id) })}>Lihat di peta</button></div>
          </div>
        </div>
      )}
      {hist.length > 0 && <div className="tb-hist" aria-label="Skor terakhir">Skor terakhir: {hist.map((h, i) => <span key={i} style={{ background: h >= 70 ? C.teal : h >= 40 ? C.amber : C.red }}>{h}</span>)} <em>rata-rata {n0(hist.reduce((a, b) => a + b, 0) / hist.length)}</em></div>}
    </div>
  );
}

/* ---------------------------------------------------------------- jajak pendapat hambatan */
const OPSI: Record<string, { l: string; d: string }> = {
  T1: { l: 'Lowongan sedikit, pelamar banyak', d: 'kelangkaan & persaingan' },
  T2: { l: 'Ijazah atau keahlian tidak cocok', d: 'ketidaksesuaian keahlian' },
  T3: { l: 'Info sulit, seleksi tidak adil', d: 'akses informasi & keadilan' },
  T4: { l: 'Kerja ada, tapi upah dan kontrak buruk', d: 'kualitas pekerjaan' },
};
function Hambatan() {
  const { data, go } = useApp();
  const [pick, setPick] = useState<string | null>(() => store.get('kpk-hambatan'));
  const rows = Object.entries(data.sent.tema).map(([k, t]) => ({ code: k.match(/^T\d/)?.[0] ?? k, v: t['% komentar'], lo: t['CI95 bawah'], hi: t['CI95 atas'] })).sort((a, b) => b.v - a.v);
  const choose = (c: string) => { setPick(c); store.set('kpk-hambatan', c); };
  const rk = pick ? rows.findIndex((r) => r.code === pick) + 1 : 0;
  return (
    <div className="play-body poll">
      <p className="lead small">Menurutmu, apa hambatan terbesar mencari kerja di Indonesia? Pilih satu, lalu bandingkan dengan {n0(data.sent.n_dianalisis ?? 0)} komentar warganet.</p>
      <div className="poll-opts">
        {Object.entries(OPSI).map(([c, o]) => {
          const r = rows.find((x) => x.code === c);
          return (
            <button key={c} className={'popt' + (pick === c ? ' on' : '') + (pick ? ' shown' : '')} onClick={() => choose(c)} aria-pressed={pick === c}>
              <span className="popt-l">{o.l}</span>
              {pick && r && <><i className="popt-f" style={{ width: `${(r.v / 40) * 100}%` }} /><b>{n1(r.v)}%</b></>}
            </button>
          );
        })}
      </div>
      {pick && (
        <div className="poll-res">
          <p>Pilihanmu ({OPSI[pick].d}) ada di urutan <b>{rk}</b> menurut warganet. {rk <= 3 ? 'Tiga tema teratas selisihnya tipis dan interval kepercayaannya saling bertumpuk, jadi ketiganya sama-sama besar.' : 'Tema ini jarang disebut, tetapi komentarnya paling sering bernada marah.'}</p>
          <div className="tb-btns"><button className="btn sm" onClick={() => go('suara')}>Lihat suara warganet</button><button className="btn sm ghost" onClick={() => setPick(null)}>Ulangi</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- adu dua alamat */
type Row = { k: string; f: (r: Region) => number | null; fmt: (v: number) => string; hint?: string };
const ROWS: Row[] = [
  { k: 'TPT (%)', f: (r) => r.tpt, fmt: n1, hint: 'Agu 2024' },
  { k: 'Perkiraan penganggur', f: (r) => r.est, fmt: (v) => approx(v).replace('± ', '±') },
  { k: 'Indeks kewaspadaan', f: (r) => r.skor, fmt: n0, hint: '0–100' },
  { k: 'Lama sekolah (th)', f: (r) => r.rls, fmt: n1 },
  { k: 'PDRB/kapita (jt)', f: (r) => r.pdrb, fmt: n1 },
  { k: 'Penduduk miskin (%)', f: (r) => r.p0, fmt: n1 },
  { k: 'Kepadatan (/km²)', f: (r) => r.dens, fmt: n0 },
];
function Adu() {
  const { data, go } = useApp();
  const init = useMemo(() => {
    const big = (cls: string) => [...data.regions].filter((r) => r.lisa === cls).sort((a, b) => b.pop - a.pop)[0];
    return [big('HH') ?? data.regions[0], big('LL') ?? data.regions[1]] as const;
  }, [data.regions]);
  const [a, setA] = useState<Region>(init[0]); const [b, setB] = useState<Region>(init[1]);
  const Head = ({ r, set, side }: { r: Region; set: (x: Region) => void; side: 'a' | 'b' }) => (
    <div className={'adu-h ' + side} style={{ ['--zc' as string]: LISA_COLOR[r.lisa] }}>
      <b>{shortName(r.n)}</b><span>{r.pv} · {LISA_LABEL[r.lisa]}</span>
      <RegionSearch onPick={set} placeholder="Ganti daerah…" />
      <button className="link" onClick={() => go('peta', { w: String(r.id) })}>buka kartu alamat</button>
    </div>
  );
  return (
    <div className="play-body adu">
      <div className="adu-top">
        <Head r={a} set={setA} side="a" />
        <button className="adu-swap" onClick={() => { setA(b); setB(a); }} aria-label="Tukar posisi">⇄</button>
        <Head r={b} set={setB} side="b" />
      </div>
      <div className="adu-rows">
        {ROWS.map((row) => {
          const va = row.f(a), vb = row.f(b);
          const mx = Math.max(va ?? 0, vb ?? 0) || 1;
          return (
            <div key={row.k} className="adu-r">
              <div className="adu-bar a"><b>{va == null ? '–' : row.fmt(va)}</b><i style={{ width: `${((va ?? 0) / mx) * 100}%` }} className={va != null && vb != null && va > vb ? 'hi' : ''} /></div>
              <div className="adu-k">{row.k}{row.hint && <em>{row.hint}</em>}</div>
              <div className="adu-bar b"><i style={{ width: `${((vb ?? 0) / mx) * 100}%` }} className={va != null && vb != null && vb > va ? 'hi' : ''} /><b>{vb == null ? '–' : row.fmt(vb)}</b></div>
            </div>
          );
        })}
      </div>
      <p className="note center">Batang yang lebih gelap = nilai lebih besar. Perkiraan penganggur = penduduk × 0,54 × TPT (proksi kasar). Indeks kewaspadaan adalah rancangan tim, bukan klasifikasi BPS.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- bagian utama */
type Tab = 'tebak' | 'hambatan' | 'adu';
export function PlayZone() {
  const [t, setT] = useState<Tab>('tebak');
  const tabs: { v: Tab; l: string; s: string; ic: string }[] = [
    { v: 'tebak', l: 'Tebak TPT', s: 'Seberapa kenal kamu daerahmu?', ic: '🎯' },
    { v: 'hambatan', l: 'Suaramu', s: 'Bandingkan pendapatmu dengan warganet', ic: '🗳️' },
    { v: 'adu', l: 'Adu dua alamat', s: 'Bandingkan dua kab/kota berdampingan', ic: '⚖️' },
  ];
  return (
    <section className="play" id="giliran">
      <div className="play-in">
        <div className="play-head">
          <div className="eyebrow light">GILIRANMU</div>
          <h2>Jangan cuma membaca. <em>Coba sendiri.</em></h2>
        </div>
        <div className="play-tabs" role="tablist">
          {tabs.map((x) => <button key={x.v} role="tab" aria-selected={t === x.v} className={t === x.v ? 'on' : ''} onClick={() => setT(x.v)}><span className="pt-ic" aria-hidden>{x.ic}</span><b>{x.l}</b><small>{x.s}</small></button>)}
        </div>
        <div className="play-card" role="tabpanel" key={t}>
          {t === 'tebak' && <Tebak />}
          {t === 'hambatan' && <Hambatan />}
          {t === 'adu' && <Adu />}
        </div>
      </div>
    </section>
  );
}
