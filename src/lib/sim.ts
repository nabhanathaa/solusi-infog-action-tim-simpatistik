import type { IOSektor } from './types';

export interface SimInput { alokasi: Record<string, number>; totalMiliar: number; inflasi: number; kapture: number }
export interface SimOut {
  perSektor: { nama: string; miliar: number; total: number; langsung: number; tidakLangsung: number; upah: number }[];
  total: number; langsung: number; tidakLangsung: number; upahRata: number | null; efekLokal: number;
}
/** pengganda = orang per Rp1 miliar permintaan akhir (tabel IO 2020). Deflasi harga disederhanakan: kerja ∝ 1/(1+inflasi). */
export function simulasi(sek: IOSektor[], inp: SimInput): SimOut {
  const sum = Object.values(inp.alokasi).reduce((a, b) => a + b, 0);
  const adj = 1 / (1 + inp.inflasi);
  const rows = sek.map((s) => {
    const share = sum > 0 ? (inp.alokasi[s.nama] ?? 0) / sum : 0;
    const miliar = share * inp.totalMiliar;
    const total = miliar * s.pengganda * adj;
    const langsung = miliar * s.langsung * adj;
    return { nama: s.nama, miliar, total, langsung, tidakLangsung: total - langsung, upah: s.upah_juta };
  });
  const total = rows.reduce((a, r) => a + r.total, 0);
  const langsung = rows.reduce((a, r) => a + r.langsung, 0);
  const upahRata = langsung > 0 ? rows.reduce((a, r) => a + r.langsung * r.upah, 0) / langsung : null;
  return { perSektor: rows, total, langsung, tidakLangsung: total - langsung, upahRata, efekLokal: total * inp.kapture };
}
/** Investasi (Rp miliar) yang dibutuhkan agar efek lokal menyerap `target` orang, bila bauran alokasi tetap. */
export function investasiUntuk(sek: IOSektor[], alokasi: Record<string, number>, inflasi: number, kapture: number, target: number): number | null {
  const unit = simulasi(sek, { alokasi, totalMiliar: 1, inflasi, kapture }).efekLokal;
  return unit > 0 ? target / unit : null;
}
export const PRESET: Record<string, { label: string; desc: string; alokasi: (s: IOSektor[]) => Record<string, number> }> = {
  seimbang: { label: 'Seimbang', desc: 'Bagi rata ke semua sektor', alokasi: (s) => Object.fromEntries(s.map((x) => [x.nama, 1])) },
  padat: { label: 'Padat karya', desc: 'Utamakan sektor dengan pengganda kerja terbesar', alokasi: (s) => Object.fromEntries(s.map((x) => [x.nama, x.pengganda > 9 ? 3 : 0.3])) },
  layak: { label: 'Kerja layak', desc: 'Utamakan sektor berupah di atas rata-rata dan keterkaitan kuat', alokasi: (s) => Object.fromEntries(s.map((x) => [x.nama, x.upah_juta >= 3.5 ? 3 : 0.3])) },
  industri: { label: 'Industri & infrastruktur', desc: 'Industri pengolahan, konstruksi, transportasi, energi', alokasi: (s) => Object.fromEntries(s.map((x) => [x.nama, /Industri|Konstruksi|Transportasi|Listrik/.test(x.nama) ? 3 : 0.2])) },
};
