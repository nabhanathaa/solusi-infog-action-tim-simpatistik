import type { AppData, IOSektor, Region, Role } from './types';
import { n0, n1, pct, approx, shortName } from './format';
import { C } from './colors';

export type Level = 'merah' | 'oranye' | 'kuning' | 'hijau' | 'abu';
export interface Alert { level: Level; label: string; color: string; why: string }

/** Tingkat kewaspadaan: aturan eksplisit dan dapat diaudit (bukan model prediktif). */
export function alertFor(r: Region, nat: AppData['nat'], ambang = 6): Alert {
  if (r.art) return { level: 'abu', label: 'Data diragukan', color: C.grey, why: 'TPT 0,5% atau kurang kemungkinan artefak pengukuran; verifikasi sebelum dipakai.' };
  const skor = r.skor ?? 0;
  if (r.lisa === 'HH' && r.tpt >= ambang) return { level: 'merah', label: 'Siaga merah', color: C.red, why: `Klaster tinggi signifikan dan TPT ${pct(r.tpt)} ≥ ambang ${pct(ambang)}.` };
  if (r.lisa === 'HH' || skor >= 70 || r.tpt >= ambang + 1.5) return { level: 'oranye', label: 'Waspada', color: C.orange, why: r.lisa === 'HH' ? 'Berada di klaster tinggi signifikan.' : skor >= 70 ? `Indeks kewaspadaan tinggi (${n1(skor)}).` : `TPT ${pct(r.tpt)} jauh di atas ambang.` };
  if (r.tpt >= ambang || (r.lag != null && r.lag >= ambang) || r.lisa === 'HL') return { level: 'kuning', label: 'Pantau', color: C.gold, why: r.tpt >= ambang ? `TPT ${pct(r.tpt)} melewati ambang.` : r.lisa === 'HL' ? 'Tinggi di tengah tetangga rendah: kemungkinan masalah lokal.' : 'Tetangga rata-rata di atas ambang: ada risiko limpahan.' };
  return { level: 'hijau', label: 'Relatif aman', color: C.teal, why: 'TPT dan lingkungan sekitar di bawah ambang.' };
}

export interface Zone { code: string; title: string; color: string; summary: string }
export function zoneFor(r: Region): Zone {
  const base: Record<string, Zone> = {
    HH: { code: 'HH', title: 'Pusat klaster pengangguran tinggi', color: C.red, summary: 'TPT tinggi dan dikelilingi tetangga yang juga tinggi; mengelompok secara spasial (signifikan p<0,05).' },
    LL: { code: 'LL', title: 'Kantong pengangguran rendah', color: C.blue, summary: 'TPT rendah dan dikelilingi tetangga rendah. Rendah bukan otomatis baik: periksa kualitas dan upah pekerjaan.' },
    HL: { code: 'HL', title: 'Pencilan tinggi', color: '#C9402B', summary: 'TPT tinggi di tengah tetangga yang rendah: masalahnya cenderung spesifik daerah ini.' },
    LH: { code: 'LH', title: 'Pulau rendah di sekitar tinggi', color: '#4F7DBF', summary: 'TPT rendah tetapi tetangganya tinggi: pantau limpahan pencari kerja.' },
    ns: { code: 'ns', title: 'Tidak ada pola spasial yang jelas', color: C.mute, summary: 'Tidak ada bukti klaster yang kuat di sekitar daerah ini pada tingkat 5%.' },
  };
  return base[r.lisa];
}

export interface Action { judul: string; aksi: string; alasan: string[]; indikator: string; prioritas: 1 | 2 | 3 }

