import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Download, FolderOpen, Search } from 'lucide-react';
import { getInstances, getFolders, deleteInstance } from '@/lib/api';
import type { Instance, Folder } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { exportCanvasToPDF } from '@/lib/pdf';
import * as fabric from 'fabric';
import toast from 'react-hot-toast';

export default function InstancesPage() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [i, f] = await Promise.all([
        getInstances(selectedFolder || undefined),
        getFolders(),
      ]);
      setInstances(i);
      setFolders(f);
    } catch {
      toast.error('Error al cargar las noras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedFolder]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await deleteInstance(id);
    toast.success('Nora eliminada');
    load();
  };

  const handleExport = async (instance: Instance) => {
    setExporting(instance.id);
    try {
      const t0 = performance.now();
      const tempCanvas = new fabric.Canvas(document.createElement('canvas'), {
        width: 794,
        height: 1123,
      });
      await tempCanvas.loadFromJSON(JSON.parse(instance.design));
      tempCanvas.renderAll();
      const t1 = performance.now();
      const dataURL = tempCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
      const t2 = performance.now();
      console.log(`[export] design bytes=${instance.design.length} load+render=${(t1 - t0).toFixed(0)}ms toDataURL=${(t2 - t1).toFixed(0)}ms dataURL_bytes=${dataURL.length}`);
      await exportCanvasToPDF(dataURL, instance.name);
      console.log(`[export] makePDF=${(performance.now() - t2).toFixed(0)}ms total=${(performance.now() - t0).toFixed(0)}ms`);
      tempCanvas.dispose();
      toast.success('PDF descargado');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(null);
    }
  };

  const filtered = instances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Mis noras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tus noras personalizadas por evento.</p>
        </div>
        <button onClick={() => navigate('/instancias/nueva')} className="btn-primary shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva nora</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-col sm:flex-row sm:flex-wrap">
        <div className="relative sm:flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Buscar noras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedFolder('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              !selectedFolder
                ? 'bg-gold-500 text-white border-gold-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selectedFolder === f.id
                  ? 'bg-gold-500 text-white border-gold-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FolderOpen size={11} />
              {f.name}
              {f._count && (
                <span className="opacity-60">({f._count.instances})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🚕"
          title="Aún no hay noras"
          description="Elige una plantilla, personaliza el texto y el QR, y descarga tu nora en PDF."
          action={
            <button onClick={() => navigate('/instancias/nueva')} className="btn-primary">
              <Plus size={14} /> Crear primera nora
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              isExporting={exporting === instance.id}
              onEdit={() => navigate(`/instancias/${instance.id}`)}
              onDelete={() => handleDelete(instance.id, instance.name)}
              onExport={() => handleExport(instance)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InstanceCard({
  instance,
  isExporting,
  onEdit,
  onDelete,
  onExport,
}: {
  instance: Instance;
  isExporting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  return (
    <div className="card group">
      <div className="aspect-[3/4] bg-cream-100 rounded-t-xl overflow-hidden cursor-pointer border-b border-gray-200" onClick={onEdit}>
        {instance.thumbnail ? (
          <img
            src={instance.thumbnail}
            alt={instance.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
            🚕
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate mb-0.5">{instance.name}</p>
        <p className="text-xs text-gray-400">{instance.folder?.name ?? 'Sin carpeta'}</p>
        <div className="flex gap-1.5 mt-3">
          <button onClick={onEdit} className="btn-secondary flex-1 justify-center text-xs py-1.5">
            <Pencil size={12} /> Editar
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="btn-primary text-xs py-1.5 px-2.5 disabled:opacity-50"
          >
            {isExporting ? <Spinner size={12} /> : <Download size={12} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
