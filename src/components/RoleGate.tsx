import { useEffect, useRef } from 'react';
import { useApp } from '../lib/store';
import { n2 } from '../lib/format';
import type { RoleChoice } from '../lib/types';

const OPSI: { v: RoleChoice; t: string; d: string; dapat: string[]; ic: string }[] = [
  { v: 'pemda', t: 'Pemerintah daerah', d: 'Bappeda, Disnaker, perencana', dapat: ['Antrean prioritas kab/kota', 'Status siaga + alasannya', 'Resep kebijakan per daerah'], ic: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6' },
  { v: 'pencari', t: 'Pencari kerja', d: 'Lulusan baru, korban PHK, pekerja muda', dapat: ['Sektor yang layak dilirik', 'Hambatan paling mungkin', 'Daerah komuter dengan TPT lebih rendah'], ic: 'M10 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 21a7 7 0 0 1 14 0M17 8l2 2 4-4' },
  { v: 'pelatihan', t: 'Penyelenggara pelatihan', d: 'BLK, kampus, LSM, perusahaan', dapat: ['Lokasi kelas paling dibutuhkan', 'Jenis program yang cocok', 'Cakupan penganggur yang terjangkau'], ic: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5' },
];

/** Layar pembuka: memilih peran sejak awal agar fokus aplikasi (pengangguran terbuka) langsung jelas. */
export function RoleGate() {
  const { data, choose, choice, setGate } = useApp();
  const nat = data.nat; const latest = nat.tpt_terbaru[nat.tpt_terbaru.length - 1];
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && choice) setGate(false); };
    document.addEventListener('keydown', esc); document.body.classList.add('noscroll');
    return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('noscroll'); };
  }, [choice, setGate]);
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-t">
      <div className="gate-in">
        <div className="gate-top">
          <div className="eyebrow light">KOMPAS PELUANG KERJA · ACTION 2026</div>
          {choice && <button className="x" aria-label="Tutup" onClick={() => setGate(false)}>×</button>}
        </div>
        <h1 id="gate-t">Nganggur juga <em>punya alamat.</em></h1>
        <p className="gate-lead">Aplikasi ini membahas satu hal: <b>pengangguran terbuka</b>, yaitu orang dalam angkatan kerja yang tidak bekerja tetapi sedang mencari atau menyiapkan usaha. Ukurannya <b>Tingkat Pengangguran Terbuka (TPT)</b>.</p>
        <div className="gate-def">
          <div><span>Rumus BPS</span><b>TPT = penganggur ÷ angkatan kerja × 100%</b></div>
          <div><span>Nasional {latest.p}</span><b>{n2(latest.v)}% · {n2(nat.penganggur_feb2026_juta)} juta orang</b></div>
          <div><span>Kab/kota, Agu 2024</span><b>514 alamat, TPT 0–11,4%</b></div>
        </div>
        <h2>Anda datang sebagai siapa?</h2>
        <div className="gate-opts">
          {OPSI.map((o, i) => (
            <button key={o.v} ref={i === 0 ? first : undefined} className={'gopt' + (choice === o.v ? ' on' : '')} onClick={() => choose(o.v)}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={o.ic} /></svg>
              <b>{o.t}</b><small>{o.d}</small>
              <ul>{o.dapat.map((x) => <li key={x}>{x}</li>)}</ul>
              <span className="go">Mulai →</span>
            </button>
          ))}
        </div>
        <p className="gate-foot">Peran bisa diganti kapan saja lewat tombol <b>Peran</b> di bagian atas. Semua hitungan berjalan di peramban Anda; tidak ada data pribadi yang dikirim.</p>
      </div>
    </div>
  );
}
