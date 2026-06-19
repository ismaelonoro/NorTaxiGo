import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDesigner, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/components/designer/useDesigner';
import Toolbar from '@/components/designer/Toolbar';
import PropertiesPanel from '@/components/designer/PropertiesPanel';
import AlignmentPanel from '@/components/designer/AlignmentPanel';
import MultiTextPanel from '@/components/designer/MultiTextPanel';
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
  const location = useLocation();
  const mode: Mode = location.pathname.startsWith('/plantillas') ? 'template' : 'instance';

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

  // Pending design to load once canvas is ready
  const pendingDesign = useRef<string | null>(null);

  // Step 1: fetch metadata (name, categories, folders, design JSON)
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
            pendingDesign.current = t.design;
          } else {
            const inst = await getInstance(id);
            setName(inst.name);
            setFolderId(inst.folderId ?? '');
            pendingDesign.current = inst.design;
          }
        } catch {
          toast.error('No se pudo cargar el diseño');
        }
      } else if (mode === 'instance') {
        const templateId = searchParams.get('templateId');
        if (templateId) {
          try {
            const t = await getTemplate(templateId);
            pendingDesign.current = t.design;
          } catch {}
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  // Step 2: once canvas is ready AND data has loaded, apply the design
  useEffect(() => {
    if (!designer.ready || loading) return;
    if (pendingDesign.current) {
      designer.loadFromJSON(pendingDesign.current);
      pendingDesign.current = null;
    }
  }, [designer.ready, loading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;
      // Don't fire when user is typing inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); designer.undo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); designer.redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [designer.undo, designer.redo]);

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
          navigate(`/plantillas/${t.id}`, { replace: true });
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
    <>
      {/* Mobile: the drag & drop editor isn't usable on a phone — show a notice */}
      <div className="md:hidden min-h-screen flex flex-col items-center justify-center text-center gap-4 p-8 bg-cream-50">
        <img src="/logo.png" alt="NorTaxiGo" className="h-20 w-auto" />
        <h1 className="text-lg font-semibold text-gray-800 font-display">
          El editor está disponible en ordenador
        </h1>
        <p className="text-sm text-gray-500 max-w-xs">
          Diseñar sobre un A4 necesita una pantalla grande. Desde el móvil puedes ver,
          duplicar y descargar tus diseños; para editarlos, abre NorTaxiGo en un ordenador.
        </p>
        <button onClick={() => navigate(backUrl)} className="btn-primary">
          <ArrowLeft size={15} /> Volver
        </button>
      </div>

      {/* Editor — large screens only */}
      <div className="hidden md:flex h-screen overflow-hidden bg-gray-50">
      {/* Left toolbar */}
      <aside className="w-52 shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
          <button
            onClick={() => navigate(backUrl)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="text-xs font-medium text-gray-700 truncate">{title}</span>
        </div>

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

      {/* Canvas area — canvas is always mounted (needed for Fabric), shown/hidden via opacity */}
      <div className="flex-1 overflow-auto bg-gray-100">
        <div className="min-h-full flex items-center justify-center p-10">
          {loading && (
            <div className="absolute text-gray-400">
              <Spinner size={32} />
            </div>
          )}
          {/* CSS zoom wrapper — canvas coords stay in document units (794×1123) */}
          <div
            style={{
              transform: `scale(${designer.zoom})`,
              transformOrigin: 'top center',
              // Reserve space so the scrollable area knows the scaled size
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              marginBottom: `${CANVAS_HEIGHT * (designer.zoom - 1)}px`,
            }}
          >
            <div className="shadow-2xl ring-1 ring-gray-300" style={{ lineHeight: 0, display: 'inline-block' }}>
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Right properties panel — always present (fixed width) so selecting an
          element doesn't reflow the canvas and shift things by accident */}
      <aside className="w-48 shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
        {designer.selectionCount > 1 ? (
          <>
            {designer.multiTextSelected && designer.selected && (
              <MultiTextPanel
                count={designer.selectionCount}
                values={designer.selected}
                onChange={designer.updateSelectedTexts}
                usedColors={designer.getUsedTextColors()}
              />
            )}
            <AlignmentPanel
              count={designer.selectionCount}
              onAlign={designer.alignObjects}
            />
          </>
        ) : designer.selected ? (
          <PropertiesPanel
            selected={designer.selected}
            onChange={designer.updateSelected}
            usedColors={designer.getUsedTextColors()}
          />
        ) : (
          <div className="p-4 text-center text-xs text-gray-400">
            Selecciona un elemento del lienzo para ver y editar sus propiedades.
          </div>
        )}
      </aside>

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
    </>
  );
}
