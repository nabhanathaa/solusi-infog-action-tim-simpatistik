import { useMemo, useState } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { Frame } from './Charts';
import { Seg } from './ui';
import { C } from '../lib/colors';
import { n0, n1 } from '../lib/format';
import type { Sentimen, WordItem } from '../lib/types';

export const SENT_COL = { negatif: C.red, netral: '#9aa3a8', positif: C.teal } as const;
type SK = keyof typeof SENT_COL;
const SK_LIST: SK[] = ['negatif', 'netral', 'positif'];

/** warna kata menurut kecondongan log-odds (z > 0 = condong negatif, z < 0 = condong positif) */
export function wordColor(z: number) {
  if (z >= 4) return C.maroon;
  if (z >= 1.5) return C.red;
  if (z > -1.5) return '#3d5268';
  if (z > -4) return C.teal;
  return '#1f4a33';
}

/* ---------------------------------------------------------------- wordcloud interaktif */
export function WordCloud({ wc }: { wc: NonNullable<Sentimen['wordcloud']> }) {
  const [f, setF] = useState<'all' | 'neg' | 'pos'>('all');
  const [sel, setSel] = useState<WordItem | null>(null);
  const [hov, setHov] = useState<WordItem | null>(null);
  const [q, setQ] = useState('');
  const qm = q.trim().toLowerCase();
  const pass = (k: WordItem) => (f === 'all' || (f === 'neg' ? k.z >= 1.5 : k.z <= -1.5)) && (!qm || k.w.includes(qm));
  const hits = wc.kata.filter(pass);
  const act = hov ?? sel ?? (qm && hits.length ? hits[0] : null);
  const maxN = wc.kata[0]?.n ?? 1;
  return (
    <div className="wcwrap">
      <div className="wcbar">
        <Seg<'all' | 'neg' | 'pos'> label="Saring kata" value={f} onChange={(v) => { setF(v); setSel(null); }} options={[{ v: 'all', l: 'Semua' }, { v: 'neg', l: 'Condong negatif' }, { v: 'pos', l: 'Condong positif' }]} />
        <label className="wcq"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><input value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} placeholder="Cari kata, mis. gaji" aria-label="Cari kata di wordcloud" /></label>
      </div>
      <div className="wcstage">
        <svg viewBox={`0 0 ${wc.w} ${wc.h}`} className="wc" role="img" aria-label="Wordcloud kata yang paling sering muncul di komentar">
          {wc.kata.map((k, i) => {
            const on = pass(k);
            return (
              <text key={k.w} transform={`translate(${k.bx},${k.by})${k.v ? ' rotate(-90)' : ''}`} fontSize={k.fs} fill={wordColor(k.z)}
                className={'wcw' + (on ? '' : ' off') + (act?.w === k.w ? ' act' : '')} style={{ animationDelay: `${Math.min(i * 14, 900)}ms` }}
                tabIndex={on ? 0 : -1} role="button" aria-label={`${k.w}: ${n0(k.n)} komentar, ${n1(k.neg)}% negatif`}
                onPointerEnter={() => setHov(k)} onPointerLeave={() => setHov(null)} onClick={() => setSel(sel?.w === k.w ? null : k)}
                onFocus={() => setHov(k)} onBlur={() => setHov(null)}>{k.w}</text>
            );
          })}
        </svg>
        {qm && hits.length === 0 && <div className="wcnone">Kata "{q}" tidak ada di 110 kata teratas.</div>}
      </div>
      <div className={'wcinfo' + (act ? ' on' : '')} aria-live="polite">
        {act ? (
          <>
            <div className="wci-h"><b style={{ color: wordColor(act.z) }}>{act.w}</b><span>muncul di <b>{n0(act.n)}</b> komentar · peringkat {wc.kata.indexOf(act) + 1} dari {wc.kata.length}</span></div>
            <div className="wci-bar" aria-hidden><i style={{ width: `${act.neg}%`, background: C.red }} /><i style={{ width: `${Math.max(0, 100 - act.neg - act.pos)}%`, background: SENT_COL.netral }} /><i style={{ width: `${act.pos}%`, background: C.teal }} /></div>
            <div className="wci-k"><span><i style={{ background: C.red }} />negatif {n1(act.neg)}%</span><span><i style={{ background: SENT_COL.netral }} />netral {n1(Math.max(0, 100 - act.neg - act.pos))}%</span><span><i style={{ background: C.teal }} />positif {n1(act.pos)}%</span><span className="wci-z">{act.z >= 1.5 ? 'relatif condong negatif' : act.z <= -1.5 ? 'relatif condong positif' : 'tidak condong'} (skor {n1(Math.abs(act.z))})</span></div>
            <div className="wci-sz"><i style={{ width: `${(act.n / maxN) * 100}%` }} /></div>
          </>
        ) : <p>Arahkan kursor atau ketuk sebuah kata untuk melihat berapa komentar yang memuatnya dan nadanya.</p>}
      </div>
      <div className="wckey"><span><i style={{ background: C.maroon }} />sangat negatif</span><span><i style={{ background: C.red }} />condong negatif</span><span><i style={{ background: '#3d5268' }} />tidak condong</span><span><i style={{ background: C.teal }} />condong positif</span></div>
    </div>
  );
}

