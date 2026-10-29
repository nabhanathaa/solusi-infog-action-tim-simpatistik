import { useEffect, useRef, useState } from 'react';
import { useApp, type View } from './lib/store';
import Home from './views/Home';
import Peta from './views/Peta';
import Kompas from './views/Kompas';
import Simulator from './views/Simulator';
import Radar from './views/Radar';
import Suara from './views/Suara';
import Metode from './views/Metode';
import { Assistant } from './components/Assistant';
import { RoleGate } from './components/RoleGate';
import { ROLE_LABEL } from './lib/reco';

const NAV: { v: View; l: string; ic: string }[] = [
  { v: 'beranda', l: 'Beranda', ic: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { v: 'peta', l: 'Peta', ic: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14' },
  { v: 'kompas', l: 'Kompas', ic: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5l-2 5-5 2 2-5z' },
  { v: 'simulator', l: 'Simulasi', ic: 'M4 20V10m6 10V4m6 16v-7m6 7H2' },
  { v: 'radar', l: 'Radar', ic: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5' },
  { v: 'suara', l: 'Suara', ic: 'M4 5h16v11H9l-5 4z' },
  { v: 'metode', l: 'Metode', ic: 'M5 4h14v16H5zM9 9h6M9 13h6' },
];

export default function App() {
  const { route, go, gate, setGate, choice } = useApp();
  const [more, setMore] = useState(false);
  const main = useRef<HTMLElement>(null);
  useEffect(() => { setMore(false); main.current?.focus({ preventScroll: true }); document.body.dataset.view = route.view; document.title = 'LokaKerja · ' + (NAV.find((n) => n.v === route.view)?.l ?? ''); }, [route.view]);
  // animasi muncul saat digulir: kelas hanya ditambahkan lewat JS, jadi tanpa JS konten tetap tampil
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    const raf = requestAnimationFrame(() => document.querySelectorAll('main .panel, main .kpi, main .play-card, main .page-head, main .ambang').forEach((el, i) => {
      if (el.classList.contains('in')) return;
      el.classList.add('rv'); (el as HTMLElement).style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(el);
    }));
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [route.view]);
  const mobilePrimary = NAV.slice(0, 5); const mobileMore = NAV.slice(5);
  const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>Lompat ke konten</a>
      <header className="top">
        <button className="brand" onClick={() => go('beranda')} aria-label="LokaKerja, ke beranda">
          <img className="brand-logo" src="./lokakerja-logo.png" alt="" />
          <span><b>LokaKerja</b><em>Nganggur juga punya alamat</em></span>
        </button>
        <nav className="dtabs" aria-label="Navigasi utama">
          {NAV.map((n) => <button key={n.v} className={route.view === n.v ? 'on' : ''} aria-current={route.view === n.v ? 'page' : undefined} onClick={() => go(n.v, { w: route.q.get('w'), r: route.q.get('r') })}>{n.l}</button>)}
        </nav>
        <button className="rolechip" onClick={() => setGate(true)} aria-label="Ganti peran">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          <span>{choice ? ROLE_LABEL[choice] : 'Pilih peran'}</span>
        </button>
      </header>
      <main id="main" ref={main} tabIndex={-1} className={'view v-' + route.view}>
        {route.view === 'beranda' && <Home />}
        {route.view === 'peta' && <Peta />}
        {route.view === 'kompas' && <Kompas />}
        {route.view === 'simulator' && <Simulator />}
        {route.view === 'radar' && <Radar />}
        {route.view === 'suara' && <Suara />}
        {route.view === 'metode' && <Metode />}
        <footer className="foot">ACTION 2026 · Data: BPS (Sakernas, BRS, Tabel IO 2020), komentar publik YouTube (anonim). Hasil adalah potensi, bukan prediksi. · Dibuat oleh Tim Simpatistik.</footer>
      </main>
      <nav className="mtabs" aria-label="Navigasi utama (ponsel)">
        {mobilePrimary.map((n) => <button key={n.v} className={route.view === n.v ? 'on' : ''} aria-current={route.view === n.v ? 'page' : undefined} onClick={() => go(n.v, { w: route.q.get('w'), r: route.q.get('r') })}><Icon d={n.ic} /><span>{n.l}</span></button>)}
        <button className={mobileMore.some((n) => n.v === route.view) || more ? 'on' : ''} aria-expanded={more} onClick={() => setMore((m) => !m)}><Icon d="M5 12h.01M12 12h.01M19 12h.01" /><span>Lainnya</span></button>
        {more && <div className="more">{mobileMore.map((n) => <button key={n.v} onClick={() => go(n.v)}><Icon d={n.ic} />{n.l}</button>)}</div>}
      </nav>
      <Assistant />
      {gate && <RoleGate />}
    </>
  );
}
