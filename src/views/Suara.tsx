import { useState } from 'react';
import { useApp } from '../lib/store';
import { EmotionBars, ThemeBars } from '../components/Charts';
import { Callout, Pill, Seg } from '../components/ui';
import { n0, n1 } from '../lib/format';
import { C } from '../lib/colors';
import { MonthTrend, SentDonut, WordCloud } from '../components/Sentimen';

const SOLUSI: Record<string, { judul: string; arti: string; pemda: string[]; pencari: string[]; pelatihan: string[] }> = {
  T1: { judul: 'Kelangkaan & persaingan', arti: 'Banyak pelamar untuk sedikit lowongan; terutama di klaster tinggi.', pemda: ['Bursa kerja lintas kabupaten dalam satu klaster', 'Prioritaskan sektor pengganda kerja tinggi (perdagangan, akomodasi, jasa)'], pencari: ['Perluas radius pencarian dan sektor', 'Daftar di banyak kanal resmi sekaligus'], pelatihan: ['Kelas keterampilan yang permintaannya tinggi di sekitar', 'Kolaborasi penempatan dengan pelaku usaha lokal'] },
  T2: { judul: 'Ketidaksesuaian keahlian/ijazah', arti: 'Lulusan merasa kualifikasi tidak cocok dengan yang dicari.', pemda: ['Selaraskan kurikulum SMK/BLK dengan industri setempat', 'Insentif magang bagi perusahaan'], pencari: ['Ambil sertifikasi yang diminta lowongan nyata', 'Bangun portofolio proyek'], pelatihan: ['Rancang kelas bersama perusahaan (kurikulum berbasis kompetensi)', 'Ukur keterserapan lulusan, bukan hanya kehadiran'] },
  T3: { judul: 'Akses informasi & keadilan', arti: 'Lowongan sulit ditemukan, seleksi dianggap tidak adil, atau muncul penipuan.', pemda: ['Satu portal lowongan terpadu dan transparan', 'Kampanye waspada penipuan kerja'], pencari: ['Pakai kanal resmi; jangan bayar untuk melamar', 'Ikuti komunitas alumni dan bursa kerja kampus'], pelatihan: ['Sertakan literasi mencari kerja dan wawancara', 'Hubungkan peserta ke bursa kerja resmi'] },
  T4: { judul: 'Kualitas pekerjaan (upah, kontrak)', arti: 'Pekerjaan ada, tetapi upah rendah atau kontraknya tidak jelas.', pemda: ['Pantau upah dan jaminan sosial, bukan hanya TPT', 'Dorong hilirisasi agar nilai tambah naik'], pencari: ['Bandingkan upah dengan UMK dan rata-rata sektor', 'Prioritaskan kontrak jelas dan jaminan sosial'], pelatihan: ['Arahkan peserta ke sektor berupah layak', 'Latih negosiasi dan literasi kontrak'] },
};

const EMO_ID: Record<string, string> = { anger: 'marah', sadness: 'sedih', fear: 'takut', happy: 'senang', love: 'cinta' };
const tgl = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function WordBars({ rows, color }: { rows: { kata: string; z: number }[]; color: string }) {
  const max = Math.max(...rows.map((r) => r.z), 1);
  return <ol className="wbars">{rows.map((r) => <li key={r.kata}><span>{r.kata}</span><i style={{ width: `${(r.z / max) * 100}%`, background: color }} /><b>{n1(r.z)}</b></li>)}</ol>;
}

