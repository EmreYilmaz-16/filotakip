import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, ClipboardList,
  Fuel, Wrench, AlertTriangle, BarChart3, UserCog, X, MapPin, FileText, Receipt, ShieldAlert
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Truck, label: 'Araçlar' },
  { to: '/drivers', icon: Users, label: 'Sürücüler' },
  { to: '/assignments', icon: ClipboardList, label: 'Zimmetler' },
  { to: '/fuel', icon: Fuel, label: 'Yakıt Takibi' },
  { to: '/trips', icon: MapPin, label: 'Sefer Defteri' },
  { to: '/maintenance', icon: Wrench, label: 'Bakım Takibi' },
  { to: '/faults', icon: AlertTriangle, label: 'Arıza Takibi' },
  { to: '/accidents', icon: ShieldAlert, label: 'Kaza Kayıtları' },
  { to: '/driver-docs', icon: FileText, label: 'Sürücü Belgeleri' },
  { to: '/taxes', icon: Receipt, label: 'Vergi Takibi' },
  { to: '/reports', icon: BarChart3, label: 'Raporlar' },
]

export default function Sidebar({ open, onClose }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  return (
    <>
      {/* Overlay - mobil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white flex flex-col
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Truck size={24} className="text-blue-300" />
            <span className="font-bold text-lg">FiloTakip</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-blue-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/users"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <UserCog size={18} />
              Kullanıcılar
            </NavLink>
          )}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-blue-800">
          <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
          <p className="text-xs text-blue-300 capitalize">{user?.role}</p>
        </div>
      </aside>
    </>
  )
}
