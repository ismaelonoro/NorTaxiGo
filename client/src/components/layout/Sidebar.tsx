import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookTemplate, FolderOpen, Settings, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

const nav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/plantillas', label: 'Plantillas', icon: BookTemplate },
  { to: '/instancias', label: 'Mis noras', icon: FolderOpen },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="w-56 h-full bg-white border-r border-gray-100 flex flex-col">
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
            onClick={onNavigate}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </button>
        <p className="text-[10px] text-gray-400 px-3 pt-2">© 2025 NorTaxiGo</p>
      </div>
    </div>
  );
}