/** Resep bagi pemda: aturan IF-THEN yang menampilkan bukti pemicunya agar bisa diperiksa dan dibantah. */
export function resepPemda(r: Region, d: AppData): Action[] {
  const nat = d.nat; const A: Action[] = [];
  const med = nat.profil.semua.tpt;
  const gap = r.tp - r.tl;
  if (r.art) {
    A.push({ judul: 'Verifikasi data lebih dulu', aksi: 'Cek metodologi dan ukuran sampel Sakernas di daerah ini sebelum menyusun program; TPT mendekati nol jarang masuk akal.', alasan: [`TPT tercatat ${pct(r.tpt)}`], indikator: 'Ukuran sampel dan konsistensi antarperiode', prioritas: 1 });
    return A;
  }
  if (r.lisa === 'HH') {
    A.push({ judul: 'Koordinasi lintas-daerah, bukan program sendirian', aksi: 'Bentuk forum aglomerasi dengan kabupaten/kota tetangga: bursa kerja bersama, pelatihan terpadu, dan transportasi komuter.', alasan: [`Klaster HH signifikan (I lokal ${n1(r.I)})`, `TPT tetangga rata-rata ${r.lag != null ? pct(r.lag) : '-'}`], indikator: 'TPT gabungan klaster, jumlah lowongan terisi lintas daerah', prioritas: 1 });
  }
  if (r.tip === 'Kota inti' && r.tpt > med) {
    A.push({ judul: 'Klinik transisi sekolah-ke-kerja', aksi: 'Magang terstruktur, sertifikasi keahlian, dan penempatan lulusan baru; tekan masa tunggu pencari kerja muda.', alasan: [`Kota inti dengan TPT ${pct(r.tpt)} di atas median ${pct(med)}`, `Rata-rata lama sekolah ${n1(r.rls)} tahun`], indikator: 'Masa tunggu kerja pertama, persen lulusan SMK/Diploma terserap', prioritas: r.lisa === 'HH' ? 1 : 2 });
  }
  if (r.tip === 'Peralihan' && r.tpt > med) {
    A.push({ judul: 'Hubungkan kawasan industri dan pelatihan vokasi', aksi: 'Selaraskan kurikulum BLK dan SMK dengan kebutuhan industri pengolahan dan konstruksi di sekitar.', alasan: [`Tipologi peralihan, TPT ${pct(r.tpt)}`, 'Industri pengolahan termasuk sektor kunci dengan kualitas kerja cukup baik di tabel IO'], indikator: 'Serapan lulusan vokasi di industri setempat', prioritas: 2 });
  }
  if (r.tip === 'Pinggiran agraris') {
    A.push({ judul: 'Padat karya produktif dan hilirisasi pertanian', aksi: 'Prioritaskan pengolahan hasil pertanian, infrastruktur desa, dan akses pasar; fokus pada kenaikan upah, bukan hanya jumlah kerja.', alasan: [`Pinggiran agraris, kepadatan ${n0(r.dens)} jiwa/km²`, 'Pertanian menyerap banyak kerja tetapi upah rata-rata terendah'], indikator: 'Upah rata-rata pekerja pertanian, nilai tambah per pekerja', prioritas: 2 });
  }
  if (gap >= 1.5) {
    A.push({ judul: 'Perluas akses kerja bagi perempuan', aksi: 'Pelatihan digital dan kerja fleksibel, penitipan anak terjangkau, dan afirmasi rekrutmen.', alasan: [`TPT perempuan ${pct(r.tp)} vs laki-laki ${pct(r.tl)} (selisih ${n1(gap)} poin)`], indikator: 'Selisih TPT gender', prioritas: gap >= 3 ? 1 : 2 });
  }
  if (r.rls < 8.2) {
    A.push({ judul: 'Perkuat dasar pendidikan dan keterampilan dasar', aksi: 'Literasi digital, keterampilan teknis dasar, dan pendidikan kesetaraan sebagai pintu masuk pelatihan.', alasan: [`Rata-rata lama sekolah ${n1(r.rls)} tahun (median nasional ${n1(nat.profil.semua.rls)})`], indikator: 'Rata-rata lama sekolah, partisipasi pelatihan', prioritas: 2 });
  }
  if (r.p0 >= 12) {
    A.push({ judul: 'Padukan penciptaan kerja dengan jaring pengaman', aksi: 'Padat karya tunai sementara sambil membangun pekerjaan layak; kemiskinan tinggi membuat orang menerima kerja apa pun.', alasan: [`Kemiskinan ${pct(r.p0)} (median ${pct(nat.profil.semua.p0)})`], indikator: 'Pekerja dengan upah di bawah standar, kemiskinan', prioritas: 2 });
  }
  if (r.lisa === 'HL') {
    A.push({ judul: 'Cari penyebab spesifik lokal', aksi: 'Audit cepat: penutupan pabrik, perubahan komoditas, atau migrasi masuk. Tetangga rendah menunjukkan masalah bukan regional.', alasan: ['Pencilan HL signifikan'], indikator: 'Perubahan lapangan usaha utama', prioritas: 1 });
  }
  if (r.lisa === 'LH') {
    A.push({ judul: 'Waspadai limpahan dari tetangga', aksi: 'Siapkan kapasitas layanan kerja dan transportasi bila pencari kerja dari tetangga masuk.', alasan: ['Daerah rendah di sekitar tetangga tinggi'], indikator: 'Arus komuter masuk', prioritas: 3 });
  }
  if (r.lisa === 'LL') {
    A.push({ judul: 'Jaga kualitas, bukan hanya jumlah', aksi: 'TPT rendah bisa menyembunyikan kerja informal berupah rendah. Pantau upah, kontrak, dan setengah pengangguran.', alasan: [`TPT ${pct(r.tpt)} di kantong rendah`], indikator: 'Pekerja informal, upah rata-rata', prioritas: 3 });
  }
  if (A.length === 0) {
    A.push({ judul: 'Pertahankan dan pantau', aksi: 'Tidak ada sinyal kuat pada indikator yang tersedia. Pantau tren dua semester ke depan.', alasan: [`TPT ${pct(r.tpt)}`], indikator: 'TPT semesteran', prioritas: 3 });
  }
  return A.sort((a, b) => a.prioritas - b.prioritas);
}

