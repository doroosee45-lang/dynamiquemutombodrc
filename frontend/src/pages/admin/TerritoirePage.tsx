import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, ChevronDown, Plus, Edit2, Trash2, Search,
  MapPin, Users, Building2, Home, TreePine, Layers, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { territoriesAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PROVINCES } from '@/utils/constants';
import { formatNumber } from '@/utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; children: string[] }> = {
  DISTRICT:    { label: 'District',       icon: <Building2 size={14}/>,  color: 'text-rose-700',   bg: 'bg-rose-100',   children: ['COMMUNE'] },
  VILLE:       { label: 'Ville / Cité',   icon: <Building2 size={14}/>,  color: 'text-blue-700',   bg: 'bg-blue-100',   children: ['COMMUNE'] },
  TERRITOIRE:  { label: 'Territoire',     icon: <Layers size={14}/>,     color: 'text-green-700',  bg: 'bg-green-100',  children: ['SECTEUR','CHEFFERIE'] },
  COMMUNE:     { label: 'Commune',        icon: <MapPin size={14}/>,     color: 'text-indigo-700', bg: 'bg-indigo-100', children: ['QUARTIER'] },
  SECTEUR:     { label: 'Secteur',        icon: <Layers size={14}/>,     color: 'text-teal-700',   bg: 'bg-teal-100',   children: ['GROUPEMENT'] },
  CHEFFERIE:   { label: 'Chefferie',      icon: <Layers size={14}/>,     color: 'text-amber-700',  bg: 'bg-amber-100',  children: ['GROUPEMENT'] },
  GROUPEMENT:  { label: 'Groupement',     icon: <Users size={14}/>,      color: 'text-orange-700', bg: 'bg-orange-100', children: ['VILLAGE'] },
  QUARTIER:    { label: 'Quartier',       icon: <Home size={14}/>,       color: 'text-purple-700', bg: 'bg-purple-100', children: ['VILLAGE'] },
  VILLAGE:     { label: 'Village',        icon: <TreePine size={14}/>,   color: 'text-emerald-700',bg: 'bg-emerald-100',children: [] },
};
const DISTRICT_LABELS: Record<string, string> = {
  LUKUNGA: 'Lukunga', FUNA: 'Funa', MONT_AMBA: 'Mont-Amba', TSHANGU: 'Tshangu',
};
// Root types by role context
const ROOT_TYPES_DEFAULT = ['VILLE', 'TERRITOIRE'];
const ROOT_TYPES_KINSHASA = ['DISTRICT'];
const PROVINCE_LABELS = Object.fromEntries(PROVINCES.map(p => [p.value, p.label]));

interface Territory {
  _id: string; name: string; type: string; province: string;
  parentId?: string | null; code?: string; population?: number;
  chief?: string; notes?: string; isActive: boolean; childCount: number;
  createdAt: string;
}

type ModalType = 'create' | 'edit' | 'delete' | null;
const EMPTY_FORM = { name: '', type: '', province: '', parentId: '', code: '', population: '', chief: '', notes: '' };

