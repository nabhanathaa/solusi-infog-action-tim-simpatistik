import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Geo, National, Region, Role, RoleChoice, Sentimen } from './types';

export type View = 'beranda' | 'peta' | 'kompas' | 'simulator' | 'radar' | 'suara' | 'metode';
export const VIEWS: View[] = ['beranda', 'peta', 'kompas', 'simulator', 'radar', 'suara', 'metode'];
export interface Route { view: View; q: URLSearchParams }

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const v = (VIEWS as string[]).includes(path) ? (path as View) : 'beranda';
  return { view: v, q: new URLSearchParams(qs ?? '') };
}

interface Ctx {
  data: AppData; route: Route;
  go: (view: View, params?: Record<string, string | null | undefined>, opts?: { replace?: boolean }) => void;
  setParam: (k: string, v: string | null) => void;
  role: Role; selected: Region | null; select: (id: number | null) => void;
  /** peran yang dipilih di layar pembuka; null = belum memilih */
  choice: RoleChoice | null; choose: (c: RoleChoice) => void; gate: boolean; setGate: (v: boolean) => void;
}
const ROLE_KEY = 'kpk-peran';
function readChoice(): RoleChoice | null {
  try { const v = localStorage.getItem(ROLE_KEY); return v === 'pemda' || v === 'pencari' || v === 'pelatihan' ? v : null; } catch { return null; }
}
const StoreCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(StoreCtx); if (!c) throw new Error('no store'); return c; };

async function loadJSON<T>(name: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!r.ok) throw new Error(`Gagal memuat ${name}`);
  return r.json();
}

export function Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(parseHash);
  const [choice, setChoice] = useState<RoleChoice | null>(readChoice);
  // layar pembuka muncul bila belum pernah memilih peran dan tautan tidak membawa peran/daerah
  const [gate, setGate] = useState<boolean>(() => readChoice() == null && !/[?&](r|w)=/.test(window.location.hash));

  useEffect(() => {
    Promise.all([loadJSON<Geo>('geo.json'), loadJSON<Region[]>('regions.json'), loadJSON<National>('national.json'), loadJSON<Sentimen>('sentimen_ringkasan.json')])
      .then(([geo, regions, nat, sent]) => setData({ geo, regions, nat, sent, byId: new Map(regions.map((r) => [r.id, r])) }))
      .catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback<Ctx['go']>((view, params = {}, opts) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.set(k, v);
    const h = `#/${view}${q.toString() ? '?' + q.toString() : ''}`;
    if (opts?.replace) window.history.replaceState(null, '', h); else window.location.hash = h;
    setRoute({ view, q });
    if (!opts?.replace) window.scrollTo({ top: 0 });
  }, []);
  const setParam = useCallback((k: string, v: string | null) => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    if (v == null || v === '') q.delete(k); else q.set(k, v);
    const path = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'beranda';
    const h = `#/${path}${q.toString() ? '?' + q.toString() : ''}`;
    window.history.replaceState(null, '', h);
    setRoute(parseHash());
  }, []);

  const value = useMemo<Ctx | null>(() => {
    if (!data) return null;
    const fromUrl = (['pemda', 'pencari', 'pelatihan'] as Role[]).find((x) => x === route.q.get('r'));
    const role = (fromUrl ?? (choice ?? 'pemda')) as Role;
    const choose = (c: RoleChoice) => {
      setChoice(c); setGate(false);
      try { localStorage.setItem(ROLE_KEY, c); } catch { /* mode privat: pilihan hanya berlaku di sesi ini */ }
      go('kompas', { r: c, w: route.q.get('w') });
    };
    const sid = Number(route.q.get('w'));
    const selected = sid ? data.byId.get(sid) ?? null : null;
    return { data, route, go, setParam, role, selected, select: (id) => setParam('w', id == null ? null : String(id)), choice, choose, gate, setGate };
  }, [data, route, go, setParam, choice, gate]);

  if (err) return <div className="boot"><b>Data tidak dapat dimuat.</b><p>{err}</p><p>Pastikan folder <code>public/data</code> berisi geo.json, regions.json, national.json, dan sentimen_ringkasan.json.</p></div>;
  if (!value) return <div className="boot"><div className="spinner" aria-hidden /><p>Memuat 514 alamat…</p></div>;
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
