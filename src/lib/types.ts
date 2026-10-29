export type LisaClass = 'HH' | 'LL' | 'HL' | 'LH' | 'ns';
export type Tipologi = 'Kota inti' | 'Peralihan' | 'Pinggiran agraris';
export type Role = 'pemda' | 'pencari' | 'pelatihan';
export type RoleChoice = Role;

export interface Region {
  i: number; id: number; n: string; j: string; pl: string; pv: string;
  tpt: number; tl: number; tp: number; rls: number; pdrb: number; p0: number;
  pop: number; dens: number; I: number; pf: number; lisa: LisaClass; fdr: string;
  quad: string; tip: Tipologi; art: boolean; nb: number[]; lag: number | null;
  est: number; skor: number | null; mirip: number[];
}
export interface GeoItem { id: number; d: string; b: [number, number, number, number]; c: [number, number] }
export interface Geo { W: number; H: number; items: GeoItem[] }

export interface IOSektor {
  nama: string; pengganda: number; langsung: number; BL: number; FL: number;
  upah_juta: number; kuadran: string; kunci: boolean;
}
export interface Profil { n: number; tpt: number; rls: number; pdrb: number; p0: number; dens: number; pop: number }
export interface ForecastRow {
  periode: string; median: number; lo80: number; hi80: number; lo95: number; hi95: number;
  realisasi: number | null; di_dalam_PI80?: boolean;
}
export interface National {
  tpt_seri: { y: number; v: number }[];
  tpt_terbaru: { p: string; v: number }[];
  catatan_terbaru: string;
  penganggur_feb2026_juta: number;
  umur: { tahun: number[]; kelompok: Record<string, number[]>; catatan: string };
  sektor_share: { tahun: number[]; kolom: string[]; data: number[][] };
  pendidikan_share: { tahun: number[]; kolom: string[]; data: number[][] };
  forecast: ForecastRow[];
  forecast_univ: { periode: string; median: number; lo80: number; hi80: number; lo95: number; hi95: number }[];
  io: { tahun_tabel: number; unit: string; upah_sumber: string; sektor: IOSektor[] };
  lisa: Record<string, number | string>;
  profil: { lisa: Record<string, Profil>; tipologi: Record<string, Profil>; semua: Profil };
  skor_bobot: Record<string, number>;
  lfpr_proksi: number;
  jumlah_artefak: number;
}
export interface WordItem { w: string; n: number; fs: number; x: number; y: number; v: boolean; neg: number; pos: number; z: number; bx: number; by: number; tw: number }
export interface Sentimen {
  data_demo: boolean; keterangan?: string; pct_negatif: number;
  tema: Record<string, { '% komentar': number; 'CI95 bawah': number; 'CI95 atas': number; '% berbobot-like': number }>;
  emosi_tema?: Record<string, Record<string, number>>;
  n_dianalisis?: number; n_video?: number; periode?: [string, string];
  validasi?: unknown; kappa?: unknown;
  versi?: string; n_mentah?: number; n_bersih?: number; video_efektif?: number; pct_tanpa_tema?: number;
  sentimen?: Record<'negatif' | 'netral' | 'positif', { mentah: number; koreksi: number; lo: number; hi: number }>;
  sentimen_emas_300?: Record<string, number>;
  kata_negatif?: { kata: string; z: number; n: number }[]; kata_positif?: { kata: string; z: number; n: number }[];
  wordcloud?: { w: number; h: number; font: string; catatan?: string; kata: WordItem[] };
  sentimen_n?: Record<'negatif' | 'netral' | 'positif', number>;
  tren_bulanan?: { b: string; n: number; neg: number; net: number; pos: number }[];
  pct_janji_19juta?: number; pct_emoji_tawa?: number; emosi_catatan?: string; cakupan_wilayah_pct?: number;
}
export interface AppData { geo: Geo; regions: Region[]; nat: National; sent: Sentimen; byId: Map<number, Region> }