/* ------------------------------------------------------------------------------------------
   Sektor prioritas per wilayah (HEURISTIK).
   Data sektoral kab/kota belum tersedia, jadi bobot kesesuaian memakai arketipe tipologi
   (asumsi eksplisit di bawah) dikalikan pengganda kerja nasional dan faktor upah dari tabel IO.
------------------------------------------------------------------------------------------- */
const ARCH: Record<string, Record<string, number>> = {
  'Kota inti': { 'Industri': 1, 'Perdagangan': 1, 'Akomodasi': 0.9, 'Informasi': 1, 'Jasa Keuangan': 0.9, 'Jasa Kesehatan': 0.9, 'Jasa Perusahaan': 0.8, 'Transportasi': 0.8, 'Jasa Pendidikan': 0.7, 'Konstruksi': 0.7, 'Jasa lainnya': 0.7, 'Real Estate': 0.5, 'Pertanian': 0.1 },
  'Peralihan': { 'Industri': 1, 'Konstruksi': 0.9, 'Perdagangan': 0.9, 'Transportasi': 0.8, 'Pertanian': 0.6, 'Akomodasi': 0.7, 'Jasa Kesehatan': 0.7, 'Jasa Pendidikan': 0.6, 'Pengadaan Air': 0.5, 'Jasa lainnya': 0.6, 'Pertambangan': 0.4 },
  'Pinggiran agraris': { 'Pertanian': 1, 'Industri': 0.8, 'Perdagangan': 0.7, 'Konstruksi': 0.8, 'Akomodasi': 0.6, 'Transportasi': 0.6, 'Pengadaan Air': 0.5, 'Pertambangan': 0.4, 'Jasa Kesehatan': 0.5 },
};
function archW(tip: string, nama: string): number {
  const t = ARCH[tip] ?? ARCH['Peralihan'];
  for (const k of Object.keys(t)) if (nama.toLowerCase().includes(k.toLowerCase())) return t[k];
  return 0.25;
}
export interface SektorSkor { s: IOSektor; skor: number; w: number; catatan: string }
export function sektorPrioritas(r: Region, nat: AppData['nat'], bobotUpah = 0.5): SektorSkor[] {
  const maxP = Math.max(...nat.io.sektor.map((s) => s.pengganda));
  const mean = 3.29;
  const out = nat.io.sektor.map((s) => {
    const w = archW(r.tip, s.nama);
    const volume = s.pengganda / maxP;
    const kualitas = Math.min(s.upah_juta / (mean * 1.5), 1);
    const skor = 100 * w * ((1 - bobotUpah) * volume + bobotUpah * kualitas);
    const catatan = `${s.kuadran}${s.kunci ? ' · sektor kunci' : ''}`;
    return { s, skor, w, catatan };
  });
  return out.sort((a, b) => b.skor - a.skor);
}

