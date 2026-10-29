import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../lib/store';
import { n0, plainName, shortName } from '../lib/format';
import { LISA_COLOR } from '../lib/colors';
import type { Region } from '../lib/types';

export function Pill({ children, color, soft }: { children: ReactNode; color?: string; soft?: boolean }) {
  return <span className={'pill' + (soft ? ' soft' : '')} style={color ? ({ '--pc': color } as React.CSSProperties) : undefined}>{children}</span>;
}
export function Stat({ k, v, sub, color }: { k: string; v: ReactNode; sub?: ReactNode; color?: string }) {
  return <div className="stat"><div className="sk">{k}</div><div className="sv" style={color ? { color } : undefined}>{v}</div>{sub && <div className="ss">{sub}</div>}</div>;
}
export function Section({ id, eyebrow, title, lead, children }: { id?: string; eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} className="sec">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </section>
  );
}
export function Callout({ kind = 'info', title, children }: { kind?: 'info' | 'warn' | 'demo'; title?: string; children: ReactNode }) {
  return <div className={'callout ' + kind} role={kind === 'info' ? undefined : 'note'}>{title && <b>{title}</b>}<div>{children}</div></div>;
}
export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  );
}

export function RegionSearch({ onPick, placeholder = 'Cari kabupaten/kota…', autoFocus, value }: { onPick: (r: Region) => void; placeholder?: string; autoFocus?: boolean; value?: Region | null }) {
  const { data } = useApp();
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const res = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    const scored = data.regions.map((r) => {
      const nm = plainName(r.n).toLowerCase(); const full = (r.n + ' ' + r.pv).toLowerCase();
      const sc = nm.startsWith(s) ? 0 : nm.includes(s) ? 1 : full.includes(s) ? 2 : 9;
      return { r, sc };
    }).filter((x) => x.sc < 9).sort((a, b) => a.sc - b.sc || b.r.pop - a.r.pop);
    return scored.slice(0, 8).map((x) => x.r);
  }, [q, data]);
  useEffect(() => { setAct(0); }, [q]);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', on); return () => document.removeEventListener('mousedown', on);
  }, []);
  const pick = (r: Region) => { onPick(r); setQ(''); setOpen(false); };
  return (
    <div className="search" ref={box}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 16l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      <input
        role="combobox" aria-expanded={open && res.length > 0} aria-controls="rs-list" aria-label="Cari kabupaten atau kota" autoComplete="off" autoFocus={autoFocus}
        value={q} placeholder={value ? shortName(value.n) + ' · ganti…' : placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, res.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && res[act]) { e.preventDefault(); pick(res[act]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && res.length > 0 && (
        <ul id="rs-list" role="listbox" className="rs-list">
          {res.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === act} className={i === act ? 'act' : ''} onMouseEnter={() => setAct(i)} onMouseDown={(e) => { e.preventDefault(); pick(r); }}>
              <i style={{ background: LISA_COLOR[r.lisa] }} /><span><b>{r.n}</b><em>{r.pv}</em></span><small>{n0(r.pop / 1000)} rb jiwa</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
