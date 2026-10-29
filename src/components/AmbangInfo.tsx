import { useMemo } from 'react';
import { useApp } from '../lib/store';
import { alertFor } from '../lib/reco';
import { C } from '../lib/colors';
import { n0, pct } from '../lib/format';

/** Penjelasan asal-usul empat tingkat status siaga dan arti ambang TPT, dihitung langsung dari data. */
export function AmbangInfo({ ambang, open = false }: { ambang: number; open?: boolean }) {
  const { data } = useApp();
  const { regions, nat } = data;
  const valid = useMemo(() => regions.filter((r) => !r.art), [regions]);
  const pctl = (v: number) => Math.round((valid.filter((r) => r.tpt < v).length / valid.length) * 100);
  const above = valid.filter((r) => r.tpt >= ambang).length;
  const natAgu24 = nat.tpt_terbaru.find((x) => x.p === 'Agu 2024')?.v ?? 4.91;
  const count = useMemo(() => {
    const c: Record<string, number> = { merah: 0, oranye: 0, kuning: 0, hijau: 0, abu: 0 };
    regions.forEach((r) => { c[alertFor(r, nat, ambang).level]++; });
    return c;
  }, [regions, nat, ambang]);
  const hh = regions.filter((r) => r.lisa === 'HH').length;
  const RULES = [
    { k: 'merah', l: 'Siaga merah', c: C.red, rule: <>Klaster <b>HH</b> signifikan <b>dan</b> TPT ≥ {pct(ambang)}</>, arti: 'Dua bukti sepakat: angkanya tinggi dan tetangganya juga tinggi. Masalahnya regional, butuh aksi bersama lintas daerah sekarang.' },
    { k: 'oranye', l: 'Waspada', c: C.orange, rule: <>Klaster HH, <b>atau</b> Indeks Kewaspadaan ≥ 70, <b>atau</b> TPT ≥ {pct(ambang + 1.5)}</>, arti: 'Satu bukti kuat sudah ada. Siapkan program dan anggaran sebelum memburuk.' },
    { k: 'kuning', l: 'Pantau', c: C.gold, rule: <>TPT ≥ {pct(ambang)}, <b>atau</b> rata-rata 6 tetangga ≥ {pct(ambang)}, <b>atau</b> pencilan HL</>, arti: 'Sinyal awal. Belum perlu program khusus, tetapi cek lagi tiap rilis Sakernas.' },
    { k: 'hijau', l: 'Relatif aman', c: C.teal, rule: <>Tidak memenuhi aturan mana pun di atas</>, arti: 'TPT dan lingkungan sekitar di bawah ambang. "Aman" soal jumlah, belum tentu soal kualitas kerja.' },
  ];
  return (
    <details className="ambang" open={open}>
      <summary><span>Dari mana empat status siaga ini, dan mengapa ambangnya {pct(ambang)}?</span><em>Penjelasan</em></summary>
      <div className="amb-body">
        <div className="amb-cols">
          <div>
            <h4>Mengapa empat tingkat?</h4>
            <p>Kami meniru pola peringatan dini yang sudah akrab di Indonesia, misalnya status gunung api <i>Normal, Waspada, Siaga, Awas</i>: empat tingkat cukup untuk memisahkan <b>bertindak sekarang</b>, <b>bersiap</b>, <b>memantau</b>, dan <b>rutin</b>, tanpa terlalu banyak kategori yang membingungkan. Status ini <b>dirancang tim</b>, bukan klasifikasi resmi BPS.</p>
            <h4>Dua bukti yang digabung</h4>
            <ol>
              <li><b>Besaran</b>: TPT kab/kota (Sakernas Agustus 2024) dibandingkan ambang.</li>
              <li><b>Pola ruang</b>: hasil LISA. HH berarti daerah ini dan tetangganya sama-sama tinggi secara signifikan (p &lt; 0,05; {hh} kab/kota).</li>
            </ol>
          </div>
          <div>
            <h4>Mengapa ambang bawaan 6%?</h4>
            <ul>
              <li>Sekitar <b>1,2 kali</b> TPT nasional pada periode yang sama (Agustus 2024: {pct(natAgu24, 2)}).</li>
              <li>Hanya ±{100 - pctl(6)}% kab/kota yang mencapainya (persentil ke-{pctl(6)} dari {valid.length} kab/kota), jadi status siaga tetap selektif.</li>
              <li>Ambang+1,5 poin ({pct(7.5)}) setara persentil ke-{pctl(7.5)}: hanya kasus yang jelas menonjol.</li>
            </ul>
            <div className="amb-now">Ambang yang sedang dipakai <b>{pct(ambang)}</b> = persentil ke-{pctl(ambang)}; {n0(above)} kab/kota berada di atasnya. Geser slider untuk menguji kepekaan.</div>
          </div>
        </div>
        <h4>Aturan diperiksa dari atas; aturan pertama yang cocok menentukan status</h4>
        <div className="amb-rules">
          {RULES.map((x) => (
            <div key={x.k} className="amb-rule" style={{ '--ac': x.c } as React.CSSProperties}>
              <div className="amb-h"><i /><b>{x.l}</b><span>{count[x.k]} kab/kota</span></div>
              <div className="amb-if">{x.rule}</div>
              <p>{x.arti}</p>
            </div>
          ))}
        </div>
        <p className="note">Abu-abu "Data diragukan" ({count.abu} kab/kota): TPT ≤ 0,5%, kemungkinan artefak sampel kecil, sehingga tidak diberi status. Indeks Kewaspadaan 0–100 menggabungkan persentil TPT (30%), estimasi jumlah penganggur (25%), TPT tetangga (15%), selisih gender (10%), kemiskinan (10%), dan klaster HH (10%). Status ini memotret kondisi Agustus 2024, bukan ramalan per daerah.</p>
      </div>
    </details>
  );
}
