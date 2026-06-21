import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';
import { CategoryBadge, StatusBadge } from '@/components/ui/Badge';
import { REPORT_CATEGORIES, PROVINCES, MAP_CENTER, MAP_ZOOM } from '@/utils/constants';
import { timeAgo } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import { Filter, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Report } from '@/types';

// Custom marker icons by category
const createIcon = (color: string) => L.divIcon({
  html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const CATEGORY_COLORS: Record<string, string> = {
  INSECURITY: '#dc2626', BANDITRY: '#ea580c', TRANSPORT: '#d97706',
  CORRUPTION: '#7c3aed', TRIBALISM: '#db2777', ADMINISTRATIVE: '#2563eb', OTHER: '#6b7280',
};

const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ category: '', status: '', province: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CENTER);

  const { data: mapPoints, isLoading, refetch } = useQuery({
    queryKey: ['map-data', filters],
    queryFn: () => reportsAPI.getMapData(filters).then(r => r.data),
    refetchInterval: 60000,
  });

  const handleProvinceChange = (province: string) => {
    setFilters(f => ({ ...f, province }));
    // Province coordinate approximations
    const coords: Record<string, [number, number]> = {
      KINSHASA: [-4.32, 15.32], NORD_KIVU: [-1.65, 29.22],
      SUD_KIVU: [-2.64, 28.86], HAUT_KATANGA: [-11.66, 27.46],
      LUALABA: [-10.33, 25.03], ITURI: [1.58, 30.08],
    };
    if (coords[province]) setMapCenter(coords[province]);
    else setMapCenter(MAP_CENTER);
  };

  const pointsWithCoords = (mapPoints || []).filter(
    (p: Partial<Report>) => p.latitude && p.longitude
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carte Interactive Nationale</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pointsWithCoords.length} incident(s) géolocalisé(s) · 26 provinces
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => refetch()}>
            Actualiser
          </Button>
          <Button variant="secondary" icon={<Filter size={16} />} onClick={() => setShowFilters(!showFilters)}>
            Filtres
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-3">
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Toutes catégories</option>
              {REPORT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <select value={filters.province} onChange={e => handleProvinceChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Toutes provinces</option>
              {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Tous statuts</option>
              <option value="PENDING">En attente</option>
              <option value="VERIFIED">Vérifié</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="RESOLVED">Résolu</option>
            </select>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Légende :</span>
          {REPORT_CATEGORIES.map(c => (
            <div key={c.value} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2 border-white shadow"
                style={{ background: CATEGORY_COLORS[c.value] }} />
              <span className="text-xs text-gray-600">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '65vh' }}>
        <MapContainer
          center={mapCenter}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapUpdater center={mapCenter} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {pointsWithCoords.map((point: Report) => (
            <Marker
              key={point.id}
              position={[point.latitude!, point.longitude!]}
              icon={createIcon(CATEGORY_COLORS[point.category] || '#6b7280')}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <CategoryBadge category={point.category} />
                    <StatusBadge status={point.status} />
                  </div>
                  <p className="font-semibold text-sm text-gray-800 mb-1">{point.title}</p>
                  <p className="text-xs text-gray-500 mb-2">📍 {point.province}</p>
                  <p className="text-xs text-gray-400">{timeAgo(point.createdAt)}</p>
                  <button
                    onClick={() => navigate(`/reports/${point.id}`)}
                    className="mt-2 w-full text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">
                    Voir le détail
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