/* ------------------------------ hambatan (hipotesis) dari indikator ------------------------------ */
export interface Hambatan { kode: 'T1' | 'T2' | 'T3' | 'T4'; judul: string; skor: number; alasan: string; solusi: string[] }
export function hambatanWilayah(r: Region, nat: AppData['nat']): Hambatan[] {
  const med = nat.profil.semua;
  const s1 = Math.min(1, Math.max(0, (r.tpt - med.tpt) / 4)) * 0.6 + (r.lag != null ? Math.min(1, Math.max(0, (r.lag - med.tpt) / 4)) * 0.4 : 0);
  const s2 = r.rls >= med.rls ? Math.min(1, (r.rls - med.rls) / 2 + Math.max(0, (r.tpt - med.tpt) / 6)) : Math.max(0, (r.tpt - med.tpt) / 8);
  const s3 = (r.tip === 'Pinggiran agraris' ? 0.5 : r.tip === 'Peralihan' ? 0.3 : 0.15) + Math.min(0.5, Math.max(0, (80 - Math.min(r.dens, 80)) / 160));
  const s4 = Math.min(1, r.p0 / 20) * 0.6 + Math.min(1, Math.max(0, (med.pdrb - r.pdrb) / med.pdrb)) * 0.4;
  const H: Hambatan[] = [
    { kode: 'T1', judul: 'Kelangkaan & persaingan', skor: s1, alasan: `TPT ${pct(r.tpt)}, tetangga ${r.lag != null ? pct(r.lag) : '-'} (median nasional ${pct(med.tpt)})`, solusi: ['Perluas pencarian lintas-daerah (komuter, bursa kerja regional)', 'Pertimbangkan sektor dengan pengganda kerja tinggi: perdagangan, akomodasi, jasa'] },
    { kode: 'T2', judul: 'Ketidaksesuaian keahlian/ijazah', skor: s2, alasan: `Rata-rata lama sekolah ${n1(r.rls)} th dengan TPT ${pct(r.tpt)}`, solusi: ['Ambil sertifikasi keahlian yang dicari industri (digital, teknis, bahasa)', 'Magang atau proyek nyata untuk menutup celah pengalaman'] },
    { kode: 'T3', judul: 'Akses informasi & keadilan', skor: s3, alasan: `${r.tip}, kepadatan ${n0(r.dens)} jiwa/km²`, solusi: ['Gunakan kanal resmi: SIAPKerja, bursa kerja daerah, BLK', 'Waspadai penipuan lowongan: jangan membayar untuk melamar'] },
    { kode: 'T4', judul: 'Kualitas pekerjaan (upah, kontrak)', skor: s4, alasan: `Kemiskinan ${pct(r.p0)}, PDRB per kapita ${n1(r.pdrb)} juta`, solusi: ['Bandingkan upah dengan UMK dan rata-rata sektor', 'Prioritaskan kontrak jelas dan jaminan sosial walau gaji awal sedikit lebih kecil'] },
  ];
  return H.sort((a, b) => b.skor - a.skor);
}

/* ------------------------------ pencari kerja ------------------------------ */
export type Edu = 'SD' | 'SMP' | 'SMA' | 'SMK' | 'Diploma' | 'Sarjana';
export type Usia = '15-24' | '25-34' | '35+';
export interface PencariHasil { konteks: string[]; sektor: SektorSkor[]; hambatan: Hambatan[]; tetangga: Region[]; langkah: string[] }
const EDU_SEKTOR: Record<Edu, string[]> = {
  SD: ['Pertanian', 'Konstruksi', 'Perdagangan', 'Akomodasi', 'Jasa lainnya'],
  SMP: ['Pertanian', 'Konstruksi', 'Perdagangan', 'Akomodasi', 'Industri', 'Transportasi'],
  SMA: ['Perdagangan', 'Industri', 'Akomodasi', 'Transportasi', 'Konstruksi', 'Jasa lainnya'],
  SMK: ['Industri', 'Konstruksi', 'Transportasi', 'Perdagangan', 'Listrik', 'Informasi'],
  Diploma: ['Industri', 'Informasi', 'Jasa Kesehatan', 'Jasa Perusahaan', 'Transportasi', 'Jasa Keuangan'],
  Sarjana: ['Informasi', 'Jasa Keuangan', 'Jasa Perusahaan', 'Jasa Pendidikan', 'Jasa Kesehatan', 'Industri'],
};
export function resepPencari(r: Region, edu: Edu, usia: Usia, d: AppData): PencariHasil {
  const nat = d.nat; const med = nat.profil.semua;
  const sek = sektorPrioritas(r, nat, 0.45).map((x) => {
    const cocok = EDU_SEKTOR[edu].some((k) => x.s.nama.toLowerCase().includes(k.toLowerCase()));
    return { ...x, skor: x.skor * (cocok ? 1.0 : 0.45) };
  }).sort((a, b) => b.skor - a.skor).slice(0, 5);
  const konteks = [
    `${shortName(r.n)}, ${r.pv}: TPT ${pct(r.tpt)} (median kab/kota ${pct(med.tpt)}); tipologi ${r.tip.toLowerCase()}.`,
    r.lisa === 'HH' ? 'Daerahmu ada di klaster tinggi: persaingan kerja cenderung ketat di sekitar, jadi pencarian lintas-daerah layak dipertimbangkan.'
      : r.lisa === 'LL' ? 'Daerahmu ada di kantong rendah: lowongan relatif lebih longgar, tetapi periksa kualitas dan upahnya.'
      : 'Tidak ada pola klaster kuat di sekitarmu; kondisinya lebih ditentukan faktor lokal.',
    usia === '15-24' ? 'Penganggur usia 15–24 tahun jauh lebih tinggi dari rata-rata (TPT usia 20–24 ≈ 14% pada 2025): pengalaman pertama adalah hambatan utama.'
      : usia === '25-34' ? 'Usia 25–34: TPT nasional jauh lebih rendah dari kelompok muda; fokus pada penguatan keahlian spesifik.'
      : 'Usia 35+: TPT rendah, tetapi risiko beralih ke kerja informal; sertifikasi dan jejaring lebih berpengaruh.',
  ];
  const lebihRendah = r.nb.map((i) => d.regions[i]).filter((x) => !x.art && x.tpt < r.tpt).sort((a, b) => a.tpt - b.tpt).slice(0, 3);
  const langkah = [
    `Daftar di kanal resmi (SIAPKerja Kemnaker dan bursa kerja daerah) dan pantau Disnaker ${shortName(r.n)}.`,
    `Fokus sektor: ${sek.slice(0, 3).map((x) => x.s.nama.split(',')[0].split(';')[0]).join(', ')}.`,
    lebihRendah.length ? `Pertimbangkan jangkauan komuter ke ${lebihRendah.map((x) => shortName(x.n)).join(', ')} (TPT lebih rendah, tetangga terdekat).` : 'Tetangga terdekat tidak punya TPT yang jauh lebih rendah; pertimbangkan kerja jarak jauh atau pelatihan.',
    edu === 'Sarjana' || edu === 'Diploma' ? 'Tambahkan satu sertifikasi keahlian dan satu proyek nyata untuk portofolio.' : 'Ikuti pelatihan kerja (BLK/Kartu Prakerja) pada keahlian teknis yang bisa dibuktikan.',
  ];
  return { konteks, sektor: sek, hambatan: hambatanWilayah(r, nat), tetangga: lebihRendah, langkah };
}

