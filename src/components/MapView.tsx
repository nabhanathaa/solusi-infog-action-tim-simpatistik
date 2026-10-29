import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { C, fillFor, legendFor, LISA_COLOR, type LayerKey } from '../lib/colors';
import { pct, shortName } from '../lib/format';
import type { Region } from '../lib/types';

type Box = [number, number, number, number];
interface VB { x: number; y: number; w: number; h: number }

export interface MapProps {
  layer: LayerKey;
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  /** wilayah yang disorot; sisanya diredupkan */
  highlight?: Set<number> | null;
  /** kotak (koordinat peta) yang ingin ditampilkan; null = seluruh Indonesia */
  focus?: Box | null;
  outline?: (r: Region) => string | null;
  labelIds?: number[];
  interactive?: boolean;
  showLegend?: boolean;
  showControls?: boolean;
  className?: string;
  ariaLabel?: string;
}

const fitBox = (b: Box, aspect: number, pad: number): VB => {
  let w = (b[2] - b[0]) * (1 + pad), h = (b[3] - b[1]) * (1 + pad);
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

function MapViewInner(p: MapProps) {
  const { data } = useApp();
  const { geo, regions } = data;
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const full: Box = useMemo(() => [-12, -6, geo.W + 12, geo.H + 6], [geo]);
  const [vb, setVb] = useState<VB>(() => fitBox(full, 800 / 480, 0.02));
  const target = useRef<VB>(vb);
  const raf = useRef<number | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, sx: 0, sy: 0, startVB: vb, pinch: 0 });
  const interactive = p.interactive !== false;

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 480 }));
    ro.observe(el); setSize({ w: el.clientWidth || 800, h: el.clientHeight || 480 });
    return () => ro.disconnect();
  }, []);

  const cur = useRef<VB>(vb);
  const animate = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const step = () => {
      const t = target.current, c = cur.current, k = 0.16;
      const done = Math.abs(c.w - t.w) < 0.4 && Math.abs(c.x - t.x) < 0.4 && Math.abs(c.y - t.y) < 0.4;
      cur.current = done ? t : { x: c.x + (t.x - c.x) * k, y: c.y + (t.y - c.y) * k, w: c.w + (t.w - c.w) * k, h: c.h + (t.h - c.h) * k };
      setVb(cur.current);
      raf.current = done ? null : requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  // fokus terkontrol dari luar
  const aspect = size.w / Math.max(size.h, 1);
  const focusKey = p.focus ? p.focus.join(',') : 'all';
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.current = fitBox(p.focus ?? full, aspect, p.focus ? 0.12 : 0.02);
    if (reduce) { cur.current = target.current; setVb(target.current); } else animate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, Math.round(aspect * 20)]);

  const setBoth = (v: VB) => { target.current = v; cur.current = v; setVb(v); if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; } };
  const clampVB = (v: VB): VB => {
    const maxW = geo.W * 1.05, minW = 40;
    const w = Math.min(maxW, Math.max(minW, v.w)); const h = w / aspect;
    return { x: Math.min(geo.W - w * 0.1, Math.max(-w * 0.9, v.x)), y: Math.min(geo.H - h * 0.1, Math.max(-h * 0.9, v.y)), w, h };
  };
  const zoomAt = (fx: number, fy: number, factor: number) => {
    const cur = target.current;
    const w = cur.w * factor, h = cur.h * factor;
    setBoth(clampVB({ x: cur.x + (cur.w - w) * fx, y: cur.y + (cur.h - h) * fy, w, h }));
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    zoomAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.deltaY > 0 ? 1.18 : 1 / 1.18);
  };
  const onDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: false, sx: e.clientX, sy: e.clientY, startVB: { ...target.current }, pinch: 0 };
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  };
  const onMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && drag.current.pinch) {
        const [a, b] = [...pointers.current.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const f = drag.current.pinch / dist; drag.current.pinch = dist; drag.current.moved = true;
        zoomAt(((a.x + b.x) / 2 - rect.left) / rect.width, ((a.y + b.y) / 2 - rect.top) / rect.height, f);
        return;
      }
      const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
      if (drag.current.moved && pointers.current.size === 1) {
        const sv = drag.current.startVB;
        setBoth(clampVB({ ...sv, x: sv.x - (dx / rect.width) * sv.w, y: sv.y - (dy / rect.height) * sv.h }));
        setHover(null); return;
      }
    }
    if (e.pointerType === 'mouse') {
      const t = (e.target as Element).getAttribute?.('data-i');
      if (t != null) setHover({ i: Number(t), x: e.clientX - rect.left, y: e.clientY - rect.top }); else setHover(null);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (!drag.current.moved && p.onSelect) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const t = el?.getAttribute?.('data-i');
      if (t != null) { const r = regions[Number(t)]; p.onSelect(r.id === p.selectedId ? null : r.id); }
    }
  };

  const hi = p.highlight ?? null;
  const base = useMemo(() => geo.items.map((it, i) => {
    const r = regions[i];
    const dim = hi && !hi.has(r.id);
    return <path key={it.id} data-i={i} d={it.d} fill={fillFor(p.layer, r)} opacity={dim ? 0.22 : 1} className="rg" />;
  }), [geo, regions, p.layer, hi]);

  const over = useMemo(() => {
    if (!p.outline) return null;
    const out: JSX.Element[] = [];
    geo.items.forEach((it, i) => { const c = p.outline!(regions[i]); if (c) out.push(<path key={it.id} d={it.d} fill="none" stroke={c} strokeWidth={1.6} vectorEffect="non-scaling-stroke" pointerEvents="none" />); });
    return out;
  }, [geo, regions, p.outline]);

  const px = vb.w / size.w; // satuan peta per piksel layar
  const sel = p.selectedId != null ? regions.findIndex((r) => r.id === p.selectedId) : -1;
  const hovR = hover ? regions[hover.i] : null;
  const legend = legendFor(p.layer);
  const selR = sel >= 0 ? regions[sel] : null;

  return (
    <div ref={wrap} className={'map ' + (p.className ?? '')} onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setHover(null)} style={{ touchAction: interactive ? 'none' : 'auto' }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={p.ariaLabel ?? 'Peta 514 kabupaten/kota Indonesia'}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
            <rect width="16" height="16" fill="#f4f1e6" /><line x1="0" y1="0" x2="0" y2="16" stroke="#a3a59c" strokeWidth="5" />
          </pattern>
        </defs>
        <g className="rgs">{base}</g>
        {over && <g>{over}</g>}
        {hovR && <path d={geo.items[hovR.i].d} fill="none" stroke={C.ink} strokeWidth={1.8} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
        {selR && (
          <g pointerEvents="none">
            <path d={geo.items[sel].d} fill="none" stroke={C.ink} strokeWidth={2.6} vectorEffect="non-scaling-stroke" />
            {selR.nb.map((n) => <path key={n} d={geo.items[n].d} fill="none" stroke={C.gold} strokeWidth={1.4} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />)}
            <circle cx={geo.items[sel].c[0]} cy={geo.items[sel].c[1]} r={5 * px} fill={C.gold} stroke={C.ink} strokeWidth={1.5 * px} />
            <circle cx={geo.items[sel].c[0]} cy={geo.items[sel].c[1]} r={5 * px} className="pulse" fill="none" stroke={C.gold} strokeWidth={2 * px} />
          </g>
        )}
        {p.labelIds?.map((id) => {
          const i = regions.findIndex((r) => r.id === id); if (i < 0) return null;
          const it = geo.items[i]; const fs = 11 * px;
          return <text key={id} x={it.c[0]} y={it.c[1]} fontSize={fs} textAnchor="middle" className="maplabel" strokeWidth={3 * px} pointerEvents="none">{shortName(regions[i].n)}</text>;
        })}
      </svg>

      {hovR && (
        <div className="tip" style={{ left: Math.min(hover!.x + 14, size.w - 190), top: Math.max(hover!.y - 8, 4) }}>
          <b>{hovR.n}</b><span>{hovR.pv}</span>
          <div className="tiprow"><i style={{ background: fillFor('tpt', hovR) }} />TPT {pct(hovR.tpt)}{hovR.art ? ' (diragukan)' : ''}</div>
          <div className="tiprow"><i style={{ background: LISA_COLOR[hovR.lisa] }} />{hovR.lisa === 'ns' ? 'Tidak signifikan' : 'Klaster ' + hovR.lisa} · {hovR.tip}</div>
        </div>
      )}

      {p.showLegend !== false && (
        <div className="legend" aria-hidden={false}>
          <div className="legt">{legend.title}</div>
          {legend.kind === 'steps'
            ? <div className="legsteps">{legend.items.map((it, k) => <div key={k}><i style={{ background: it.color }} /><span>{it.label}</span></div>)}</div>
            : <div className="legcat">{legend.items.map((it, k) => <div key={k}><i style={{ background: it.color }} />{it.label}</div>)}</div>}
        </div>
      )}
      {interactive && p.showControls !== false && (
        <div className="mapctl">
          <button aria-label="Perbesar" onClick={() => zoomAt(0.5, 0.5, 1 / 1.5)}>+</button>
          <button aria-label="Perkecil" onClick={() => zoomAt(0.5, 0.5, 1.5)}>−</button>
          <button aria-label="Tampilkan seluruh Indonesia" onClick={() => { target.current = fitBox(full, aspect, 0.02); animate(); }}>⤢</button>
        </div>
      )}
    </div>
  );
}
export const MapView = memo(MapViewInner);

/** kotak gabungan sekumpulan wilayah (koordinat peta) */
export function boxOf(ids: number[], geo: { items: { id: number; b: Box }[] }): Box | null {
  const s = new Set(ids); let b: Box | null = null;
  for (const it of geo.items) if (s.has(it.id)) b = b ? [Math.min(b[0], it.b[0]), Math.min(b[1], it.b[1]), Math.max(b[2], it.b[2]), Math.max(b[3], it.b[3])] : [...it.b];
  return b;
}
