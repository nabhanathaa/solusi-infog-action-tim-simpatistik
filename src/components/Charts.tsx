import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { scaleLinear, scaleBand, scaleLog } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';
import { C, LISA_COLOR } from '../lib/colors';
import { n1, n2, pct, shortName } from '../lib/format';
import type { ForecastRow, IOSektor, Region } from '../lib/types';

export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null); const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth)));
    ro.observe(el); setW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
export function Frame({ h, children, label }: { h: number | ((w: number) => number); children: (w: number, h: number) => ReactNode; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const hh = typeof h === 'function' ? h(w) : h;
  return <div ref={ref} className="chart">{w > 0 && <svg width={w} height={hh} role="img" aria-label={label}>{children(w, hh)}</svg>}</div>;
}
const T = (p: React.SVGProps<SVGTextElement>) => <text fontFamily="inherit" {...p} />;

/* ---------------------------------------------------------------- TPT nasional 1986–2024 */
export function TrendChart({ seri, latest, h = 260 }: { seri: { y: number; v: number }[]; latest: { p: string; v: number }[]; h?: number }) {
  const [hov, setHov] = useState<number | null>(null);
  return (
    <Frame h={h} label="Tingkat pengangguran terbuka nasional 1996 sampai 2026">
      {(w, hh) => {
        const m = { l: 34, r: 14, t: 14, b: 26 };
        const x = scaleLinear().domain([1996, 2026]).range([m.l, w - m.r]);
        const y = scaleLinear().domain([0, 12]).range([hh - m.b, m.t]);
        const segs: { y: number; v: number }[][] = [[]];
        seri = seri.filter((d) => d.y >= 1996);
        seri.forEach((d, i) => { if (i > 0 && d.y - seri[i - 1].y > 1) segs.push([]); segs[segs.length - 1].push(d); });
        const ln = line<{ y: number; v: number }>().x((d) => x(d.y)).y((d) => y(d.v)).curve(curveMonotoneX);
        const events: [number, string, number][] = [[1998, 'Krisis 1998', 0], [2005, 'Puncak 2005', 0], [2020, 'Pandemi', 0]];
                return (
          <g onPointerMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); const yr = Math.round(x.invert(e.clientX - r.left)); setHov(yr); }} onPointerLeave={() => setHov(null)}>
            <rect x={0} y={0} width={w} height={hh} fill="transparent" />
            {[0, 3, 6, 9, 12].map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={C.line} strokeDasharray={t ? '2 4' : ''} /><T x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={C.mute}>{t}</T></g>)}
            {[2000, 2005, 2010, 2015, 2020, 2025].map((t) => <T key={t} x={x(t)} y={hh - 8} textAnchor="middle" fontSize={10} fill={C.mute}>{t}</T>)}
            {segs.map((s, i) => <path key={i} d={ln(s) ?? ''} fill="none" stroke={C.blue} strokeWidth={2.4} strokeLinecap="round" />)}
            {events.map(([yr, lab, v]) => {
              const d = seri.find((q) => q.y === yr); if (!d) return null;
              return <g key={yr}><circle cx={x(yr)} cy={y(d.v)} r={3.5} fill={C.red} /><T x={x(yr) + (yr > 2010 ? -6 : 6)} y={y(d.v) - 8} fontSize={10} fontWeight={600} fill={C.ink} textAnchor={yr > 2010 ? 'end' : 'start'}>{lab}</T></g>;
            })}
            {(() => {
              const rec = latest.slice(1).map((d) => { const [b, t] = d.p.split(' '); return { x: Number(t) + (b === 'Agu' ? 0.5 : b === 'Mei' ? 0.25 : 0), v: d.v }; });
              const pl = [{ x: 2024, v: seri.find((q) => q.y === 2024)?.v ?? 4.91 }, ...rec];
              return <g>
                <path d={pl.map((q, i) => (i ? 'L' : 'M') + x(q.x) + ',' + y(q.v)).join('')} fill="none" stroke={C.amber} strokeWidth={2.2} strokeDasharray="3 3" />
                {rec.map((q, i) => <circle key={i} cx={x(q.x)} cy={y(q.v)} r={3.6} fill={C.gold} stroke={C.ink} />)}
                <T x={w - m.r} y={y(rec[rec.length - 1].v) + 24} textAnchor="end" fontSize={11} fontWeight={700} fill={C.ink}>{n2(latest[latest.length - 1].v)}% · {latest[latest.length - 1].p}</T>
              </g>;
            })()}
            {hov != null && hov >= 1996 && hov <= 2024 && (() => { const d = seri.find((q) => q.y === hov); if (!d) return null; const tx = x(d.y); const right = tx < w / 2; return <g pointerEvents="none"><line x1={tx} x2={tx} y1={m.t} y2={hh - m.b} stroke={C.ink} strokeOpacity={0.4} /><circle cx={tx} cy={y(d.v)} r={4.5} fill={C.ink} /><rect x={right ? tx + 8 : tx - 78} y={m.t + 2} width={70} height={34} rx={6} fill={C.ink} /><T x={right ? tx + 14 : tx - 72} y={m.t + 17} fontSize={10} fill="#fff" fillOpacity={0.75}>{d.y}</T><T x={right ? tx + 14 : tx - 72} y={m.t + 31} fontSize={12} fontWeight={700} fill="#fff">{n2(d.v)}%</T></g>; })()}
          </g>
        );
      }}
    </Frame>
  );
}

