import { scaleLinear } from 'd3-scale';
import type { LisaClass, Region, Tipologi } from './types';

export const C = {
  ink: '#0a2f44', red: '#b5372b', orange: '#ca7122', blue: '#2a5a8a', amber: '#b7791f', teal: '#2e6b4f', gold: '#e3c55a',
  bg: '#f7f4e8', card: '#FFFFFF', line: '#e8e1c9', mute: '#5f6672', soft: '#fbf8ee', grey: '#8d9198',
  hl: '#e7a796', lh: '#a9c0d6', ns: '#e4dfcf', navy: '#1d3256', maroon: '#5d0000', mustard: '#f0db7f', cream: '#f7f3d4',
};

export const LISA_COLOR: Record<LisaClass, string> = { HH: C.red, LL: C.blue, HL: C.hl, LH: C.lh, ns: C.ns };
export const LISA_LABEL: Record<LisaClass, string> = {
  HH: 'HH · klaster tinggi', LL: 'LL · klaster rendah', HL: 'HL · tinggi di tengah rendah',
  LH: 'LH · rendah di tengah tinggi', ns: 'Tidak signifikan',
};
export const TIP_COLOR: Record<Tipologi, string> = { 'Kota inti': C.ink, Peralihan: C.amber, 'Pinggiran agraris': C.teal };

const warm = scaleLinear<string>().domain([0, 2.5, 4.5, 6.5, 8.5, 11]).range(['#1d3256', '#8fa3c0', '#f7f3d4', '#f0db7f', '#ca7122', '#5d0000']).clamp(true);
const cool = scaleLinear<string>().domain([4, 7, 8.5, 10, 12]).range(['#f4f1e4', '#c9d6df', '#8fa9bf', '#4a7396', '#1d3256']).clamp(true);
const pov = scaleLinear<string>().domain([2, 6, 10, 16, 28]).range(['#f7f1ee', '#e3cbd0', '#c393a0', '#94566b', '#5d2340']).clamp(true);
const skorS = scaleLinear<string>().domain([0, 25, 50, 75, 100]).range(['#f7f3d4', '#f0db7f', '#e0a24a', '#b5372b', '#5d0000']).clamp(true);
const pop = scaleLinear<string>().domain([4.4, 5, 5.5, 6, 6.5]).range(['#f2f4ee', '#c6d6c9', '#86ab93', '#467a5d', '#1f4a33']).clamp(true);

export type LayerKey = 'tpt' | 'lisa' | 'tip' | 'skor' | 'rls' | 'p0' | 'pop';
export const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'tpt', label: 'TPT', hint: 'Tingkat pengangguran terbuka, Agustus 2024' },
  { key: 'lisa', label: 'Klaster LISA', hint: 'Mengelompok secara spasial (Local Moran, permutasi 9.999)' },
  { key: 'tip', label: 'Tipologi', hint: 'Kota inti, peralihan, pinggiran agraris (K-means k=3, deskriptif)' },
  { key: 'skor', label: 'Kewaspadaan', hint: 'Indeks gabungan 0–100 (heuristik transparan)' },
  { key: 'rls', label: 'Pendidikan', hint: 'Rata-rata lama sekolah (tahun)' },
  { key: 'p0', label: 'Kemiskinan', hint: 'Persentase penduduk miskin' },
  { key: 'pop', label: 'Penduduk', hint: 'Jumlah penduduk (skala log)' },
];

export function fillFor(layer: LayerKey, r: Region): string {
  switch (layer) {
    case 'tpt': return r.art ? 'url(#hatch)' : warm(r.tpt);
    case 'lisa': return LISA_COLOR[r.lisa];
    case 'tip': return TIP_COLOR[r.tip];
    case 'skor': return r.skor == null ? 'url(#hatch)' : skorS(r.skor);
    case 'rls': return cool(r.rls);
    case 'p0': return pov(r.p0);
    case 'pop': return pop(Math.log10(r.pop));
  }
}
export interface LegendSpec { title: string; kind: 'steps' | 'cat'; items: { color: string; label: string }[] }
export function legendFor(layer: LayerKey): LegendSpec {
  const ramp = (f: (v: number) => string, vals: number[], fmt: (v: number) => string, title: string): LegendSpec => ({
    title, kind: 'steps', items: vals.map((v) => ({ color: f(v), label: fmt(v) })),
  });
  switch (layer) {
    case 'tpt': return ramp(warm, [0, 2.5, 4.5, 6.5, 8.5, 11], (v) => String(v).replace('.', ',') + '%', 'TPT (%)');
    case 'lisa': return { title: 'Klaster LISA', kind: 'cat', items: (['HH', 'LL', 'HL', 'LH', 'ns'] as LisaClass[]).map((k) => ({ color: LISA_COLOR[k], label: LISA_LABEL[k] })) };
    case 'tip': return { title: 'Tipologi', kind: 'cat', items: (Object.keys(TIP_COLOR) as Tipologi[]).map((k) => ({ color: TIP_COLOR[k], label: k })) };
    case 'skor': return ramp(skorS, [0, 25, 50, 75, 100], (v) => String(v), 'Indeks 0–100');
    case 'rls': return ramp(cool, [4, 7, 8.5, 10, 12], (v) => String(v).replace('.', ','), 'Tahun sekolah');
    case 'p0': return ramp(pov, [2, 6, 10, 16, 28], (v) => v + '%', 'Miskin (%)');
    case 'pop': return ramp(pop, [4.4, 5, 5.5, 6, 6.5], (v) => ({ 4.4: '25 rb', 5: '100 rb', 5.5: '300 rb', 6: '1 jt', 6.5: '3 jt' } as Record<number, string>)[v], 'Penduduk');
  }
}
