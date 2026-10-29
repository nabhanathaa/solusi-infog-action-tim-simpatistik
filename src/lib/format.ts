const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const n0 = (v: number) => nf0.format(v);
export const n1 = (v: number) => nf1.format(v);
export const n2 = (v: number) => nf2.format(v);
export const pct = (v: number, d = 1) => (d === 2 ? n2(v) : n1(v)) + '%';
export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return n1(v / 1e9) + ' miliar';
  if (a >= 1e6) return n1(v / 1e6) + ' juta';
  if (a >= 1e3) return n1(v / 1e3) + ' ribu';
  return n0(v);
}
/** pembulatan "orang" yang tidak mengklaim presisi palsu */
export function approx(v: number): string {
  if (v >= 1e6) return '± ' + n1(v / 1e6) + ' juta';
  if (v >= 1e4) return '± ' + n0(Math.round(v / 1000) * 1000);
  if (v >= 1e3) return '± ' + n0(Math.round(v / 100) * 100);
  return '± ' + n0(Math.round(v / 10) * 10);
}
export const shortName = (n: string) => n.replace(/^Kabupaten /, 'Kab. ');
export const plainName = (n: string) => n.replace(/^(Kabupaten|Kota) /, '');
