'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';

import { MAP_TYPES, OTHER_COLOR, scamLabel, seriesColor } from '@/lib/format';
import type { FeedEvent, MapPoint } from '@/lib/types';

const HYDERABAD: [number, number] = [17.42, 78.47];
const PULSE_MS = 3 * 60_000;

const pulseIcon = (critical: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="pulse" style="--pulse-color:${critical ? '#d03b3b' : '#fab219'}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

/** Leaflet measures its box once; re-measure (and re-centre) whenever the panel resizes. */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      map.setView(HYDERABAD, map.getZoom(), { animate: false });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/**
 * Reports by locality (never an exact location). Circle area tracks the count;
 * colour is the leading scam type there, for the three types this all-pairs
 * view can tell apart, gray for the rest. Live events pulse for three minutes.
 */
export default function LiveMap({ points, events }: { points: MapPoint[]; events: FeedEvent[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const pulses = useMemo(
    () => events.filter((e) => e.geo && now - new Date(e.createdAt).getTime() < PULSE_MS && e.type !== 'system').slice(0, 25),
    [events, now],
  );
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-b-xl">
      <MapContainer center={HYDERABAD} zoom={11} scrollWheelZoom={false} className="absolute inset-0" attributionControl>
        <KeepSized />
        {/* OpenStreetMap tiles, darkened in CSS (.leaflet-tile-pane) to sit under the control-room theme. */}
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        {points.map((p) => (
          <CircleMarker
            key={p.locality}
            center={[p.lat, p.lng]}
            radius={6 + Math.sqrt(p.count / max) * 22}
            pathOptions={{ color: '#1a1a19', weight: 2, fillColor: seriesColor(p.topType, MAP_TYPES), fillOpacity: 0.78 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs">
                <div className="mb-1 text-sm font-semibold">{p.locality}</div>
                <div className="mb-1 text-ink-2">{p.count} reports</div>
                {Object.entries(p.byType)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([type, n]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: seriesColor(type, MAP_TYPES) }} />
                      <span className="text-ink-2">{scamLabel(type)}</span>
                      <span className="tabular ml-auto pl-3 text-ink">{n}</span>
                    </div>
                  ))}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {pulses.map((e) => (
          <Marker key={e.id} position={[e.geo!.lat, e.geo!.lng]} icon={pulseIcon(e.severity === 'critical')}>
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs font-medium">{e.title}</div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-page/85 px-3 py-2 text-[11px] text-ink-2">
        {MAP_TYPES.map((s) => (
          <span key={s.type} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {scamLabel(s.type)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: OTHER_COLOR }} /> Other
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-2 ring-warning/60" style={{ background: '#fab219' }} /> Live event
        </span>
      </div>
    </div>
  );
}
