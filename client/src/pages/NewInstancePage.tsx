import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus } from 'lucide-react';
import { getTemplates, getCategories } from '@/lib/api';
import type { Template, Category } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';

export default function NewInstancePage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTemplates(), getCategories()])
      .then(([t, c]) => { setTemplates(t); setCategories(c); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter((t) =>
    (!selected || t.categoryId === selected) &&
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/instancias')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Nueva nora</h1>
          <p className="text-sm text-gray-500 mt-0.5">Elige una plantilla para empezar.</p>
        </div>
      </div>

      {/* Skip template */}
      <div
        className="card p-4 mb-6 flex items-center justify-between cursor-pointer border-2 border-dashed border-gray-200 hover:border-gold-400 transition-colors group"
        onClick={() => navigate('/diseñador?mode=instance')}
      >
        <div>
          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Empezar desde cero</p>
          <p className="text-xs text-gray-400">Lienzo en blanco, sin plantilla</p>
        </div>
        <Plus size={20} className="text-gray-300 group-hover:text-gold-500 transition-colors" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Buscar plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelected('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              !selected ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selected === c.id ? 'bg-gold-500 text-white border-gold-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No hay plantillas"
          description="Crea primero una plantilla desde la sección Plantillas."
          action={
            <button onClick={() => navigate('/plantillas/nueva')} className="btn-primary">
              <Plus size={14} /> Crear plantilla
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="card-hover"
              onClick={() => navigate(`/diseñador?mode=instance&templateId=${template.id}`)}
            >
              <div className="aspect-[3/4] bg-cream-100 rounded-t-xl overflow-hidden border-b border-gray-200">
                {template.thumbnail ? (
                  <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                    <span className="text-3xl">{template.category.icon}</span>
                    <span className="text-xs">Sin previsualización</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                <span
                  className="badge text-[10px] mt-0.5"
                  style={{ backgroundColor: `${template.category.color}18`, color: template.category.color }}
                >
                  {template.category.icon} {template.category.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