/* ------------------------------ penyelenggara pelatihan ------------------------------ */
export type Program = 'vokasi' | 'digital' | 'dasar' | 'perempuan';
export const PROGRAM_LABEL: Record<Program, string> = { vokasi: 'Vokasi industri & konstruksi', digital: 'Digital & jasa profesional', dasar: 'Keterampilan dasar & literasi', perempuan: 'Akses kerja perempuan' };
export function skorPelatihan(r: Region, prog: Program): number {
  if (r.art) return 0;
  const gap = Math.max(0, r.tp - r.tl);
  const base = r.est;
  const f = prog === 'vokasi' ? (r.tip === 'Peralihan' ? 1 : r.tip === 'Kota inti' ? 0.8 : 0.5) * (r.rls >= 8 ? 1 : 0.6)
    : prog === 'digital' ? (r.tip === 'Kota inti' ? 1 : r.tip === 'Peralihan' ? 0.6 : 0.25) * (r.rls >= 9 ? 1 : 0.5)
    : prog === 'dasar' ? (r.rls < 8.2 ? 1 : 0.3) * (r.tip === 'Pinggiran agraris' ? 1 : 0.7)
    : Math.min(1.5, gap / 2);
  return base * f * (r.lisa === 'HH' ? 1.25 : 1) * (r.tpt / 4);
}
export function resepPelatihanText(r: Region, prog: Program): string {
  const x = r;
  switch (prog) {
    case 'vokasi': return `${approx(x.est)} penganggur (estimasi), tipologi ${x.tip.toLowerCase()}, sekolah rata-rata ${n1(x.rls)} th: cocok untuk kelas teknik, las, listrik, logistik.`;
    case 'digital': return `${x.tip}, sekolah ${n1(x.rls)} th, TPT ${pct(x.tpt)}: cocok untuk administrasi digital, data, pemasaran daring.`;
    case 'dasar': return `Sekolah ${n1(x.rls)} th dan kemiskinan ${pct(x.p0)}: cocok untuk literasi, keterampilan terapan, kewirausahaan mikro.`;
    case 'perempuan': return `TPT perempuan ${pct(x.tp)} vs laki-laki ${pct(x.tl)}: cocok untuk kelas fleksibel, penitipan anak, kerja jarak jauh.`;
  }
}
export const ROLE_LABEL: Record<Role, string> = { pemda: 'Pemerintah daerah', pencari: 'Pencari kerja', pelatihan: 'Penyelenggara pelatihan' };