export default function Suara() {
  const { data } = useApp();
  const { sent } = data;
  const [k, setK] = useState('T1'); const s = SOLUSI[k];
  const rows = Object.entries(sent.tema).map(([name, t]) => ({ name, v: t['% komentar'], lo: t['CI95 bawah'], hi: t['CI95 atas'], w: t['% berbobot-like'] })).sort((a, b) => b.v - a.v);
  const emo = sent.emosi_tema ? Object.fromEntries(Object.entries(sent.emosi_tema).map(([t, v]) => [t, Object.fromEntries(Object.entries(v).filter(([, p]) => p > 0).map(([e, p]) => [EMO_ID[e] ?? e, p]))])) : null;
  const se = sent.sentimen; const emas = sent.sentimen_emas_300;
  return (
    <div className="page suara">
      <header className="page-head">
        <div className="eyebrow">SUARA PUBLIK</div>
        <h1>Angka resmi menjawab "berapa dan di mana". Warganet menjawab "mengapa terasa sulit".</h1>
        <p className="lead">Kami menguji empat hipotesis hambatan pada komentar publik YouTube yang dianonimkan, lalu memetakan tiap hambatan ke solusi menurut peran.</p>
        {!sent.data_demo && <div className="srcline"><b>{n0(sent.n_dianalisis ?? 0)}</b> komentar relevan dari <b>{sent.n_video}</b> video ({tgl(sent.periode?.[0])} – {tgl(sent.periode?.[1])}), disaring dari {n0(sent.n_mentah ?? 0)} komentar mentah.</div>}
      </header>
      {sent.data_demo && <Callout kind="demo" title="Data ilustrasi">Angka di halaman ini contoh untuk pengembangan tampilan.</Callout>}

      {se && (
        <div className="kpirow">
          <div className="kpi hot"><span>Bernada negatif</span><b>≈ 2 dari 3</b><em>model {n1(se.negatif.mentah)}% · terkoreksi {n1(se.negatif.koreksi)}% · label manual {emas ? n1(emas.negatif) : '–'}%</em></div>
          <div className="kpi"><span>Komentar dianalisis</span><b>{n0(sent.n_dianalisis ?? 0)}</b><em>dari {sent.n_video} video YouTube, {n0(sent.n_mentah ?? 0)} komentar mentah</em></div>
          <div className="kpi"><span>Keluhan terbanyak</span><b>{rows[0]?.name.replace(/^T\d\s*/, '').split(' (')[0]}</b><em>{n1(rows[0]?.v ?? 0)}% komentar (CI 95% {n1(rows[0]?.lo ?? 0)}–{n1(rows[0]?.hi ?? 0)}%), selisihnya tipis dengan tema kedua</em></div>
        </div>
      )}

      {sent.wordcloud && (
        <div className="grid-wc">
          <div className="panel wcpanel">
            <h3>Kata yang paling sering muncul</h3>
            <WordCloud wc={sent.wordcloud} />
            <p className="note">{sent.wordcloud.catatan} Ukuran = jumlah komentar yang memuat kata itu.</p>
          </div>
          <div className="panel">
            <h3>Nada komentar</h3>
            <SentDonut sent={sent} />
          </div>
        </div>
      )}

      {sent.tren_bulanan && (
        <div className="panel">
          <h3>Nada komentar dari bulan ke bulan</h3>
          <MonthTrend rows={sent.tren_bulanan} h={220} />
          <p className="note">Komposisi label model (belum dikoreksi) per bulan unggah komentar, {sent.tren_bulanan[0].b} sampai {sent.tren_bulanan[sent.tren_bulanan.length - 1].b}. Batang abu di bawah menunjukkan banyaknya komentar.</p>
        </div>
      )}

      <div className="grid2">
        <div className="panel">
          <h3>Tema keluhan (% komentar, CI 95%)</h3>
          <ThemeBars rows={rows} demo={sent.data_demo} />
          <p className="note">Tema ditandai dengan kamus kata kunci yang bisa diaudit; satu komentar boleh memuat lebih dari satu tema, jadi totalnya tidak 100%. {sent.pct_tanpa_tema != null && <>{n1(sent.pct_tanpa_tema)}% komentar relevan tidak menyentuh tema mana pun. </>}Garis tipis = interval kepercayaan dengan bootstrap per video, karena komentar dalam satu video saling mirip.</p>
        </div>
        <div className="panel">
          <h3>Kata pembeda: negatif vs positif</h3>
          {sent.kata_negatif && sent.kata_positif ? (
            <div className="wcols">
              <div><h4 style={{ color: C.red }}>Khas komentar negatif</h4><WordBars rows={sent.kata_negatif.slice(0, 10)} color={C.red} /></div>
              <div><h4 style={{ color: C.teal }}>Khas komentar positif</h4><WordBars rows={sent.kata_positif.slice(0, 10)} color={C.teal} /></div>
            </div>
          ) : <p className="note">Belum tersedia.</p>}
          <p className="note">Bukan kata yang paling <i>sering</i>, tetapi yang paling <i>membedakan</i> (log-odds dengan prior Dirichlet, Monroe dkk. 2008; angka = skor z). Kata topik seperti "kerja" dan "gaji" muncul di semua kelas, jadi sengaja dibuang. Keluhan negatif mengarah ke <b>pemerintah, pejabat, PHK, pajak, outsourcing, ijazah</b>; nada positif didominasi doa dan semangat.</p>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Emosi per tema <Pill soft>eksploratif</Pill></h3>
          {emo ? <EmotionBars data={emo} demo={sent.data_demo} /> : <p className="note">Belum tersedia.</p>}
          <p className="note">Marah dominan di semua tema, paling tinggi pada akses informasi dan keadilan (orang dalam, calo, penipuan). {sent.emosi_catatan} Model emosi belum mencapai ambang validasi (macro-F1 0,56), jadi baca sebagai kecenderungan.</p>
        </div>
        <div className="panel">
          <h3>Temuan yang tidak kami duga</h3>
          <div className="find"><b>{n1(sent.pct_janji_19juta ?? 0)}%</b><span>komentar relevan menyebut janji penciptaan "19 juta lapangan kerja". Warganet menilai kebijakan dengan membandingkan janji dan kenyataan.</span></div>
          <div className="find"><b>{n1(sent.pct_emoji_tawa ?? 0)}%</b><span>komentar memakai emoji tertawa 😂🤣, sering sebagai sindiran. Ini alasan kami tidak mengubah emoji menjadi kata "lucu" dan tidak memakai label positif mentah dari model.</span></div>
          <p className="note">Temuan dari pemodelan topik tak terarah (NMF). Disajikan netral, tanpa menilai pihak tertentu.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Dari hambatan ke solusi</h3>
        <Seg<string> label="Tema" value={k} onChange={setK} options={Object.entries(SOLUSI).map(([c, v]) => ({ v: c, l: c + ' ' + v.judul.split(' ')[0] }))} />
        <p className="lead small"><b>{s.judul}.</b> {s.arti}</p>
        <div className="grid3">
          <div><h4>Pemerintah daerah</h4><ul>{s.pemda.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><h4>Pencari kerja</h4><ul>{s.pencari.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><h4>Penyelenggara pelatihan</h4><ul>{s.pelatihan.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
      </div>
      <Callout kind="info" title="Cara kami menjaga kejujuran">
        <ul className="lim">
          <li>Komentar dianonimkan: tanpa nama, ID akun, tautan, atau nomor telepon.</li>
          <li>Model IndoRoBERTa (tanpa pelatihan ulang) diuji pada 300 komentar berlabel manual: macro-F1 sentimen 0,60 (CI 0,52–0,66), di bawah ambang 0,70. Karena itu kami <b>tidak</b> memakai label per komentar; yang dilaporkan hanya proporsi yang dikoreksi dengan matriks kesalahan (adjusted classify-and-count). Intervalnya lebar (negatif {se ? `${n1(se.negatif.lo)}–${n1(se.negatif.hi)}%` : '–'}), maka kami menulis "sekitar dua pertiga".</li>
          <li>Label manual oleh satu penilai; kesepakatan antarpenilai belum diukur.</li>
          <li>Ini percakapan daring, bukan survei: tidak mewakili seluruh pencari kerja. Hanya {n1(sent.cakupan_wilayah_pct ?? 0)}% komentar menyebut wilayah, jadi suara publik tidak dipetakan per daerah.</li>
        </ul>
      </Callout>
    </div>
  );
}