// ─── Single Node ─────────────────────────────────────────────────────────────
const TerritoryNode: React.FC<{
  node: Territory;
  depth: number;
  province: string;
  onEdit: (t: Territory) => void;
  onDelete: (t: Territory) => void;
  onAddChild: (parent: Territory) => void;
}> = ({ node, depth, province, onEdit, onDelete, onAddChild }) => {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const meta = TYPE_META[node.type] || TYPE_META.VILLAGE;
  const hasChildren = node.childCount > 0;
  const canHaveChildren = (TYPE_META[node.type]?.children || []).length > 0;

  const { data: childData, isFetching } = useQuery({
    queryKey: ['territories', province, node._id],
    queryFn: () => territoriesAPI.list({ province, parentId: node._id }).then(r => r.data),
    enabled: open && hasChildren,
    staleTime: 60000,
  });

  return (
    <div className={`${depth > 0 ? 'ml-5 border-l-2 border-gray-100 pl-2' : ''}`}>
      <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group transition-colors ${!node.isActive ? 'opacity-50' : ''}`}>
        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && setOpen(o => !o)}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'text-gray-500 hover:text-gray-700' : 'text-transparent'}`}>
          {hasChildren ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3" />}
        </button>

        {/* Type badge */}
        <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${meta.bg} ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>

        {/* Name */}
        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{node.name}</span>

        {/* Info pills */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          {node.code && <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{node.code}</span>}
          {node.population && <span className="flex items-center gap-0.5"><Users size={10} /> {formatNumber(node.population)}</span>}
          {node.chief && <span className="text-gray-400 italic truncate max-w-[100px]">👤 {node.chief}</span>}
          {node.childCount > 0 && <span className="text-gray-400">{node.childCount} sous-div.</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {canHaveChildren && (
            <button onClick={() => { qc.invalidateQueries({ queryKey: ['territories', province, node._id] }); onAddChild(node); }}
              title={`Ajouter ${TYPE_META[node.type]?.children.map(c => TYPE_META[c]?.label).join('/')}`}
              className="p-1 rounded text-green-600 hover:bg-green-50">
              <Plus size={13} />
            </button>
          )}
          <button onClick={() => onEdit(node)} className="p-1 rounded text-blue-600 hover:bg-blue-50" title="Modifier">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(node)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Supprimer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Children */}
      {open && (
        <div>
          {isFetching ? (
            <div className="ml-5 pl-2 py-2 text-xs text-gray-400 flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-300 border-t-primary-500 rounded-full animate-spin" /> Chargement...
            </div>
          ) : (
            childData?.territories?.map((child: Territory) => (
              <TerritoryNode key={child._id} node={child} depth={depth + 1}
                province={province} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const TerritoirePage: React.FC = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isDistrictAdmin = user?.role === 'DISTRICT_ADMIN';
  const userDistrict = (user as any)?.district as string | undefined;

  const [selectedProvince, setSelectedProvince] = useState(user?.province || '');
  const province = isSuperAdmin ? selectedProvince : (user?.province || '');

  // For Kinshasa, ADMIN sees all districts; DISTRICT_ADMIN sees only their district
  const isKinshasa = province === 'KINSHASA';
  const rootTypes = isKinshasa ? ROOT_TYPES_KINSHASA : ROOT_TYPES_DEFAULT;
  const scopeLabel = isDistrictAdmin && userDistrict
    ? `District ${DISTRICT_LABELS[userDistrict] || userDistrict}`
    : null;

  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Territory | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ['territory-stats', province],
    queryFn: () => province ? territoriesAPI.stats(province).then(r => r.data) : null,
    enabled: !!province,
  });

  const { data: rootData, isLoading } = useQuery({
    queryKey: ['territories', province, 'root'],
    queryFn: () => territoriesAPI.list({ province, parentId: 'root' }).then(r => r.data),
    enabled: !!province,
  });

  const { data: searchData } = useQuery({
    queryKey: ['territories-search', province, search],
    queryFn: () => territoriesAPI.list({ province, search, flat: 'true' }).then(r => r.data),
    enabled: !!province && search.length > 1,
    staleTime: 10000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => territoriesAPI.create({ ...form, province }),
    onSuccess: () => {
      toast.success('Division créée');
      qc.invalidateQueries({ queryKey: ['territories', province] });
      qc.invalidateQueries({ queryKey: ['territory-stats', province] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de création'),
  });

  const updateMut = useMutation({
    mutationFn: () => territoriesAPI.update(selected!._id, { name: form.name, code: form.code, population: form.population, chief: form.chief, notes: form.notes }),
    onSuccess: () => {
      toast.success('Division mise à jour');
      qc.invalidateQueries({ queryKey: ['territories', province] });
      closeModal();
    },
    onError: () => toast.error('Erreur de mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: () => territoriesAPI.delete(selected!._id),
    onSuccess: () => {
      toast.success('Division supprimée');
      qc.invalidateQueries({ queryKey: ['territories', province] });
      qc.invalidateQueries({ queryKey: ['territory-stats', province] });
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de suppression'),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const openCreate = (parent?: Territory) => {
    const childTypes = parent ? (TYPE_META[parent.type]?.children || []) : rootTypes;
    setForm({ ...EMPTY_FORM, type: childTypes[0] || '', parentId: parent?._id || '', province });
    setSelected(parent || null);
    setModal('create');
  };
  const openEdit = (t: Territory) => {
    setSelected(t);
    setForm({ name: t.name, type: t.type, province: t.province, parentId: t.parentId || '', code: t.code || '', population: t.population?.toString() || '', chief: t.chief || '', notes: t.notes || '' });
    setModal('edit');
  };
  const openDelete = (t: Territory) => { setSelected(t); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const childTypesForCreate: string[] = selected ? (TYPE_META[selected.type]?.children || []) : rootTypes;

  const displayedRoots = useMemo(() => {
    if (!search || search.length < 2) return rootData?.territories || [];
    return searchData?.territories || [];
  }, [search, rootData, searchData]);

  const stats = statsData?.byType || [];
  const statMap = Object.fromEntries(stats.map((s: { type: string; count: number }) => [s.type, s.count]));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Divisions Administratives</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {province ? `Province de ${PROVINCE_LABELS[province] || province}` : 'Sélectionnez une province'}
          </p>
        </div>
        <div className="flex gap-2">
          {province && (
            <Button onClick={() => openCreate()} icon={<Plus size={16} />}>
              Ajouter une division
            </Button>
          )}
        </div>
      </div>

      {/* Province selector (SuperAdmin only) */}
      {isSuperAdmin && (
        <Card>
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner la province à gérer</label>
            <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}
              className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Choisir une province...</option>
              {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* District scope banner for DISTRICT_ADMIN */}
      {scopeLabel && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-50 border border-rose-100 text-rose-800">
          <Building2 size={15}/>
          <span>Portée restreinte : <strong>{scopeLabel}</strong> — vous gérez uniquement les divisions de votre district</span>
        </div>
      )}

      {/* Kinshasa info when ADMIN/SUPERADMIN */}
      {isKinshasa && !isDistrictAdmin && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-rose-50 border border-rose-100 text-rose-700">
          <Building2 size={15}/>
          <span>Kinshasa : structure par <strong>districts</strong> (Lukunga · Funa · Mont-Amba · Tshangu) → Communes → Quartiers</span>
        </div>
      )}

      {!province ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={48} className="mx-auto mb-3 text-gray-200" />
          <p>Aucune province assignée à votre compte.</p>
          <p className="text-sm mt-1">Contactez le SuperAdmin.</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <Card key={type}>
                <div className={`p-3 text-center rounded-xl ${meta.bg}`}>
                  <div className={`flex justify-center mb-1 ${meta.color}`}>{meta.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{statMap[type] || 0}</p>
                  <p className="text-xs text-gray-500 leading-tight">{meta.label}s</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Population estimate */}
          {statsData?.estimatedPopulation > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700">
              <Users size={16} />
              <span>Population estimée enregistrée : <strong>{formatNumber(statsData.estimatedPopulation)}</strong> hab.</span>
            </div>
          )}

          {/* Search + Tree */}
          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher une ville, commune, village..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3">
              {isLoading ? (
                <LoadingSpinner text="Chargement des divisions..." />
              ) : displayedRoots.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  {search ? (
                    <p>Aucun résultat pour "{search}"</p>
                  ) : (
                    <div>
                      <Layers size={36} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm">Aucune division enregistrée pour cette province.</p>
                      <button onClick={() => openCreate()}
                        className="mt-3 text-primary-600 text-sm hover:underline flex items-center gap-1 mx-auto">
                        <Plus size={14} /> Commencer par ajouter une Ville ou Territoire
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {search && search.length > 1 ? (
                    // Flat search results
                    displayedRoots.map((t: Territory) => (
                      <div key={t._id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-lg group">
                        <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_META[t.type]?.bg} ${TYPE_META[t.type]?.color}`}>
                          {TYPE_META[t.type]?.icon} {TYPE_META[t.type]?.label}
                        </span>
                        <span className="text-sm font-medium text-gray-800 flex-1">{t.name}</span>
                        {t.population && <span className="text-xs text-gray-400">{formatNumber(t.population)} hab.</span>}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(t)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => openDelete(t)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Hierarchical tree
                    displayedRoots.map((t: Territory) => (
                      <TerritoryNode key={t._id} node={t} depth={0} province={province}
                        onEdit={openEdit} onDelete={openDelete} onAddChild={openCreate} />
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-medium">Hiérarchie :</span>
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <span key={type} className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ══════ MODAL Créer ══════ */}
      <Modal open={modal === 'create'} onClose={closeModal}
        title={selected ? `Ajouter sous : ${selected.name}` : 'Nouvelle division administrative'} size="lg">
        <div className="space-y-4">
          {selected && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${TYPE_META[selected.type]?.bg} ${TYPE_META[selected.type]?.color}`}>
              {TYPE_META[selected.type]?.icon}
              <span>Sous-division de <strong>{selected.name}</strong> ({TYPE_META[selected.type]?.label})</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.type} onChange={e => setF('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Sélectionner...</option>
                {childTypesForCreate.map((t: string) => (
                  <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder={form.type === 'VILLAGE' ? 'Ex: Village Mbata' : form.type === 'VILLE' ? 'Ex: Goma' : 'Nom officiel'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code administratif</label>
              <input value={form.code} onChange={e => setF('code', e.target.value)}
                placeholder="Ex: KIN-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Population estimée</label>
              <input type="number" value={form.population} onChange={e => setF('population', e.target.value)}
                placeholder="Nombre d'habitants"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {['CHEFFERIE', 'GROUPEMENT', 'VILLAGE'].includes(form.type) ? 'Chef coutumier' : 'Responsable / Maire'}
              </label>
              <input value={form.chief} onChange={e => setF('chief', e.target.value)}
                placeholder="Nom du responsable"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                placeholder="Informations complémentaires..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} className="flex-1"
              disabled={!form.name.trim() || !form.type}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════ MODAL Modifier ══════ */}
      <Modal open={modal === 'edit'} onClose={closeModal}
        title={`Modifier — ${selected?.name}`} size="lg">
        <div className="space-y-4">
          {selected && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${TYPE_META[selected.type]?.bg} ${TYPE_META[selected.type]?.color}`}>
              {TYPE_META[selected.type]?.icon} <span>{TYPE_META[selected.type]?.label}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom officiel *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code administratif</label>
              <input value={form.code} onChange={e => setF('code', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Population estimée</label>
              <input type="number" value={form.population} onChange={e => setF('population', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable / Chef</label>
              <input value={form.chief} onChange={e => setF('chief', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="flex-1">
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════ MODAL Supprimer ══════ */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Confirmer la suppression">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <AlertTriangle size={32} className="mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-800">
              Supprimer <strong>{selected?.name}</strong> ({TYPE_META[selected?.type || '']?.label}) ?
            </p>
            {(selected?.childCount || 0) > 0 && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ Cette division contient <strong>{selected?.childCount}</strong> sous-division(s). Supprimez-les d'abord.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              disabled={(selected?.childCount || 0) > 0}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
