import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDesigner } from '@/components/designer/useDesigner';
import Toolbar from '@/components/designer/Toolbar';
import PropertiesPanel from '@/components/designer/PropertiesPanel';
import {
  getTemplate, createTemplate, updateTemplate,
  getInstance, createInstance, updateInstance,
  getCategories, getFolders,
} from '@/lib/api';
import type { Category, Folder } from '@/types';
import { exportCanvasToPDF } from '@/lib/pdf';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type Mode = 'template' | 'instance';

export default function DesignerPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode: Mode = (searchParams.get('mode') as Mode) ?? 'instance';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const designer = useDesigner(canvasRef);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [entityId, setEntityId] = useState<string | null>(id ?? null);

  useEffect(() => {
    const init = async () => {
      const [cats, fols] = await Promise.all([getCategories(), getFolders()]);
      setCategories(cats);
      setFolders(fols);

      if (id) {
        try {
          if (mode === 'template') {
            const t = await getTemplate(id);
            setName(t.name);
            setCategoryId(t.categoryId);
            setTimeout(() => designer.loadFromJSON(t.design), 100);
          } else {
            const inst = await getInstance(id);
            setName(inst.name);
            setFolderId(inst.folderId ?? '');
            setTimeout(() => designer.loadFromJSON(inst.design), 100);
          }
        } catch {
          toast.error('No se pudo cargar el diseño');
        }
      } else if (mode === 'instance') {
        // Load from template if templateId provided
        const templateId = searchParams.get('templateId');
        if (templateId) {
          try {
            const t = await getTemplate(templateId);
            setTimeout(() => designer.loadFromJSON(t.design), 100);
          } catch {}
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setShowSaveModal(true);
      return;
    }
    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const design = designer.toJSON();
      const thumbnail = designer.toThumbnail();

      if (mode === 'template') {
        if (!categoryId) {
          toast.error('Elige una categoría');
          setSaving(false);
          return;
        }
        if (entityId) {
          await updateTemplate(entityId, { name, categoryId, design, thumbnail });
        } else {
          const t = await createTemplate({ name, categoryId, design, thumbnail });
          setEntityId(t.id);
          navigate(`/plantillas/${t.id}?mode=template`, { replace: true });
        }
        toast.success('Plantilla guardada');
      } else {
        if (entityId) {
          await updateInstance(entityId, { name, folderId: folderId || null, design, thumbnail });
        } else {
          const i = await createInstance({
            name,
            folderId: folderId || null,
            templateId: searchParams.get('templateId') ?? undefined,
            design,
            thumbnail,
          });
          setEntityId(i.id);
          navigate(`/instancias/${i.id}`, { replace: true });
        }
        toast.success('Tarjeta guardada');
      }
      setShowSaveModal(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const dataURL = designer.toDataURL();
    exportCanvasToPDF(dataURL, name || 'tarjeta-taxi');
  };

  const backUrl = mode === 'template' ? '/plantillas' : '/instancias';
  const title = mode === 'template' ? 'Editor de plantilla' : 'Editor de tarjeta';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left toolbar */}
      <aside className="w-52 shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
          <button
            onClick={() => navigate(backUrl)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-xs font-medium text-gray-700 truncate">{title}</span>
        </div>

        {/* Name field */}
        <div className="p-3 border-b border-gray-100">
          <label className="label text-[10px]">
            {mode === 'template' ? 'Nombre de plantilla' : 'Nombre de tarjeta'}
          </label>
          <input
            className="input text-xs py-1.5"
            placeholder="Sin nombre..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {mode === 'template' && (
            <div className="mt-2">
              <label className="label text-[10px]">Categoría</label>
              <select
                className="input text-xs py-1.5"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Elige categoría...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          {mode === 'instance' && (
            <div className="mt-2">
              <label className="label text-[10px]">Carpeta</label>
              <select
                className="input text-xs py-1.5"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">Sin carpeta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Toolbar
          designer={designer}
          onSave={handleSave}
          onExport={mode === 'instance' ? handleExport : undefined}
          saving={saving}
        />
      </aside>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8 bg-gray-100">
        {loading ? (
          <div className="text-gray-400">
            <Spinner size={32} />
          </div>
        ) : (
          <div
            className="shadow-2xl rounded-sm"
            style={{ lineHeight: 0 }}
          >
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Right properties */}
      {designer.selected && (
        <aside className="w-48 shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          <PropertiesPanel
            selected={designer.selected}
            onChange={designer.updateSelected}
          />
        </aside>
      )}

      {/* Save modal — opens only if no name yet */}
      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title="Guardar diseño" size="sm">
        <div className="p-5 space-y-4">
          <div>
            <label className="label">
              {mode === 'template' ? 'Nombre de la plantilla' : 'Nombre de la tarjeta'}
            </label>
            <input
              autoFocus
              className="input"
              placeholder="Ej: Boda Villa Laureana"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSave()}
            />
          </div>
          {mode === 'template' && (
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Elige una categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          {mode === 'instance' && (
            <div>
              <label className="label">Carpeta (opcional)</label>
              <select className="input" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                <option value="">Sin carpeta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowSaveModal(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={doSave}
              disabled={saving || !name.trim() || (mode === 'template' && !categoryId)}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? <Spinner size={14} /> : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
