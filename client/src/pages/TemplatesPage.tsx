import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { getTemplates, getCategories, deleteTemplate } from '@/lib/api';
import type { Template, Category } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [t, c] = await Promise.all([
      getTemplates(selectedCategory || undefined),
      getCategories(),
    ]);
    setTemplates(t);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedCategory]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la plantilla "${name}"?`)) return;
    await deleteTemplate(id);
    toast.success('Plantilla eliminada');
    load();
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Plantillas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Diseña y gestiona tus plantillas de tarjetas.</p>
        </div>
        <button onClick={() => navigate('/plantillas/nueva')} className="btn-primary">
          <Plus size={16} />
          Nueva plantilla
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Buscar plantillas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              !selectedCategory
                ? 'bg-gold-500 text-white border-gold-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-gold-500 text-white border-gold-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No hay plantillas"
          description="Crea tu primera plantilla eligiendo una categoría y diseñando el fondo."
          action={
            <button onClick={() => navigate('/plantillas/nueva')} className="btn-primary">
              <Plus size={14} /> Crear plantilla
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => navigate(`/plantillas/${template.id}`)}
              onDelete={() => handleDelete(template.id, template.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card group">
      {/* Thumbnail */}
      <div
        className="aspect-[3/4] bg-cream-100 rounded-t-xl overflow-hidden cursor-pointer"
        onClick={onEdit}
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
            <span className="text-3xl">{template.category.icon}</span>
            <span className="text-xs">Sin previsualización</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate mb-0.5">{template.name}</p>
        <span
          className="badge text-xs"
          style={{ backgroundColor: `${template.category.color}18`, color: template.category.color }}
        >
          {template.category.icon} {template.category.name}
        </span>

        {/* Actions */}
        <div className="flex gap-1.5 mt-3">
          <button onClick={onEdit} className="btn-secondary flex-1 justify-center text-xs py-1.5">
            <Pencil size={12} /> Editar
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