/* ---------------------------------------------------------------- TPT menurut usia */
export function AgeBars({ kelompok, tahun, year = 2025, ref0 = 4.85, h = 280 }: { kelompok: Record<string, number[]>; tahun: number[]; year?: number; ref0?: number; h?: number }) {
  const yi = tahun.indexOf(year), pi = tahun.indexOf(2019);
  const keys = Object.keys(kelompok);
  return (
    <Frame h={h} label={`TPT menurut kelompok umur ${year}`}>
      {(w, hh) => {
        const m = { l: 62, r: 44, t: 8, b: 22 };
        const y = scaleBand<string>().domain(keys).range([m.t, hh - m.b]).padding(0.22);
        const x = scaleLinear().domain([0, 25]).range([m.l, w - m.r]);
        return (
          <g>
            {[0, 5, 10, 15, 20, 25].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={m.t} y2={hh - m.b} stroke={C.line} strokeDasharray="2 4" /><T x={x(t)} y={hh - 6} fontSize={10} textAnchor="middle" fill={C.mute}>{t}%</T></g>)}
            {keys.map((k) => {
              const v = kelompok[k][yi]; const v19 = kelompok[k][pi]; const hot = v >= 10;
              return <g key={k}>
                <T x={m.l - 8} y={(y(k) ?? 0) + y.bandwidth() / 2 + 4} textAnchor="end" fontSize={11} fill={C.ink}>{k}</T>
                <rect x={m.l} y={y(k)} width={Math.max(0, x(v) - m.l)} height={y.bandwidth()} rx={3} fill={hot ? C.red : C.blue} fillOpacity={hot ? 0.95 : 0.75} />
                <T x={x(v) + 5} y={(y(k) ?? 0) + y.bandwidth() / 2 + 4} fontSize={11} fontWeight={700} fill={C.ink}>{n1(v)}</T>
                {v19 != null && <line x1={x(v19)} x2={x(v19)} y1={(y(k) ?? 0) - 2} y2={(y(k) ?? 0) + y.bandwidth() + 2} stroke={C.ink} strokeWidth={2} />}
              </g>;
            })}
            <line x1={x(ref0)} x2={x(ref0)} y1={m.t} y2={hh - m.b} stroke={C.amber} strokeWidth={1.8} strokeDasharray="5 3" />
            <T x={x(ref0) + 4} y={m.t + 10} fontSize={10} fontWeight={700} fill={C.amber}>nasional {n2(ref0)}%</T>
            <T x={w - m.r} y={hh - 6} fontSize={9.5} textAnchor="end" fill={C.mute} display="none">garis hitam = 2019</T>
          </g>
        );
      }}
    </Frame>
  );
}

