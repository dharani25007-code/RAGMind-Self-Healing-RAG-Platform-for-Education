import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, MessageSquare, FolderOpen, BookOpen, Zap } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',    icon: Upload,          label: 'Upload Files' },
  { to: '/chat',      icon: MessageSquare,   label: 'Ask AI' },
  { to: '/sessions',  icon: FolderOpen,      label: 'Sessions' },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <BookOpen size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">StudyAI</div>
              <div className="text-[10px] text-gray-500 flex items-center gap-1">
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 py-4" />
      </aside>

      <main className="flex-1 overflow-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  )
}
