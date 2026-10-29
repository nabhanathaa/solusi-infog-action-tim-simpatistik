import type { AppData, Region, Role } from './types';
import { n1, n0, n2, pct, shortName, plainName, approx, compact } from './format';
import { alertFor, zoneFor, resepPemda, resepPencari, skorPelatihan, PROGRAM_LABEL, type Edu, type Usia, type Program } from './reco';
import { simulasi } from './sim';
import { C } from './colors';

/* Asisten "Tanya Data": mesin aturan yang berjalan di peramban (tanpa model bahasa, tanpa server).
   Setiap jawaban dihitung dari data aplikasi dan menyebut sumber/batasnya, jadi tidak bisa "mengarang". */

export interface Card { k: string; v: string; s?: string; c?: string }
export interface Bar { label: string; v: number; txt: string; c?: string }
export interface Answer {
  text: string; ids?: number[]; link?: { label: string; hash: string }; chips?: string[];
  cards?: Card[]; bars?: Bar[]; steps?: string[]; src?: string;
}
/** Ingatan percakapan: daerah terakhir yang dibahas, agar pertanyaan lanjutan ("rekomendasinya?") bisa dijawab. */
export interface Ctx { last: Region[]; role: Role }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (nq: string, re: RegExp) => re.test(nq);

const PROVS: Record<string, string> = {};
function provIndex(d: AppData) {
  if (Object.keys(PROVS).length) return;
  for (const r of d.regions) PROVS[norm(r.pv)] = r.pv;
  const alias: Record<string, string> = { jabar: 'Jawa Barat', jatim: 'Jawa Timur', jateng: 'Jawa Tengah', sumut: 'Sumatera Utara', sumbar: 'Sumatera Barat', sumsel: 'Sumatera Selatan', kalbar: 'Kalimantan Barat', kaltim: 'Kalimantan Timur', kalsel: 'Kalimantan Selatan', kalteng: 'Kalimantan Tengah', sulsel: 'Sulawesi Selatan', sulut: 'Sulawesi Utara', sulteng: 'Sulawesi Tengah', sultra: 'Sulawesi Tenggara', dki: 'DKI Jakarta', jakarta: 'DKI Jakarta', diy: 'DI Yogyakarta', jogja: 'DI Yogyakarta', yogyakarta: 'DI Yogyakarta', ntt: 'Nusa Tenggara Timur', ntb: 'Nusa Tenggara Barat', babel: 'Kepulauan Bangka Belitung', kepri: 'Kepulauan Riau' };
  for (const [k, v] of Object.entries(alias)) { const real = d.regions.find((r) => norm(r.pv) === norm(v)); if (real) PROVS[k] = real.pv; }
}
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return dp[b.length];
}
const NOT_NAME = new Set('timur barat utara selatan tengah tenggara daya jawa kota kabupaten kerja sektor siaga ambang digital vokasi pelatihan tertinggi terendah ringkasan rekomendasi simulasi industri pertanian triliun miliar kenapa mengapa tetangga provinsi indonesia nasional klaster lulusan sarjana status'.split(' '));
function findRegions(q: string, d: AppData, fuzzy = true): Region[] {
  const nq = ' ' + norm(q) + ' ';
  const wantKota = /\bkota\b/.test(nq), wantKab = /\bkab(upaten)?\b/.test(nq);
  let hits = d.regions.filter((r) => { const nm = ' ' + norm(plainName(r.n)) + ' '; return nm.length > 4 && nq.includes(nm); });
  if (hits.length === 0 && fuzzy) {
    // toleransi salah ketik: "surabya", "bandug"
    const toks = norm(q).split(' ').filter((t) => t.length >= 5 && !NOT_NAME.has(t));
    hits = d.regions.filter((r) => { const nt = norm(plainName(r.n)).split(' '); return nt.length === 1 && toks.some((t) => lev(t, nt[0]) <= (nt[0].length >= 7 ? 2 : 1)); });
  }
  let h = hits;
  if (wantKota && !wantKab) h = h.filter((r) => r.j === 'Kota');
  if (wantKab && !wantKota) h = h.filter((r) => r.j !== 'Kota');
  if (h.length === 0) h = hits;
  // pilih yang paling spesifik dan buang nama yang hanya potongan nama lain ("Barat" di dalam "Bandung Barat")
  const maxLen = Math.max(0, ...h.map((r) => plainName(r.n).length));
  h = h.filter((r) => !h.some((o) => o !== r && plainName(o.n).length > plainName(r.n).length && norm(plainName(o.n)).includes(norm(plainName(r.n)))));
  return h.filter((r) => plainName(r.n).length >= maxLen - 3 || h.length <= 2).slice(0, 6);
}
function findProv(q: string, d: AppData): string | null {
  provIndex(d); const nq = ' ' + norm(q) + ' ';
  let best: string | null = null, len = 0;
  for (const [k, v] of Object.entries(PROVS)) if (nq.includes(' ' + k + ' ') && k.length > len) { best = v; len = k.length; }
  return best;
}
const ISLANDS = ['Sumatera', 'Jawa', 'Bali', 'Kalimantan', 'Sulawesi', 'Maluku', 'Papua', 'Nusa Tenggara'];
const sekName = (n: string) => n.split(',')[0].split(';')[0].replace(/ dan .*$/, '').replace(/^Penyediaan |^Pengadaan /, '');