/* ---------------------------------------------------------------- Peramalan (fan chart) */
export function FanChart({ seri, fc, shift = 0, h = 300 }: { seri: { y: number; v: number }[]; fc: ForecastRow[]; shift?: number; h?: number }) {
  const [hov, setHov] = useState<number | null>(null);
  const labels = fc.map((f) => f.periode);
  const xi = (p: string) => 2025 + labels.indexOf(p) * 0.5 + (p.startsWith('Agu') ? 0.5 : 0) - (labels.indexOf(p) * 0);
  // posisi periode: "Feb 2025" → 2025.0 ; "Agu 2025" → 2025.5
  const pos = (p: string) => { const [m, yr] = p.split(' '); return Number(yr) + (m === 'Agu' ? 0.5 : 0); };
  void xi;
  const ramp = (i: number) => (shift === 0 ? 0 : shift * Math.min(1, (i + 1) / 3));
  return (
    <Frame h={h} label="Proyeksi TPT nasional sampai Agustus 2028 dengan interval">
      {(w, hh) => {
        const m = { l: 34, r: 12, t: 14, b: 26 };
        const x = scaleLinear().domain([2012, 2028.8]).range([m.l, w - m.r]);
        const y = scaleLinear().domain([0, 9]).range([hh - m.b, m.t]);
        const hist = seri.filter((d) => d.y >= 2012);
        const ln = line<{ y: number; v: number }>().x((d) => x(d.y)).y((d) => y(d.v)).curve(curveMonotoneX);
        const pts = fc.map((f, i) => ({ t: pos(f.periode), f, s: ramp(i) }));
        const bandA = (lo: 'lo80' | 'lo95', hi: 'hi80' | 'hi95') => area<(typeof pts)[0]>().x((d) => x(d.t)).y0((d) => y(d.f[lo] + d.s)).y1((d) => y(d.f[hi] + d.s)).curve(curveMonotoneX)(pts) ?? '';
        const mid = line<(typeof pts)[0]>().x((d) => x(d.t)).y((d) => y(d.f.median + d.s)).curve(curveMonotoneX)(pts) ?? '';
        const real = pts.filter((p) => p.f.realisasi != null);
        const last = pts[pts.length - 1];
        const hv = hov != null ? pts[hov] : null;
        return (
          <g onPointerLeave={() => setHov(null)}>
            {[0, 2, 4, 6, 8].map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke={C.line} strokeDasharray={t ? '2 4' : ''} /><T x={m.l - 6} y={y(t) + 4} fontSize={10} textAnchor="end" fill={C.mute}>{t}</T></g>)}
            {[2012, 2016, 2020, 2024, 2028].map((t) => <T key={t} x={x(t)} y={hh - 8} fontSize={10} textAnchor="middle" fill={C.mute}>{t}</T>)}
            <rect x={x(2025)} y={m.t} width={w - m.r - x(2025)} height={hh - m.t - m.b} fill={C.gold} fillOpacity={0.08} />
            <path d={bandA('lo95', 'hi95')} fill={C.blue} fillOpacity={0.12} />
            <path d={bandA('lo80', 'hi80')} fill={C.blue} fillOpacity={0.22} />
            <path d={ln(hist) ?? ''} fill="none" stroke={C.ink} strokeWidth={2.2} />
            <path d={`M${x(2024)},${y(hist[hist.length - 1].v)}L${x(pts[0].t)},${y(pts[0].f.median + pts[0].s)}`} stroke={C.ink} strokeWidth={1.6} strokeDasharray="2 3" fill="none" />
            <path d={mid} fill="none" stroke={C.blue} strokeWidth={2.4} strokeDasharray="6 4" />
            {real.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.f.realisasi!)} r={4} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />)}
            <T x={x(2025.05)} y={m.t + 12} fontSize={10} fontWeight={700} fill={C.amber}>proyeksi →</T>
            <T x={last.t ? x(last.t) - 4 : 0} y={y(last.f.hi80 + last.s) - 6} textAnchor="end" fontSize={10} fill={C.mute}>{n1(last.f.hi80 + last.s)}%</T>
            <T x={x(last.t) - 4} y={y(last.f.lo80 + last.s) + 14} textAnchor="end" fontSize={10} fill={C.mute}>{n1(Math.max(0, last.f.lo80 + last.s))}%</T>
            {pts.map((p, i) => <rect key={i} x={x(p.t) - 18} y={m.t} width={36} height={hh - m.t - m.b} fill="transparent" onPointerEnter={() => setHov(i)} onPointerDown={() => setHov(i)} />)}
            {hv && <g pointerEvents="none"><line x1={x(hv.t)} x2={x(hv.t)} y1={m.t} y2={hh - m.b} stroke={C.ink} strokeOpacity={0.35} /><circle cx={x(hv.t)} cy={y(hv.f.median + hv.s)} r={4.5} fill={C.blue} stroke="#fff" strokeWidth={1.5} /></g>}
          </g>
        );
      }}
    </Frame>
  );
}

