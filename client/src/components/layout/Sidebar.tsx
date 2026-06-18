import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookTemplate, FolderOpen, Settings } from 'lucide-react';

const nav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/plantillas', label: 'Plantillas', icon: BookTemplate },
  { to: '/instancias', label: 'Mis tarjetas', icon: FolderOpen },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100 flex justify-center">
        <img src="/logo.png" alt="NorTaxiGo" className="h-24 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">© 2025 Nort Taxi</p>
      </div>
    </aside>
  );
}