function regionCards(r: Region, d: AppData): Card[] {
  const a = alertFor(r, d.nat);
  return [
    { k: 'TPT Agu 2024', v: pct(r.tpt), s: `median ${pct(d.nat.profil.semua.tpt)}`, c: r.tpt > d.nat.profil.semua.tpt ? C.red : C.teal },
    { k: 'Status', v: a.label, c: a.color },
    { k: 'Klaster', v: r.lisa === 'ns' ? 'tak signifikan' : r.lisa, s: r.tip.toLowerCase() },
    { k: 'Penganggur', v: approx(r.est), s: 'estimasi kasar' },
  ];
}
function summarize(r: Region, d: AppData): string {
  const a = alertFor(r, d.nat); const z = zoneFor(r);
  return `${r.n} (${r.pv}). ${z.title}${r.art ? '; data diragukan' : ''}. Status ${a.label.toLowerCase()}: ${a.why}`;
}

const DEF: [RegExp, string][] = [
  [/\btpt\b|tingkat pengangguran terbuka|apa itu pengangguran/, 'TPT (Tingkat Pengangguran Terbuka) = penganggur ÷ angkatan kerja × 100%. Penganggur terbuka menurut BPS: tidak bekerja dan sedang mencari kerja, menyiapkan usaha, putus asa, atau sudah diterima tetapi belum mulai bekerja. Angkatan kerja = penduduk usia 15+ yang bekerja atau menganggur.'],
  [/\blisa\b|local moran|moran/, 'LISA (Local Indicators of Spatial Association, Local Moran) menguji apakah TPT sebuah daerah mirip dengan rata-rata 6 tetangga terdekatnya, lebih dari yang diharapkan secara acak (9.999 permutasi). Hasilnya: HH (tinggi dikelilingi tinggi), LL (rendah dikelilingi rendah), HL/LH (pencilan), atau tidak signifikan. Mengelompok tidak berarti menular.'],
  [/\b(hh|ll|hl|lh)\b|klaster tinggi|klaster rendah|pencilan/, 'HH = TPT tinggi dan tetangga juga tinggi (klaster pengangguran). LL = rendah dikelilingi rendah. HL = tinggi di tengah tetangga rendah (masalah cenderung lokal). LH = rendah di tengah tetangga tinggi (waspadai limpahan pencari kerja). Semua pada tingkat signifikansi 5%.'],
  [/tipologi|kota inti|peralihan|pinggiran/, 'Tipologi = pengelompokan K-means (k = 3) dari enam indikator: TPT, selisih gender, lama sekolah, PDRB per kapita, kemiskinan, kepadatan. Hasilnya Kota inti, Peralihan, dan Pinggiran agraris. Labelnya deskriptif (silhouette 0,34), bukan kelas yang pasti.'],
  [/indeks kewaspadaan|skor kewaspadaan|indeks/, 'Indeks Kewaspadaan 0–100 = gabungan persentil: TPT 30%, estimasi jumlah penganggur 25%, TPT tetangga 15%, selisih TPT perempuan–laki-laki 10%, kemiskinan 10%, klaster HH 10%. Bobot ditetapkan tim (heuristik transparan), bukan hasil estimasi model.'],
  [/siaga|ambang|waspada|pantau|relatif aman|status/, 'Empat status meniru pola peringatan dini (seperti Normal–Waspada–Siaga–Awas). Siaga merah = klaster HH dan TPT ≥ ambang (bawaan 6%, ≈1,2× TPT nasional, persentil ke-81). Waspada = HH, indeks ≥ 70, atau TPT ≥ ambang+1,5. Pantau = TPT atau rata-rata tetangga ≥ ambang, atau pencilan HL. Sisanya relatif aman. Penjelasan lengkap ada di Radar.'],
  [/pengganda|multiplier|input output|leontief/, 'Pengganda kerja (tabel Input-Output BPS 2020) = jumlah orang yang bekerja, langsung dan lewat rantai pasok, untuk setiap Rp1 miliar permintaan akhir di suatu sektor. Contoh: pertanian ≈ 16,8 orang, industri pengolahan ≈ 6,8, real estat ≈ 1,5.'],
];

