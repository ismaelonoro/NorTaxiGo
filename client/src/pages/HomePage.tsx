import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookTemplate, FolderOpen, Layers } from 'lucide-react';
import { getTemplates, getInstances, getCategories } from '@/lib/api';
import type { Template, Instance } from '@/types';
import Spinner from '@/components/ui/Spinner';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ templates: 0, instances: 0, categories: 0 });
  const [recent, setRecent] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTemplates(), getInstances(), getCategories()])
      .then(([templates, instances, categories]) => {
        setStats({ templates: templates.length, instances: instances.length, categories: categories.length });
        setRecent(instances.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Plantillas', value: stats.templates, icon: BookTemplate, color: 'text-gold-600', bg: 'bg-gold-50' },
    { label: 'Mis noras', value: stats.instances, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Categorías', value: stats.categories, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title mb-1">Bienvenida 👋</h1>
        <p className="text-sm text-gray-500">Crea noras elegantes para tus eventos de taxi.</p>
      </div>

      {/* Quick action */}
      <div className="card p-6 mb-8 bg-gradient-to-br from-gold-500 to-gold-600 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1 font-display">Nueva nora</h2>
            <p className="text-gold-100 text-sm">Elige una plantilla y personalízala en segundos.</p>
          </div>
          <button
            onClick={() => navigate('/instancias/nueva')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-gold-600 text-sm font-semibold rounded-lg hover:bg-gold-50 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Crear nora
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent instances */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recientes</h2>
          <button
            onClick={() => navigate('/instancias')}
            className="text-xs text-gold-600 hover:text-gold-700 font-medium"
          >
            Ver todas →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-400">
            <Spinner />
          </div>
        ) : recent.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <p className="text-sm">Aún no has creado ninguna nora.</p>
            <button
              onClick={() => navigate('/instancias/nueva')}
              className="mt-3 btn-primary"
            >
              <Plus size={14} /> Crear primera nora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recent.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onClick={() => navigate(`/instancias/${instance.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InstanceCard({ instance, onClick }: { instance: Instance; onClick: () => void }) {
  return (
    <div className="card-hover" onClick={onClick}>
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-cream-100 rounded-t-xl overflow-hidden">
        {instance.thumbnail ? (
          <img src={instance.thumbnail} alt={instance.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
            🚕
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{instance.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {instance.folder?.name ?? 'Sin carpeta'}
        </p>
      </div>
    </div>
  );
}

// Needed for types-only import
export type { Template };
