import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { jawab, sapaan, type Answer, type Ctx } from '../lib/ask';
import type { Region } from '../lib/types';

interface Msg { who: 'me' | 'bot'; text: string; a?: Answer }

export function Assistant() {
  const { data, select, role, choice, selected } = useApp();
  const [open, setOpen] = useState(false); const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);
  const ctx = useRef<Ctx>({ last: [], role });
  ctx.current.role = role;
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ who: 'bot', text: 'Halo! Saya menghitung jawaban langsung dari data 514 kab/kota di aplikasi ini, jadi setiap angka bisa dilacak sumbernya. Tanyakan daerah, provinsi, peringkat, rekomendasi, atau simulasi investasi.', a: { text: '', chips: sapaan(choice) } }]);
  const end = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs, open, typing]);
  useEffect(() => { if (open) inp.current?.focus(); }, [open]);
  // daerah yang sedang dibuka di peta menjadi konteks awal ("rekomendasinya?")
  useEffect(() => { if (selected) ctx.current.last = [selected]; }, [selected]);
  const ask = (text: string) => {
    const t = text.trim(); if (!t || typing) return;
    setMsgs((m) => [...m, { who: 'me', text: t }]); setQ(''); setTyping(true);
    window.setTimeout(() => {
      const a = jawab(t, data, ctx.current);
      if (a.ids?.length) ctx.current.last = a.ids.slice(0, 1).map((id) => data.byId.get(id)).filter(Boolean) as Region[];
      setMsgs((m) => [...m, { who: 'bot', text: a.text, a }]); setTyping(false);
    }, 280);
  };
  return (
    <>
      <button className="fab" aria-label="Tanya data" aria-expanded={open} onClick={() => setOpen((o) => !o)}><span aria-hidden>{open ? '×' : '✦'}</span><b>{open ? '' : 'Tanya data'}</b></button>
      {open && (
        <div className="assist" role="dialog" aria-label="Asisten data">
          <div className="as-head"><div><b>Tanya Data</b><span>menjawab dari 514 alamat · tanpa server</span></div><button className="x" aria-label="Tutup" onClick={() => setOpen(false)}>×</button></div>
          <div className="as-body" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.who}>
                {m.text && <p>{m.text}</p>}
                {m.a?.cards && <div className="acards">{m.a.cards.map((c) => <div key={c.k} style={c.c ? ({ '--cc': c.c } as React.CSSProperties) : undefined}><span>{c.k}</span><b>{c.v}</b>{c.s && <em>{c.s}</em>}</div>)}</div>}
                {m.a?.bars && (() => { const mx = Math.max(...m.a.bars.map((b) => b.v), 1e-9); return <ol className="abars">{m.a.bars.map((b) => <li key={b.label}><span>{b.label}</span><i style={{ width: `${Math.max(4, (b.v / mx) * 100)}%`, background: b.c }} /><b>{b.txt}</b></li>)}</ol>; })()}
                {m.a?.steps && <ol className="asteps">{m.a.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>}
                {m.a?.src && <small className="asrc">{m.a.src}</small>}
                {m.a?.link && <button className="btn sm" onClick={() => { const h = m.a!.link!.hash; if (m.a!.ids?.length === 1) select(m.a!.ids[0]); window.location.hash = h; setOpen(false); }}>{m.a.link.label} →</button>}
                {m.a?.chips && <div className="chips">{m.a.chips.map((c) => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}</div>}
              </div>
            ))}
            {typing && <div className="msg bot"><p className="dots" aria-label="Menghitung"><i /><i /><i /></p></div>}
            <div ref={end} />
          </div>
          <form className="as-in" onSubmit={(e) => { e.preventDefault(); ask(q); }}><input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Contoh: rekomendasi untuk Kota Medan" aria-label="Pertanyaan" /><button className="btn sm" type="submit" disabled={!q.trim()}>Kirim</button></form>
        </div>
      )}
    </>
  );
}