export function jawab(q: string, d: AppData, ctx: Ctx): Answer {
  const nq = norm(q);
  const prov = findProv(q, d);
  let regs = findRegions(q, d, !prov);
  const isl = ISLANDS.find((i) => nq.includes(i.toLowerCase()));
  const nat = d.nat; const L = nat.lisa as Record<string, number>;
  const isDef = has(nq, /^(apa|apakah|jelaskan|arti|definisi)\b|apa itu|artinya|maksudnya|(kenapa|mengapa) (ambang|empat|4)/);
  const followUp = !isDef && !prov && regs.length === 0 && ctx.last.length > 0 && (has(nq, /\b\w{3,}nya\b|\b(tersebut|daerah ini|sana|situ|tadi)\b/) || (nq.split(' ').length <= 4 && has(nq, /^(rekomendasi|saran|solusi|resep|kenapa|mengapa|tetangga|mirip|langkah)/)));
  if (followUp) regs = ctx.last;
  const one = regs.length === 1 ? regs[0] : null;

  if (/^(halo|hai|hi|pagi|siang|sore|malam|assalam)|bisa apa|bantuan|help|cara pakai/.test(nq)) {
    return { text: 'Halo! Saya membaca langsung data 514 kab/kota di aplikasi ini. Saya bisa meringkas daerah atau provinsi, membuat peringkat, menjelaskan status siaga, memberi rekomendasi per peran, menghitung simulasi investasi → kerja, dan merangkum keluhan warganet.', chips: ['Ringkasan Jawa Barat', 'Rekomendasi untuk Kota Bekasi', 'Simulasi Rp1 triliun di industri', 'Apa itu LISA?'] };
  }

  // 1. simulasi investasi
  const num = nq.match(/(\d+(?:[.,]\d+)?)\s*(t|triliun|trilyun|m|miliar|milyar|juta)\b/);
  if (num && has(nq, /investasi|simulasi|dana|anggaran|belanja|suntik|rp|kerja|serap|di /)) {
    const v = parseFloat(num[1].replace(',', '.'));
    const miliar = /^t/.test(num[2]) ? v * 1000 : num[2] === 'juta' ? v / 1000 : v;
    const sek = nat.io.sektor;
    const hit = sek.filter((s) => norm(s.nama).split(' ').some((w) => w.length > 4 && nq.includes(w)));
    const pick = hit.length ? hit : sek;
    const out = simulasi(sek, { alokasi: Object.fromEntries(pick.map((s) => [s.nama, 1])), totalMiliar: miliar, inflasi: 0.18, kapture: 0.5 });
    const target = one ?? null;
    return {
      text: `Investasi Rp${miliar >= 1000 ? n1(miliar / 1000) + ' triliun' : n0(miliar) + ' miliar'} ${hit.length ? 'di ' + pick.map((s) => sekName(s.nama).toLowerCase()).join(', ') : 'dibagi rata ke 17 sektor'} diperkirakan menopang sekitar ${compact(out.total)} pekerjaan (langsung ${compact(out.langsung)}, sisanya lewat rantai pasok).${target ? ` Bila separuh efeknya tinggal di ${shortName(target.n)}, itu setara ${n1((out.efekLokal / Math.max(target.est, 1)) * 100)}% penganggurnya.` : ''}`,
      cards: [{ k: 'Total kerja', v: compact(out.total), c: C.blue }, { k: 'Langsung', v: compact(out.langsung) }, { k: 'Upah rata-rata', v: out.upahRata ? n1(out.upahRata) + ' jt' : '–', s: 'per bulan' }],
      bars: pick.length <= 6 ? undefined : [...out.perSektor].sort((a, b) => b.total - a.total).slice(0, 5).map((x) => ({ label: sekName(x.nama), v: x.total, txt: compact(x.total), c: C.blue })),
      src: 'Tabel IO BPS 2020, harga disesuaikan inflasi 18% (2020→2026). Potensi, bukan janji penyerapan.',
      link: { label: 'Atur sendiri di Simulator', hash: '#/simulator' + (target ? `?w=${target.id}` : '') }, chips: ['Bandingkan dengan pertanian', 'Sektor dengan upah tertinggi'],
    };
  }

  // 2. definisi
  if (isDef && !one) {
    const hitDef = DEF.find(([re]) => re.test(nq));
    if (hitDef) return { text: hitDef[1], chips: ['Apa itu LISA?', 'Kenapa ambang siaga 6%?', 'Apa itu pengganda kerja?'] };
  }

  // 3. lokasi pelatihan
  if (has(nq, /pelatihan|kelas|blk|kursus|training/) && !one) {
    const prog: Program = /digital|it|teknologi|komputer/.test(nq) ? 'digital' : /perempuan|wanita|ibu/.test(nq) ? 'perempuan' : /dasar|literasi/.test(nq) ? 'dasar' : 'vokasi';
    let pool = d.regions; if (prov) pool = pool.filter((r) => r.pv === prov); else if (isl) pool = pool.filter((r) => r.pl.includes(isl));
    const top = pool.map((r) => ({ r, s: skorPelatihan(r, prog) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
    const max = top[0]?.s ?? 1;
    return { text: `Lokasi paling dibutuhkan untuk program ${PROGRAM_LABEL[prog].toLowerCase()}${prov ? ' di ' + prov : isl ? ' di ' + isl : ''}:`, bars: top.map((x) => ({ label: shortName(x.r.n), v: x.s / max, txt: approx(x.r.est), c: C.teal })), ids: top.map((x) => x.r.id), src: 'Skor = estimasi penganggur × kecocokan program dengan tipologi dan lama sekolah × bobot TPT.', link: { label: 'Buka Kompas pelatihan', hash: '#/kompas?r=pelatihan' }, chips: ['Pelatihan digital di Jawa Timur', 'Pelatihan perempuan di Jawa Barat'] };
  }

  // 4. rekomendasi untuk satu daerah
  if (one && has(nq, /rekomendasi|saran|solusi|resep|apa yang (harus|perlu|bisa)|langkah|kebijakan|program|lowongan|cari kerja|lulusan|sektor/)) {
    const asPencari = has(nq, /pencari|cari kerja|lulusan|saya|aku|lowongan|melamar|fresh/) || (ctx.role === 'pencari' && !has(nq, /pemda|kebijakan/));
    if (asPencari) {
      const edu: Edu = /\bsd\b/.test(nq) ? 'SD' : /\bsmp\b/.test(nq) ? 'SMP' : /\bsmk\b/.test(nq) ? 'SMK' : /\bsma\b/.test(nq) ? 'SMA' : /\bd[1-4]\b|diploma/.test(nq) ? 'Diploma' : /\bs[1-3]\b|sarjana|kuliah|kampus/.test(nq) ? 'Sarjana' : 'SMA';
      const age = nq.match(/\b(1[5-9]|[2-6]\d)\s*(th|tahun)?\b/); const a = age ? Number(age[1]) : 22;
      const usia: Usia = a < 25 ? '15-24' : a < 35 ? '25-34' : '35+';
      const res = resepPencari(one, edu, usia, d);
      return { text: `Untuk pencari kerja lulusan ${edu}, usia ${usia.replace('-', '–')}, di ${shortName(one.n)}:\n${res.konteks.slice(1).join(' ')}`, bars: res.sektor.slice(0, 4).map((s) => ({ label: sekName(s.s.nama), v: s.skor / res.sektor[0].skor, txt: n1(s.s.upah_juta) + ' jt', c: C.teal })), steps: res.langkah, ids: [one.id], src: 'Sektor diurutkan dari pengganda kerja dan upah nasional × kecocokan tipologi (heuristik), bukan data lowongan.', link: { label: 'Buka Kompas pencari kerja', hash: `#/kompas?r=pencari&w=${one.id}` }, chips: [`Kenapa status ${shortName(one.n)}?`, `Tetangga ${plainName(one.n)}`] };
    }
    const rx = resepPemda(one, d).slice(0, 3);
    return { text: `Resep kebijakan untuk ${shortName(one.n)} (diurutkan dari prioritas):`, steps: rx.map((x) => `${x.judul}: ${x.aksi} (bukti: ${x.alasan.join('; ')})`), cards: regionCards(one, d).slice(0, 3), ids: [one.id], link: { label: 'Buka Kartu Alamat', hash: `#/peta?w=${one.id}` }, chips: [`Rekomendasi ${plainName(one.n)} untuk lulusan SMK`, `Simulasi Rp500 miliar di industri untuk ${plainName(one.n)}`] };
  }

  // 5. mengapa status siaga
  if (one && has(nq, /kenapa|mengapa|alasan|kok/)) {
    const a = alertFor(one, nat);
    return { text: `${shortName(one.n)} berstatus ${a.label.toLowerCase()} karena: ${a.why}\n\nTPT ${pct(one.tpt)}, rata-rata 6 tetangga ${one.lag != null ? pct(one.lag) : '–'}, klaster ${one.lisa === 'ns' ? 'tidak signifikan' : one.lisa}, indeks kewaspadaan ${one.skor != null ? n1(one.skor) : '–'}.`, cards: regionCards(one, d), ids: [one.id], link: { label: 'Lihat aturan lengkap di Radar', hash: '#/radar' }, chips: [`Rekomendasi untuk ${plainName(one.n)}`, 'Kenapa ambang siaga 6%?'] };
  }

  // 6. tetangga / mirip
  if (one && has(nq, /tetangga|sekitar|dekat|komuter/)) {
    const nb = one.nb.map((i) => d.regions[i]);
    return { text: `Enam tetangga terdekat ${shortName(one.n)} (TPT ${pct(one.tpt)}):`, bars: nb.map((x) => ({ label: shortName(x.n), v: x.tpt, txt: pct(x.tpt), c: x.tpt > one.tpt ? C.red : C.teal })), ids: nb.map((x) => x.id), link: { label: 'Lihat di peta', hash: `#/peta?w=${one.id}` } };
  }
  if (one && has(nq, /mirip|serupa|sama seperti|belajar dari/)) {
    const m = one.mirip.map((i) => d.regions[i]);
    return { text: `Daerah dengan profil paling mirip ${shortName(one.n)} (enam indikator), cocok untuk saling belajar kebijakan:`, bars: m.map((x) => ({ label: `${shortName(x.n)}, ${x.pv}`, v: x.tpt, txt: pct(x.tpt), c: C.blue })), ids: m.map((x) => x.id) };
  }

  // 7. bandingkan
  if (/(bandingkan|banding|vs|versus|dengan|atau)/.test(nq) && regs.length >= 2) {
    const [a, b] = regs; const dif = a.tpt - b.tpt;
    return { text: `${summarize(a, d)}\n\n${summarize(b, d)}\n\nSelisih TPT ${n1(Math.abs(dif))} poin: ${dif > 0 ? shortName(a.n) : shortName(b.n)} lebih tinggi. Perbandingan ini deskriptif; sebabnya perlu data tambahan.`, bars: [a, b].map((x) => ({ label: shortName(x.n), v: x.tpt, txt: pct(x.tpt), c: alertFor(x, nat).color })), ids: [a.id, b.id], link: { label: 'Lihat di peta', hash: `#/peta?w=${a.id}` } };
  }

  // 8. peringkat
  if (/(tertinggi|terendah|ranking|peringkat|paling|terbanyak|terbesar|top)/.test(nq) && !has(nq, /sektor|gaji|upah/)) {
    const asc = /(terendah|paling rendah|paling kecil)/.test(nq);
    const metric = /\bpenganggur\b|jumlah|orang|terbanyak/.test(nq) ? 'est' : /(waspada|kewaspadaan|risiko|prioritas|siaga)/.test(nq) ? 'skor' : 'tpt';
    let pool = d.regions.filter((r) => !r.art || metric === 'est');
    if (prov) pool = pool.filter((r) => r.pv === prov); else if (isl) pool = pool.filter((r) => r.pl.toLowerCase().includes(isl.toLowerCase()));
    if (/\bkota\b/.test(nq)) pool = pool.filter((r) => r.j === 'Kota'); else if (/\bkabupaten\b/.test(nq)) pool = pool.filter((r) => r.j !== 'Kota');
    if (metric === 'skor') pool = pool.filter((r) => r.skor != null);
    const get = (r: Region) => (metric === 'est' ? r.est : metric === 'skor' ? (r.skor as number) : r.tpt);
    const top = [...pool].sort((a, b) => (asc ? get(a) - get(b) : get(b) - get(a))).slice(0, 5);
    const lbl = metric === 'est' ? 'estimasi jumlah penganggur' : metric === 'skor' ? 'indeks kewaspadaan' : 'TPT';
    const fmt = (r: Region) => (metric === 'est' ? approx(r.est) : metric === 'skor' ? n1(r.skor as number) : pct(r.tpt));
    const scope = prov ? ' di ' + prov : isl ? ' di ' + isl : /\bkota\b/.test(nq) ? ' (98 kota)' : /\bkabupaten\b/.test(nq) ? ' (kabupaten)' : ' (514 kab/kota)';
    return { text: `${asc ? 'Terendah' : 'Tertinggi'} menurut ${lbl}${scope}:`, bars: top.map((r) => ({ label: shortName(r.n) + (prov ? '' : ', ' + r.pv), v: get(r), txt: fmt(r), c: asc ? C.teal : C.red })), ids: top.map((r) => r.id), src: metric === 'tpt' ? 'TPT Agustus 2024 (Sakernas). Tinggi di satu periode tidak otomatis berarti "daerah buruk".' : metric === 'est' ? 'Estimasi = penduduk × 54% × TPT (proksi kasar).' : undefined, link: { label: 'Tampilkan di peta', hash: `#/peta?l=${metric === 'skor' ? 'skor' : 'tpt'}${prov ? '&p=' + encodeURIComponent(prov) : ''}` }, chips: top[0] ? [`Kenapa status ${plainName(top[0].n)}?`, `Rekomendasi untuk ${plainName(top[0].n)}`] : undefined };
  }

  // 9. klaster
  if (/(klaster|cluster|hotspot|mengelompok)/.test(nq)) {
    let pool = d.regions.filter((r) => r.lisa === 'HH');
    if (prov) pool = pool.filter((r) => r.pv === prov); else if (isl) pool = pool.filter((r) => r.pl.toLowerCase().includes(isl.toLowerCase()));
    const pop = pool.reduce((a, r) => a + r.pop, 0);
    return { text: `${pool.length} kab/kota berada di klaster tinggi (HH) signifikan${prov ? ' di ' + prov : isl ? ' di ' + isl : ''}${pool.length ? ', dihuni ± ' + n1(pop / 1e6) + ' juta orang' : ''}.${pool.length ? ' Contoh: ' + pool.sort((a, b) => b.pop - a.pop).slice(0, 5).map((r) => shortName(r.n)).join(', ') + '.' : ''}`, cards: [{ k: 'HH nasional', v: String(L.HH_p05), s: `${L.HH_fdr} lolos FDR · ${L.HH_robust} stabil` }, { k: 'Penduduk di HH', v: n1(Number(L.HH_pct_penduduk)) + '%' }, { k: 'Moran I', v: n2(Number(L.moran_I_k6)), s: 'p < 0,001' }], ids: pool.slice(0, 30).map((r) => r.id), link: { label: 'Lihat peta klaster', hash: '#/peta?l=lisa' } };
  }

  // 10. sektor
  if (has(nq, /sektor|lapangan usaha|industri apa|gaji|upah|bayaran/)) {
    const byUpah = has(nq, /gaji|upah|layak|bayaran/);
    const sek = [...nat.io.sektor].sort((a, b) => (byUpah ? b.upah_juta - a.upah_juta : b.pengganda - a.pengganda)).slice(0, 6);
    return { text: byUpah ? 'Sektor dengan upah rata-rata buruh tertinggi (BRS Sakernas Feb 2026; rata-rata nasional 3,29 juta):' : 'Sektor yang paling banyak menciptakan kerja per Rp1 miliar permintaan akhir (tabel IO 2020):', bars: sek.map((s) => ({ label: sekName(s.nama), v: byUpah ? s.upah_juta : s.pengganda, txt: byUpah ? n1(s.upah_juta) + ' jt' : n1(s.pengganda) + ' org', c: byUpah ? C.teal : C.blue })), src: 'Sektor yang menyerap banyak kerja cenderung berupah rendah. Industri pengolahan berada di persimpangan: penggandanya tepat di median dan upahnya tepat di rata-rata.', chips: [byUpah ? 'Sektor paling padat karya' : 'Sektor dengan upah tertinggi', 'Simulasi Rp1 triliun di industri'] };
  }

  // 11. suara warganet
  if (has(nq, /keluh|warganet|netizen|komentar|sentimen|youtube|publik|opini/)) {
    const s = d.sent; const rows = Object.entries(s.tema).sort((a, b) => b[1]['% komentar'] - a[1]['% komentar']);
    return { text: `Dari ${n0(s.n_dianalisis ?? 0)} komentar YouTube yang relevan, sekitar dua dari tiga bernada negatif. Keluhan per tema:`, bars: rows.map(([k, v]) => ({ label: k.replace(/^T\d\s*/, ''), v: v['% komentar'], txt: n1(v['% komentar']) + '%', c: C.red })), src: 'Satu komentar bisa memuat lebih dari satu tema. Percakapan daring, bukan survei.', link: { label: 'Buka Suara publik', hash: '#/suara' } };
  }

  // 12. ringkasan provinsi
  if (prov && !one) {
    const pool = d.regions.filter((r) => r.pv === prov && !r.art);
    const t = pool.map((r) => r.tpt).sort((a, b) => a - b); const med = t[Math.floor(t.length / 2)] ?? 0;
    const est = pool.reduce((s, r) => s + r.est, 0); const hh = pool.filter((r) => r.lisa === 'HH').length;
    const lv = (l: string) => pool.filter((r) => alertFor(r, nat).level === l).length;
    const top = [...pool].sort((a, b) => b.tpt - a.tpt).slice(0, 4);
    return { text: `${prov}: ${pool.length} kab/kota, median TPT ${pct(med)} (nasional kab/kota ${pct(nat.profil.semua.tpt)}), ${hh} di klaster HH. Tertinggi:`, cards: [{ k: 'Siaga merah', v: String(lv('merah')), c: C.red }, { k: 'Waspada', v: String(lv('oranye')), c: C.orange }, { k: 'Pantau', v: String(lv('kuning')), c: C.gold }, { k: 'Penganggur', v: approx(est), s: 'estimasi' }], bars: top.map((r) => ({ label: shortName(r.n), v: r.tpt, txt: pct(r.tpt), c: alertFor(r, nat).color })), ids: top.map((r) => r.id), link: { label: 'Saring peta ke ' + prov, hash: `#/peta?p=${encodeURIComponent(prov)}` }, chips: [`Pelatihan digital di ${prov}`, `Klaster di ${prov}`] };
  }

  // 13. ringkasan satu daerah
  if (regs.length) {
    if (one) return { text: summarize(one, d), cards: regionCards(one, d), ids: [one.id], link: { label: 'Buka Kartu Alamat', hash: `#/peta?w=${one.id}` }, chips: [`Rekomendasi untuk ${plainName(one.n)}`, `Tetangga ${plainName(one.n)}`, `Bandingkan ${plainName(one.n)} dengan ${plainName(d.regions[one.mirip[0]].n)}`] };
    return { text: 'Ada beberapa nama yang cocok. Pilih salah satu:', chips: regs.map((r) => r.n), ids: regs.map((r) => r.id) };
  }

  // 14. angka nasional, proyeksi, kelompok
  if (/(prediksi|ramal|forecast|proyeksi|2027|2028|ke depan)/.test(nq)) {
    const l = nat.forecast[nat.forecast.length - 1];
    return { text: `Proyeksi TPT nasional ${l.periode}: median ${pct(l.median, 2)}, interval 80% ${pct(l.lo80, 2)}–${pct(l.hi80, 2)}. Pada uji ke belakang tidak ada model yang meyakinkan mengalahkan tebakan naif, jadi yang bermakna adalah rentangnya, bukan satu angka.`, cards: [{ k: 'Median', v: pct(l.median, 2) }, { k: 'Interval 80%', v: `${n1(l.lo80)}–${n1(l.hi80)}%` }], link: { label: 'Buka Radar', hash: '#/radar' } };
  }
  if (/(muda|remaja|umur|usia|gen z)/.test(nq)) {
    const u = nat.umur; const i = u.tahun.length - 1;
    const rows = Object.entries(u.kelompok).slice(0, 6);
    return { text: `TPT menurut umur, ${u.tahun[i]}: kelompok muda jauh di atas rata-rata. Transisi sekolah-ke-kerja adalah titik paling rawan.`, bars: rows.map(([k, v]) => ({ label: k + ' th', v: v[i], txt: pct(v[i]), c: v[i] > 10 ? C.red : C.blue })) };
  }
  if (/(sarjana|universitas|lulusan|pendidikan|ijazah)/.test(nq)) {
    const f = nat.forecast_univ[nat.forecast_univ.length - 1];
    return { text: `Penganggur lulusan universitas ≈ 0,84 juta (Agustus 2024). Proyeksi median ${f.periode} ≈ ${n1(f.median / 1e6)} juta (interval 80% ${n1(f.lo80 / 1e6)}–${n1(f.hi80 / 1e6)} juta): peluang melewati 1 juta kira-kira seimbang. Porsi penganggur berpendidikan SMA ke atas naik dari kurang dari separuh (2005) menjadi sekitar 69% (2024).`, link: { label: 'Buka Radar', hash: '#/radar' } };
  }
  if (/(nasional|indonesia|angka|berapa|total)/.test(nq)) {
    const t = nat.tpt_terbaru[nat.tpt_terbaru.length - 1];
    return { text: `TPT nasional ${t.p}: ${pct(t.v, 2)} (≈ ${n2(nat.penganggur_feb2026_juta)} juta penganggur; rilis resmi BPS). Di tingkat kab/kota (Agustus 2024) TPT berkisar 0–11,4% dengan median ${pct(nat.profil.semua.tpt)}: rata-rata nasional menyembunyikan sebaran yang lebar.`, cards: nat.tpt_terbaru.map((x) => ({ k: x.p, v: pct(x.v, 2) })) };
  }
  const hitDef = DEF.find(([re]) => re.test(nq));
  if (hitDef) return { text: hitDef[1] };

  return { text: 'Maaf, saya belum menangkap maksudnya. Saya hanya menjawab dari data di aplikasi ini. Coba salah satu contoh berikut, atau sebut nama kab/kota atau provinsi.', chips: ['Ringkasan Jawa Timur', 'Pengangguran tertinggi di kota', 'Rekomendasi untuk Kabupaten Bogor', 'Sektor dengan upah tertinggi', 'Apa keluhan warganet?'] };
}

export function sapaan(role: Role | null): string[] {
  if (role === 'pencari') return ['Saya lulusan SMK di Kota Bekasi, sebaiknya ke sektor apa?', 'Sektor dengan upah tertinggi', 'Pengangguran terendah di Jawa Timur'];
  if (role === 'pelatihan') return ['Pelatihan digital di Jawa Barat', 'Pelatihan vokasi di Sumatera', 'Klaster di Jawa'];
  if (role === 'pemda') return ['Ringkasan Jawa Tengah', 'Kenapa status Kota Cilegon?', 'Simulasi Rp1 triliun di industri untuk Kabupaten Karawang'];
  return ['Berapa TPT nasional?', 'Apa itu LISA?', 'Daerah dengan penganggur terbanyak', 'Apa keluhan warganet?'];
}
