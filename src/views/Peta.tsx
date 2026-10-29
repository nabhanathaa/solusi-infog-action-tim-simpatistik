import { useCallback, useMemo, useRef } from 'react';
import { useApp } from '../lib/store';
import { MapView, boxOf } from '../components/MapView';
import { RegionCard } from '../components/RegionCard';
import { RegionSearch } from '../components/ui';
import { LAYERS, LISA_COLOR, type LayerKey } from '../lib/colors';
import { alertFor } from '../lib/reco';
import { approx, n1, n2, pct, shortName } from '../lib/format';
import type { Region } from '../lib/types';

export default function Peta() {
  const { data, route, selected, select, setParam } = useApp();
  const { regions, geo, nat } = data;
  const layer = ((LAYERS.find((l) => l.key === route.q.get('l'))?.key) ?? 'tpt') as LayerKey;
  const prov = route.q.get('p') ?? '';
  const cardRef = useRef<HTMLDivElement>(null);
  const provinces = useMemo(() => [...new Set(regions.map((r) => r.pv))].sort(), [regions]);
  const provIds = useMemo(() => (prov ? regions.filter((r) => r.pv === prov).map((r) => r.id) : null), [prov, regions]);
  const focus = useMemo(() => {
    if (selected) { const b = boxOf([selected.id, ...selected.nb.map((i) => regions[i].id)], geo); return b; }
    return provIds ? boxOf(provIds, geo) : null;
  }, [selected, provIds, regions, geo]);
  const hl = useMemo(() => (provIds && !selected ? new Set(provIds) : null), [provIds, selected]);
  const outline = useCallback((r: Region) => (layer === 'tpt' ? (r.lisa === 'HH' ? '#5d0000' : r.lisa === 'LL' ? '#4f8fc0' : null) : null), [layer]);
  const al = selected ? alertFor(selected, nat) : null;
  const L = nat.lisa as Record<string, number>;

  return (
    <div className="peta">
      <div className="peta-map">
        <div className="peta-bar">
          <div className="layers" role="tablist" aria-label="Lapisan peta">
            {LAYERS.map((l) => <button key={l.key} role="tab" aria-selected={layer === l.key} className={layer === l.key ? 'on' : ''} title={l.hint} onClick={() => setParam('l', l.key)}>{l.label}</button>)}
          </div>
          <div className="peta-tools">
            <RegionSearch value={selected} onPick={(r) => select(r.id)} />
            <select aria-label="Filter provinsi" value={prov} onChange={(e) => { setParam('p', e.target.value || null); if (e.target.value) select(null); }}>
              <option value="">Semua provinsi</option>{provinces.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="peta-canvas">
          <MapView layer={layer} selectedId={selected?.id} onSelect={(id) => { select(id); if (id) setTimeout(() => { if (window.innerWidth < 980) cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }} focus={focus} highlight={hl} outline={outline} />
          <div className="layer-hint">{LAYERS.find((l) => l.key === layer)?.hint}</div>
          {selected && (
            <button className="peek" onClick={() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <i style={{ background: al!.color }} /><b>{shortName(selected.n)}</b><span>TPT {pct(selected.tpt)} · {al!.label}</span><em>Kartu ↓</em>
            </button>
          )}
        </div>
      </div>
      <aside className="peta-side" ref={cardRef}>
        {selected ? (
          <RegionCard r={selected} onClose={() => select(null)} onPick={(id) => select(id)} />
        ) : (
          <div className="intro">
            <div className="eyebrow">KARTU ALAMAT</div>
            <h3>Pilih satu area di peta</h3>
            <p>Klik kabupaten/kota, atau cari namanya, untuk membuka kartu yang berisi klasifikasi zona, profil, tetangga, dan resep sesuai peran Anda.</p>
            <div className="facts">
              <div><b>{n2(Number(L.moran_I_k6))}</b><span>indeks Moran I (k=6)</span></div>
              <div><b>{L.HH_p05}</b><span>klaster tinggi (HH)</span></div>
              <div><b>{L.LL_p05}</b><span>klaster rendah (LL)</span></div>
            </div>
            <h4>Alamat dengan kewaspadaan tertinggi</h4>
            <ol className="toplist">
              {[...regions].filter((r) => r.skor != null).sort((a, b) => (b.skor as number) - (a.skor as number)).slice(0, 8).map((r) => (
                <li key={r.id}><button onClick={() => select(r.id)}><i style={{ background: LISA_COLOR[r.lisa] }} /><span><b>{shortName(r.n)}</b><em>{r.pv}</em></span><strong>{n1(r.skor as number)}</strong></button></li>
              ))}
            </ol>
            <p className="note">Indeks Kewaspadaan 0–100 adalah ringkasan heuristik dari TPT, estimasi jumlah penganggur, TPT tetangga, kesenjangan gender, kemiskinan, dan klaster HH (bobot di halaman Metode). Estimasi penganggur memakai proksi angkatan kerja ≈ {Math.round(nat.lfpr_proksi * 100)}% penduduk, misalnya {approx(regions[0].est)} untuk {shortName(regions[0].n)}.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
