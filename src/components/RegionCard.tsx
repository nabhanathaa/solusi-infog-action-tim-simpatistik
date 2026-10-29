import { useState } from 'react';
import { useApp } from '../lib/store';
import { alertFor, resepPemda, sektorPrioritas, skorPelatihan, resepPelatihanText, PROGRAM_LABEL, zoneFor, type Program } from '../lib/reco';
import { Bullets, MoranScatter } from './Charts';
import { Pill, Seg, Callout } from './ui';
import { approx, n1, n2, pct, shortName } from '../lib/format';
import { C } from '../lib/colors';
import type { Region, Role } from '../lib/types';

export function RegionCard({ r, onClose, onPick }: { r: Region; onClose?: () => void; onPick: (id: number) => void }) {
  const { data, role, setParam, go } = useApp();
  const { nat, regions } = data;
  const al = alertFor(r, nat); const zone = zoneFor(r);
  const [prog, setProg] = useState<Program>('vokasi');
  const med = nat.profil.semua; const zp = nat.profil.lisa[r.lisa];
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { window.prompt('Salin tautan:', window.location.href); }
  };
  const nbs = r.nb.map((i) => regions[i]);
  const mirip = r.mirip.map((i) => regions[i]);
  const sek = sektorPrioritas(r, nat).slice(0, 3);
  return (
    <article className="rcard" aria-label={`Kartu Alamat ${r.n}`}>
      <header className="rc-head" style={{ '--zc': zone.color } as React.CSSProperties}>
        <div className="rc-top">
          <span className="rc-pin" aria-hidden>⌖</span>
          <div className="rc-t"><div className="rc-k">KARTU ALAMAT · {r.pl.toUpperCase()}</div><h3>{r.n}</h3><div className="rc-sub">{r.pv} · {r.tip}</div></div>
          {onClose && <button className="x" aria-label="Tutup kartu" onClick={onClose}>×</button>}
        </div>
        <div className="rc-badges"><Pill color={al.color}>{al.label}</Pill><Pill color={zone.color} soft>{zone.code === 'ns' ? 'Tanpa klaster' : 'Klaster ' + zone.code}</Pill></div>
      </header>

      <div className="rc-body">
        <p className="rc-zone"><b>{zone.title}.</b> {zone.summary}</p>
        <p className="rc-why">Status <b>{al.label.toLowerCase()}</b>: {al.why}</p>

        <div className="rc-nums">
          <div><span>TPT 2024</span><b style={{ color: r.tpt > med.tpt ? C.red : C.teal }}>{pct(r.tpt)}</b><em>median {pct(med.tpt)}</em></div>
          <div><span>Penganggur</span><b>{approx(r.est)}</b><em>estimasi kasar</em></div>
          <div><span>Kewaspadaan</span><b>{r.skor == null ? '–' : n1(r.skor)}</b><em>skala 0–100</em></div>
        </div>

        <h4>Profil dibanding pembanding</h4>
        <Bullets c1="median 514 kab/kota" c2={`median klaster ${r.lisa === 'ns' ? 'tak signifikan' : r.lisa}`} rows={[
          { label: 'TPT (%)', value: r.tpt, ref1: med.tpt, ref2: zp?.tpt, max: 12, fmt: (v) => n2(v) },
          { label: 'Lama sekolah (th)', value: r.rls, ref1: med.rls, ref2: zp?.rls, max: 13, fmt: (v) => n1(v) },
          { label: 'PDRB per kapita (juta Rp)', value: Math.min(r.pdrb, 200), ref1: med.pdrb, ref2: zp?.pdrb, max: 200, fmt: () => n1(r.pdrb) },
          { label: 'Penduduk miskin (%)', value: r.p0, ref1: med.p0, ref2: zp?.p0, max: 40, fmt: (v) => n1(v) },
        ]} />
        <div className="rc-gender"><span>Laki-laki <b>{pct(r.tl)}</b></span><i style={{ background: `linear-gradient(90deg, ${C.blue} ${(r.tl / (r.tl + r.tp + 1e-9)) * 100}%, ${C.red} 0)` }} /><span><b>{pct(r.tp)}</b> Perempuan</span></div>

        <h4>Posisi spasial</h4>
        <MoranScatter regions={regions} selId={r.id} h={210} onPick={onPick} />
        <p className="note">Titik = kab/kota; sumbu tegak = rata-rata TPT 6 tetangga terdekat. Sorot terhadap tetangga menentukan klaster HH/LL.</p>
        <div className="chips">{nbs.map((n) => <button key={n.id} className="chip" onClick={() => onPick(n.id)}><i style={{ background: n.art ? '#a3a59c' : n.tpt > r.tpt ? C.red : C.teal }} />{shortName(n.n)} <b>{pct(n.tpt)}</b></button>)}</div>

        <div className="rc-role">
          <div className="rc-rh"><h4>Resep</h4><Seg<Role> label="Peran" value={role} onChange={(v) => setParam('r', v)} options={[{ v: 'pemda', l: 'Pemda' }, { v: 'pencari', l: 'Pencari kerja' }, { v: 'pelatihan', l: 'Pelatihan' }]} /></div>
          {role === 'pemda' && resepPemda(r, data).slice(0, 4).map((a, i) => (
            <div key={i} className={'rx p' + a.prioritas}><div className="rxh"><b>{a.judul}</b><Pill soft color={a.prioritas === 1 ? C.red : a.prioritas === 2 ? C.amber : C.teal}>{a.prioritas === 1 ? 'Utama' : a.prioritas === 2 ? 'Penting' : 'Pantau'}</Pill></div><p>{a.aksi}</p><ul className="why">{a.alasan.map((x, k) => <li key={k}>{x}</li>)}</ul><div className="ind">Indikator: {a.indikator}</div></div>
          ))}
          {role === 'pencari' && (
            <div className="rx"><p>Dapatkan peta peluang yang disesuaikan dengan pendidikan dan usiamu.</p><button className="btn" onClick={() => go('kompas', { r: 'pencari', w: String(r.id) })}>Buka Kompas untuk {shortName(r.n)} →</button></div>
          )}
          {role === 'pelatihan' && (
            <div className="rx"><Seg<Program> label="Program" value={prog} onChange={setProg} options={(Object.keys(PROGRAM_LABEL) as Program[]).map((k) => ({ v: k, l: PROGRAM_LABEL[k].split(' ')[0] }))} />
              <p><b>{PROGRAM_LABEL[prog]}</b>: {resepPelatihanText(r, prog)}</p>
              <div className="ind">Skor kecocokan relatif: {n1(skorPelatihan(r, prog) / 1000)} (makin tinggi, makin layak dibuka kelasnya)</div></div>
          )}
        </div>

        <h4>Sektor yang layak didorong <Pill soft>heuristik</Pill></h4>
        <ol className="sekl">{sek.map((s) => <li key={s.s.nama}><b>{s.s.nama.split(',')[0].split(';')[0]}</b><span>{s.catatan} · upah ≈ {n1(s.s.upah_juta)} jt</span></li>)}</ol>
        <p className="note">Belum ada data sektoral kab/kota. Urutan ini memakai pengganda kerja tabel IO nasional 2020 dikalikan kecocokan tipologi (asumsi), bukan struktur ekonomi daerah sebenarnya.</p>

        <h4>Wilayah serupa</h4>
        <div className="chips">{mirip.map((n) => <button key={n.id} className="chip" onClick={() => onPick(n.id)}>{shortName(n.n)} <b>{pct(n.tpt)}</b></button>)}</div>
        <p className="note">Terdekat pada enam indikator (TPT, selisih gender, lama sekolah, PDRB, kemiskinan, kepadatan). Cocok untuk belajar kebijakan antardaerah.</p>

        {r.art && <Callout kind="warn" title="Peringatan data">TPT {pct(r.tpt)} kemungkinan artefak pengukuran (pengambilan sampel kecil). Daerah ini dikeluarkan dari peringkat dan indeks kewaspadaan.</Callout>}
        <div className="rc-actions"><button className="btn ghost" onClick={share}>{copied ? 'Tautan tersalin ✓' : 'Bagikan alamat ini'}</button></div>
      </div>
    </article>
  );
}