/* ---------------------------------------------------------------- donat sentimen */
type Mode = 'model' | 'koreksi' | 'manual';
export function SentDonut({ sent }: { sent: Sentimen }) {
  const [mode, setMode] = useState<Mode>('model');
  const [hov, setHov] = useState<SK | null>(null);
  const se = sent.sentimen; const nn = sent.sentimen_n; const emas = sent.sentimen_emas_300;
  if (!se) return null;
  const val = (k: SK) => (mode === 'model' ? se[k].mentah : mode === 'koreksi' ? se[k].koreksi : emas?.[k] ?? 0);
  const tot = SK_LIST.reduce((a, k) => a + val(k), 0) || 1;
  const R = 70, CIRC = 2 * Math.PI * R;
  let acc = 0;
  const segs = SK_LIST.map((k) => { const p = val(k) / tot; const s = { k, p, off: acc }; acc += p; return s; });
  const focus = hov ?? 'negatif';
  const nTot = nn ? nn.negatif + nn.netral + nn.positif : 0;
  return (
    <div className="donut">
      <Seg<Mode> label="Sumber angka" value={mode} onChange={setMode} options={[{ v: 'model', l: 'Model' }, { v: 'koreksi', l: 'Terkoreksi' }, { v: 'manual', l: 'Label manual' }]} />
      <div className="donut-in">
        <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label={SK_LIST.map((k) => `${k} ${n1(val(k))}%`).join(', ')}>
          <circle cx="90" cy="90" r={R} fill="none" stroke={C.line} strokeWidth="26" />
          {segs.map((s) => (
            <circle key={s.k} cx="90" cy="90" r={R} fill="none" stroke={SENT_COL[s.k]} strokeWidth={hov === s.k ? 32 : 26}
              strokeDasharray={`${Math.max(0, s.p * CIRC - 2)} ${CIRC}`} strokeDashoffset={-s.off * CIRC} transform="rotate(-90 90 90)"
              className="dseg" onPointerEnter={() => setHov(s.k)} onPointerLeave={() => setHov(null)} />
          ))}
          <text x="90" y="86" textAnchor="middle" fontSize="34" fontWeight="800" fill={SENT_COL[focus]} fontFamily="Poppins, sans-serif">{n1(val(focus))}%</text>
          <text x="90" y="108" textAnchor="middle" fontSize="12" fill={C.mute} fontWeight="700">{focus}</text>
        </svg>
        <div className="dcards">
          {SK_LIST.map((k) => (
            <button key={k} className={'dcard' + (hov === k ? ' on' : '')} style={{ ['--dc' as string]: SENT_COL[k] }} onPointerEnter={() => setHov(k)} onPointerLeave={() => setHov(null)} onFocus={() => setHov(k)} onBlur={() => setHov(null)}>
              <span>{k}</span><b>{n1(val(k))}%</b>
              <em>{mode === 'model' && nn ? `${n0(nn[k])} komentar` : mode === 'koreksi' ? `CI 95% ${n1(se[k].lo)}–${n1(se[k].hi)}%` : 'dari 300 komentar'}</em>
            </button>
          ))}
        </div>
      </div>
      <p className="note">
        {mode === 'model' && <>Label IndoRoBERTa untuk {n0(nTot)} komentar. Model cenderung membaca sindiran sebagai positif, jadi angka positif ini terlalu tinggi.</>}
        {mode === 'koreksi' && <>Proporsi setelah dikoreksi dengan matriks kesalahan dari 300 label manual (adjusted classify-and-count). Intervalnya lebar, maka kami menulis "sekitar dua pertiga negatif".</>}
        {mode === 'manual' && <>Label manual satu penilai pada 300 komentar acak. Dipakai untuk menguji dan mengoreksi model.</>}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- tren bulanan */
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export function MonthTrend({ rows, h = 250 }: { rows: NonNullable<Sentimen['tren_bulanan']>; h?: number }) {
  const [hov, setHov] = useState<number | null>(null);
  const maxN = useMemo(() => Math.max(...rows.map((r) => r.n)), [rows]);
  const lab = (b: string) => { const [y, m] = b.split('-'); return `${BLN[Number(m) - 1]} ${y}`; };
  const hv = hov != null ? rows[hov] : null;
  return (
    <div className="mtrend">
      <Frame h={h} label="Komposisi sentimen komentar per bulan">
        {(w, hh) => {
          const m = { l: 30, r: 8, t: 8, b: 56 };
          const x = scaleBand<number>().domain(rows.map((_, i) => i)).range([m.l, w - m.r]).padding(0.18);
          const top = hh - m.b; const y = scaleLinear().domain([0, 100]).range([top, m.t]);
          const vy = scaleLinear().domain([0, maxN]).range([0, 26]);
          return (
            <g onPointerLeave={() => setHov(null)}>
              {[0, 50, 100].map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={C.line} /><text x={m.l - 5} y={y(t) + 4} fontSize={10} textAnchor="end" fill={C.mute}>{t}%</text></g>)}
              {rows.map((r, i) => {
                const bw = x.bandwidth(); const x0 = x(i)!; const low = r.n < 150;
                const sum = r.neg + r.net + r.pos || 1; const hn = (r.neg / sum) * 100, ht = (r.net / sum) * 100;
                return (
                  <g key={r.b} opacity={hov == null || hov === i ? (low ? 0.45 : 1) : 0.35} onPointerEnter={() => setHov(i)} onPointerDown={() => setHov(i)}>
                    <rect x={x0} y={y(100)} width={bw} height={y(100 - hn) - y(100)} fill={C.red} rx={2} />
                    <rect x={x0} y={y(100 - hn)} width={bw} height={y(100 - hn - ht) - y(100 - hn)} fill={SENT_COL.netral} />
                    <rect x={x0} y={y(100 - hn - ht)} width={bw} height={top - y(100 - hn - ht)} fill={C.teal} rx={2} />
                    <rect x={x0} y={hh - 18 - vy(r.n)} width={bw} height={vy(r.n)} fill={C.ink} fillOpacity={0.35} rx={1.5} />
                    {(i % 3 === 0 || i === rows.length - 1) && <text x={x0 + bw / 2} y={hh - 4} fontSize={9.5} textAnchor="middle" fill={C.mute}>{lab(r.b).replace(' 20', " '")}</text>}
                    <rect x={x0 - 2} y={m.t} width={bw + 4} height={hh - m.t} fill="transparent" />
                  </g>
                );
              })}
              <text x={m.l} y={top + 14} fontSize={9.5} fill={C.mute}>jumlah komentar</text>
            </g>
          );
        }}
      </Frame>
      <div className="mt-info" aria-live="polite">
        {hv ? <><b>{lab(hv.b)}</b><span>{n0(hv.n)} komentar</span><span style={{ color: C.red }}>negatif {n1(hv.neg)}%</span><span>netral {n1(hv.net)}%</span><span style={{ color: C.teal }}>positif {n1(hv.pos)}%</span>{hv.n < 150 && <em>sampel kecil, baca hati-hati</em>}</>
          : <span>Arahkan ke batang untuk detail bulan. Nada negatif dominan hampir di setiap bulan; batang pucat = kurang dari 150 komentar.</span>}
      </div>
    </div>
  );
}