/* ---------------------------------------------------------------- Kuadran IO */
export function IOQuadrant({ sek, hi, onPick, h = 360 }: { sek: IOSektor[]; hi?: string | null; onPick?: (n: string | null) => void; h?: number }) {
  const short = (n: string) => n.replace(/ dan .*$/, '').replace(/,.*$/, '').replace(/;.*$/, '').replace(/^Penyediaan /, '').replace(/^Pengadaan /, '').replace(/^Administrasi Pemerintahan.*$/, 'Adm. pemerintahan').replace(/^Perdagangan Besar.*$/, 'Perdagangan').replace(/^Pertambangan.*$/, 'Pertambangan').replace(/^Transportasi.*$/, 'Transportasi').replace(/^Jasa Kesehatan.*$/, 'Jasa kesehatan');
  return (
    <Frame h={h} label="Kuadran sektor: pengganda kerja terhadap upah rata-rata">
      {(w, hh) => {
        const m = { l: 40, r: 14, t: 14, b: 40 };
        const x = scaleLog().domain([1.3, 20]).range([m.l, w - m.r]);
        const y = scaleLinear().domain([1.7, 5.4]).range([hh - m.b, m.t]);
        const xm = 6.78, ym = 3.29;
        const placed: { x: number; y: number }[] = []; const lab = new Map<string, number>();
        [...sek].sort((p, q) => y(p.upah_juta) - y(q.upah_juta)).forEach((d) => {
          const lx = x(d.pengganda), base = y(d.upah_juta) - 9 - d.BL * 3;
          const off = [0, -12, 12, -24, 24, -36, 36].find((o) => !placed.some((q) => Math.abs(q.x - lx) < 70 && Math.abs(q.y - (base + o)) < 11)) ?? 0;
          placed.push({ x: lx, y: base + off }); lab.set(d.nama, base + off);
        });
        const col = (s: IOSektor) => (s.kuadran.startsWith('Banyak & layak') ? C.teal : s.kuadran.startsWith('Banyak') ? C.amber : s.kuadran.startsWith('Layak') ? C.blue : C.mute);
        return (
          <g>
            <rect x={x(xm)} y={m.t} width={w - m.r - x(xm)} height={y(ym) - m.t} fill={C.teal} fillOpacity={0.09} />
            <line x1={x(xm)} x2={x(xm)} y1={m.t} y2={hh - m.b} stroke={C.ink} strokeDasharray="4 4" strokeOpacity={0.5} />
            <line x1={m.l} x2={w - m.r} y1={y(ym)} y2={y(ym)} stroke={C.ink} strokeDasharray="4 4" strokeOpacity={0.5} />
            <T x={w - m.r - 6} y={m.t + 14} textAnchor="end" fontSize={11} fontWeight={700} fill={C.teal}>banyak &amp; layak</T>
            <T x={w - m.r - 6} y={hh - m.b - 6} textAnchor="end" fontSize={11} fontWeight={700} fill={C.amber}>banyak, upah rendah</T>
            <T x={m.l + 6} y={m.t + 14} fontSize={11} fontWeight={700} fill={C.blue}>layak, sedikit</T>
            {[2, 5, 10, 20].map((t) => <T key={t} x={x(t)} y={hh - m.b + 14} textAnchor="middle" fontSize={10} fill={C.mute}>{t}</T>)}
            {[2, 3, 4, 5].map((t) => <T key={t} x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={C.mute}>{t}</T>)}
            <T x={(m.l + w - m.r) / 2} y={hh - 6} textAnchor="middle" fontSize={11} fill={C.ink}>orang per Rp1 miliar permintaan akhir (pengganda kerja, skala log)</T>
            <T transform={`translate(11 ${(hh - m.b + m.t) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={C.ink}>upah rata-rata (juta Rp/bulan)</T>
            {sek.map((s) => {
              const on = hi === s.nama;
              return <g key={s.nama} style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick?.(on ? null : s.nama)}>
                <circle cx={x(s.pengganda)} cy={y(s.upah_juta)} r={4 + s.BL * 3} fill={col(s)} fillOpacity={on ? 1 : 0.78} stroke={on ? C.ink : '#fff'} strokeWidth={on ? 2.2 : 1.2} />
                <T x={x(s.pengganda)} y={lab.get(s.nama) ?? 0} textAnchor="middle" fontSize={on ? 11 : 9.5} fontWeight={on ? 800 : 500} fill={C.ink} stroke="#fff" strokeWidth={3} paintOrder="stroke">{short(s.nama)}</T>
              </g>;
            })}
          </g>
        );
      }}
    </Frame>
  );
}

/* ---------------------------------------------------------------- Moran scatter */
export function MoranScatter({ regions, selId, h = 260, onPick }: { regions: Region[]; selId?: number | null; h?: number; onPick?: (id: number) => void }) {
  const pts = useMemo(() => regions.filter((r) => !r.art && r.lag != null), [regions]);
  return (
    <Frame h={h} label="Diagram pencar Moran: TPT daerah terhadap rata-rata TPT tetangga">
      {(w, hh) => {
        const m = { l: 34, r: 10, t: 10, b: 30 };
        const x = scaleLinear().domain([0, 11.6]).range([m.l, w - m.r]);
        const y = scaleLinear().domain([0, 11.6]).range([hh - m.b, m.t]);
        const mx = 3.87;
        const sel = pts.find((r) => r.id === selId);
        return (
          <g>
            <line x1={x(mx)} x2={x(mx)} y1={m.t} y2={hh - m.b} stroke={C.ink} strokeOpacity={0.35} strokeDasharray="4 4" />
            <line x1={m.l} x2={w - m.r} y1={y(mx)} y2={y(mx)} stroke={C.ink} strokeOpacity={0.35} strokeDasharray="4 4" />
            <T x={w - m.r - 4} y={m.t + 12} textAnchor="end" fontSize={11} fontWeight={700} fill={C.red}>HH</T>
            <T x={m.l + 4} y={hh - m.b - 6} fontSize={11} fontWeight={700} fill={C.blue}>LL</T>
            <T x={m.l + 4} y={m.t + 12} fontSize={11} fontWeight={700} fill={C.mute}>LH</T>
            <T x={w - m.r - 4} y={hh - m.b - 6} textAnchor="end" fontSize={11} fontWeight={700} fill={C.mute}>HL</T>
            {pts.map((r) => <circle key={r.id} cx={x(r.tpt)} cy={y(r.lag!)} r={r.lisa === 'ns' ? 2.4 : 3.4} fill={LISA_COLOR[r.lisa]} fillOpacity={r.lisa === 'ns' ? 0.5 : 0.9} onClick={() => onPick?.(r.id)} style={{ cursor: onPick ? 'pointer' : 'default' }} />)}
            {sel && <g pointerEvents="none"><circle cx={x(sel.tpt)} cy={y(sel.lag!)} r={8} fill="none" stroke={C.ink} strokeWidth={2.2} /><T x={x(sel.tpt)} y={y(sel.lag!) - 12} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.ink} stroke="#fff" strokeWidth={3} paintOrder="stroke">{shortName(sel.n)}</T></g>}
            {[0, 4, 8].map((t) => <T key={t} x={x(t)} y={hh - 16} fontSize={10} textAnchor="middle" fill={C.mute}>{t}</T>)}
            {[0, 4, 8].map((t) => <T key={t} x={m.l - 6} y={y(t) + 4} fontSize={10} textAnchor="end" fill={C.mute}>{t}</T>)}
            <T x={(m.l + w - m.r) / 2} y={hh - 3} fontSize={10.5} textAnchor="middle" fill={C.ink}>TPT daerah (%)</T>
            <T transform={`translate(10 ${(hh + m.t) / 2 - 12}) rotate(-90)`} fontSize={10.5} textAnchor="middle" fill={C.ink}>rata-rata tetangga</T>
          </g>
        );
      }}
    </Frame>
  );
}

/* ---------------------------------------------------------------- Perbandingan profil (bullet rows) */
export interface BulletRow { label: string; value: number; ref1?: number; ref2?: number; max: number; fmt: (v: number) => string; good?: 'low' | 'high' }
export function Bullets({ rows, c1 = 'median nasional', c2, color = C.blue }: { rows: BulletRow[]; c1?: string; c2?: string; color?: string }) {
  return (
    <div className="bullets">
      {rows.map((r) => (
        <div key={r.label} className="brow">
          <div className="bl"><span>{r.label}</span><b>{r.fmt(r.value)}</b></div>
          <div className="btrack" role="img" aria-label={`${r.label}: ${r.fmt(r.value)}`}>
            <i className="bfill" style={{ width: `${Math.min(100, (r.value / r.max) * 100)}%`, background: color }} />
            {r.ref1 != null && <i className="bmark" title={`${c1}: ${r.fmt(r.ref1)}`} style={{ left: `${Math.min(100, (r.ref1 / r.max) * 100)}%`, background: C.ink }} />}
            {r.ref2 != null && <i className="bmark b2" title={`${c2}: ${r.fmt(r.ref2)}`} style={{ left: `${Math.min(100, (r.ref2 / r.max) * 100)}%`, background: C.amber }} />}
          </div>
        </div>
      ))}
      <div className="bkey"><span><i style={{ background: C.ink }} />{c1}</span>{c2 && <span><i style={{ background: C.amber }} />{c2}</span>}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- tema suara publik */
export function ThemeBars({ rows, demo }: { rows: { name: string; v: number; lo: number; hi: number; w: number }[]; demo: boolean }) {
  const max = 50;
  return (
    <div className={'themes' + (demo ? ' demo' : '')}>
      {rows.map((r, i) => (
        <div key={r.name} className="trow">
          <div className="tl"><span className="tcode">{r.name.match(/^T\d/)?.[0] ?? 'T' + (i + 1)}</span>{r.name.replace(/^T\d\s*/, '')}</div>
          <div className="tt">
            <i className="tbar" style={{ width: `${(r.v / max) * 100}%`, background: i === 0 ? C.red : '#a8b2b8' }} />
            <i className="tci" style={{ left: `${(r.lo / max) * 100}%`, width: `${((r.hi - r.lo) / max) * 100}%` }} />
            <b>{n1(r.v)}%</b>
          </div>
        </div>
      ))}
    </div>
  );
}
export function EmotionBars({ data, demo }: { data: Record<string, Record<string, number>>; demo?: boolean }) {
  const cols: Record<string, string> = { marah: C.red, sedih: C.blue, takut: C.amber, senang: C.teal, cinta: '#a3577f', netral: '#c4c8bf' };
  return (
    <div className={'emo' + (demo ? ' demo' : '')}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="erow">
          <div className="el">{k.replace(/^T\d\s*/, '').split('(')[0].trim()}</div>
          <div className="estack" role="img" aria-label={Object.entries(v).map(([a, b]) => `${a} ${b}%`).join(', ')}>
            {Object.entries(v).map(([e, p]) => <i key={e} style={{ width: `${p}%`, background: cols[e] ?? C.mute }} title={`${e} ${p}%`}>{p >= 12 ? p : ''}</i>)}
          </div>
        </div>
      ))}
      <div className="ekey">{Object.entries(cols).filter(([k]) => Object.values(data).some((v) => k in v)).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}</div>
    </div>
  );
}

export function Spark({ values, w = 90, h = 24, color = C.blue }: { values: number[]; w?: number; h?: number; color?: string }) {
  const x = scaleLinear().domain([0, values.length - 1]).range([2, w - 2]);
  const y = scaleLinear().domain([Math.min(...values), Math.max(...values)]).range([h - 3, 3]);
  const d = line<number>().x((_, i) => x(i)).y((v) => y(v))(values) ?? '';
  return <svg width={w} height={h} aria-hidden><path d={d} fill="none" stroke={color} strokeWidth={1.8} /></svg>;
}
export const fmtPct = pct;
