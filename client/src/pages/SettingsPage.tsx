import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FolderPlus, X, Check } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, getFolders, createFolder, updateFolder, deleteFolder } from '@/lib/api';
import type { Category, Folder } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [editingFolder, setEditingFolder] = useState<Partial<Folder> | null>(null);

  const loadAll = async () => {
    const [cats, fols] = await Promise.all([getCategories(), getFolders()]);
    setCategories(cats);
    setFolders(fols);
  };

  useEffect(() => { loadAll(); }, []);

  const saveCat = async () => {
    if (!editingCat?.name?.trim()) return;
    try {
      if (editingCat.id) {
        await updateCategory(editingCat.id, editingCat);
        toast.success('Categoría actualizada');
      } else {
        await createCategory(editingCat);
        toast.success('Categoría creada');
      }
      setEditingCat(null);
      loadAll();
    } catch {
      toast.error('Error al guardar categoría');
    }
  };

  const deleteCat = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Se eliminarán sus plantillas.`)) return;
    await deleteCategory(id);
    toast.success('Categoría eliminada');
    loadAll();
  };

  const saveFolder = async () => {
    if (!editingFolder?.name?.trim()) return;
    try {
      if (editingFolder.id) {
        await updateFolder(editingFolder.id, editingFolder);
        toast.success('Carpeta actualizada');
      } else {
        await createFolder(editingFolder);
        toast.success('Carpeta creada');
      }
      setEditingFolder(null);
      loadAll();
    } catch {
      toast.error('Error al guardar carpeta');
    }
  };

  const deleteFol = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la carpeta "${name}"?`)) return;
    await deleteFolder(id);
    toast.success('Carpeta eliminada');
    loadAll();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona categorías y carpetas.</p>
      </div>

      {/* Categories */}
      <section className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-base">Categorías de plantillas</h2>
          <button
            onClick={() => setEditingCat({ name: '', icon: '🎉', color: '#6B7280' })}
            className="btn-secondary text-xs py-1.5"
          >
            <Plus size={12} /> Nueva
          </button>
        </div>

        {editingCat && (
          <div className="flex gap-2 mb-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
            <input
              autoFocus
              className="input flex-1"
              placeholder="Nombre de categoría"
              value={editingCat.name ?? ''}
              onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveCat()}
            />
            <input
              className="input w-16 text-center"
              placeholder="🎉"
              value={editingCat.icon ?? ''}
              onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
              maxLength={2}
            />
            <input
              type="color"
              className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              value={editingCat.color ?? '#6B7280'}
              onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })}
            />
            <button onClick={saveCat} className="p-2 rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-colors">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingCat(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-cream-50">
              <div className="flex items-center gap-2.5">
                <span>{cat.icon}</span>
                <span className="text-sm text-gray-800">{cat.name}</span>
                <span className="badge text-[10px]" style={{ backgroundColor: `${cat.color}18`, color: cat.color }}>
                  {cat._count?.templates ?? 0} plantillas
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingCat(cat)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteCat(cat.id, cat.name)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Folders */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-base">Carpetas de noras</h2>
          <button
            onClick={() => setEditingFolder({ name: '' })}
            className="btn-secondary text-xs py-1.5"
          >
            <FolderPlus size={12} /> Nueva
          </button>
        </div>

        {editingFolder && (
          <div className="flex gap-2 mb-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
            <input
              autoFocus
              className="input flex-1"
              placeholder="Nombre de carpeta"
              value={editingFolder.name ?? ''}
              onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && saveFolder()}
            />
            <button onClick={saveFolder} className="p-2 rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-colors">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingFolder(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-2">
          {folders.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-cream-50">
              <div className="flex items-center gap-2.5">
                <span className="text-gray-400">📁</span>
                <span className="text-sm text-gray-800">{f.name}</span>
                {f._count && (
                  <span className="badge bg-gray-100 text-gray-500 text-[10px]">
                    {f._count.instances} noras
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingFolder(f)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteFol(f.id, f.name)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
