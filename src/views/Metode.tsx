import { useApp } from '../lib/store';
import { Callout } from '../components/ui';
import { n1, n2 } from '../lib/format';

export default function Metode() {
  const { data } = useApp();
  const { nat } = data;
  const L = nat.lisa as Record<string, number | string>;
  return (
    <div className="page metode">
      <header className="page-head">
        <div className="eyebrow">METODE, DATA, DAN BATAS</div>
        <h1>Bagaimana angka-angka ini dibuat, dan di mana ia berhenti dapat dipercaya</h1>
        <p className="lead">Semua analisis dapat direproduksi dari notebook 01–04. Halaman ini merangkum apa yang dihitung, mengapa, dan keterbatasannya.</p>
      </header>

      <div className="grid2">
        <div className="panel"><h3>1. LISA (Local Moran)</h3>
          <p>514 kabupaten/kota, tetangga k-terdekat (k = 6) pada koordinat sentroid EPSG:3395, bobot baris-terstandarisasi, 9.999 permutasi, koreksi Benjamini–Hochberg FDR 5%. Moran I global = <b>{n2(Number(L.moran_I_k6))}</b> (z = {n1(Number(L.moran_z))}).</p>
          <p>Klaster HH: {String(L.HH_p05)} (p&lt;0,05), {String(L.HH_fdr)} (FDR), {String(L.HH_robust)} (stabil di k = 4/5/6/8). LL: {String(L.LL_p05)} / {String(L.LL_fdr)} / {String(L.LL_robust)}.</p>
          <p className="note">Klaster berarti <i>mengelompok</i>, bukan <i>menular</i>. Kami tidak mengklaim sebab-akibat.</p></div>
        <div className="panel"><h3>2. Tipologi (K-means, k = 3)</h3>
          <p>Fitur: TPT, selisih gender, lama sekolah, PDRB per kapita, kemiskinan, kepadatan (log), kota. Hasil: Kota inti 100, Peralihan 367, Pinggiran agraris 47. Silhouette 0,34; kestabilan bootstrap (ARI) rata-rata 0,79 tetapi persentil-5 hanya 0,36, jadi label <b>deskriptif</b>, bukan kelas yang pasti.</p>
          <p>Klasterisasi 38 provinsi tidak dipakai: 67,8% varians TPT berada di dalam provinsi.</p></div>
        <div className="panel"><h3>3. Deret waktu</h3>
          <p>TPT diturunkan dari angka penganggur dan bekerja, divalidasi terhadap angka resmi BPS. Model local linear trend dengan dummi COVID, ETS teredam, dan naif diuji rolling-origin. Tidak ada yang meyakinkan mengalahkan naif (MASE ≈ 1,8), sehingga yang disajikan adalah interval.</p>
          <p className="note">Seri 1986–1994 memakai definisi lama dan tidak dipakai di grafik.</p></div>
        <div className="panel"><h3>4. Input-Output (Leontief)</h3>
          <p>Tabel IO domestik 2020 (17 produk): A = Z/X, L = (I−A)<sup>−1</sup>, koefisien tenaga kerja dari Sakernas Agustus 2020. Pengganda kerja, keterkaitan ke belakang/depan (Rasmussen–Hirschman), dan kuadran upah dari BRS Sakernas Feb 2026 (rata-rata nasional 3,29 juta).</p>
          <p className="note">Nasional dan berbasis 2020. Perkiraan tingkat daerah memerlukan asumsi (lihat Simulator).</p></div>
        <div className="panel"><h3>5. Sentimen dan tema</h3>
          <p>73.459 komentar YouTube publik (YouTube Data API, 17 kata kunci) → pembersihan, anonimisasi, buang spam dan duplikat → 26.929 komentar relevan dari 316 video. Tema: kamus kata kunci (multi-label) dengan CI bootstrap per video. Sentimen: IndoRoBERTa diuji pada 300 label manual (macro-F1 0,60 &lt; 0,70), sehingga hanya proporsi terkoreksi matriks kesalahan yang dilaporkan. Kata pembeda: log-odds dengan prior Dirichlet. Topik tak terarah: NMF.</p>
          <p className="note">{data.sent.data_demo ? 'Saat ini panel sentimen memakai angka ILUSTRASI.' : 'Panel sentimen memakai hasil analisis sungguhan.'}</p></div>
        <div className="panel"><h3>6. Indeks Kewaspadaan (heuristik)</h3>
          <p>Gabungan persentil enam komponen, skala 0–100, tanpa data sektoral atau deret waktu daerah:</p>
          <table className="tbl"><tbody>{Object.entries(nat.skor_bobot).map(([k, v]) => <tr key={k}><td>{k}</td><td><b>{Math.round(v * 100)}%</b></td></tr>)}</tbody></table>
          <p className="note">Bobot ditetapkan oleh tim berdasarkan pertimbangan kebijakan, bukan hasil estimasi. Uji sensitivitas bobot disarankan sebelum dipakai untuk keputusan nyata.</p></div>
      </div>

      <Callout kind="warn" title="Batas yang perlu diketahui">
        <ul className="lim">
          <li><b>Tahun berbeda:</b> TPT kab/kota Agustus 2024; angka nasional sampai Mei 2026. Jangan mencampurnya dalam satu kalimat tanpa tahun.</li>
          <li><b>Artefak ukur:</b> {nat.jumlah_artefak} kabupaten di Papua dengan TPT ≤ 0,5% diduga artefak sampel kecil dan dikeluarkan dari peringkat.</li>
          <li><b>Estimasi penganggur:</b> penduduk × {Math.round(nat.lfpr_proksi * 100)}% × TPT (proksi kasar angkatan kerja), bukan angka resmi.</li>
          <li><b>Sektor per daerah:</b> belum tersedia; sektor prioritas memakai tabel IO nasional dan arketipe tipologi (asumsi).</li>
          <li><b>Bukan sebab-akibat:</b> pola yang tampak dilaporkan sebagai kecenderungan dan keterkaitan.</li>
          <li><b>Angka nasional terbaru:</b> {nat.catatan_terbaru}</li>
        </ul>
      </Callout>

      <div className="grid2">
        <div className="panel"><h3>Sumber data</h3><ul className="lim"><li>BPS: Sakernas (TPT kab/kota 2024, kelompok umur, pendidikan, lapangan usaha 1986–2024), BRS Sakernas.</li><li>BPS: Tabel Input-Output Indonesia 2020 (transaksi domestik atas dasar harga dasar, 17 produk).</li><li>Batas wilayah 514 kab/kota (GeoJSON), disederhanakan untuk web.</li><li>Komentar publik YouTube (anonim), bila notebook 04 telah dijalankan.</li></ul></div>
        <div className="panel"><h3>Reproduksi dan privasi</h3><ul className="lim"><li>Notebook 01–04 menghasilkan semua berkas di <code>public/data</code> melalui <code>scripts/build_data.py</code>.</li><li>Aplikasi berjalan sepenuhnya di peramban: tidak ada server, tidak ada pelacakan, tidak ada data pribadi yang dikirim.</li><li>Tautan menyimpan pilihan Anda (daerah, peran, lapisan) agar mudah dibagikan.</li></ul></div>
      </div>
      <p className="note center">ACTION 2026 · HMP Sains Data UNESA · Subtema: Turning Insight into Opportunity, Analisis Pengangguran Terbuka untuk Pemerataan Kesempatan Kerja.</p>
    </div>
  );
}
