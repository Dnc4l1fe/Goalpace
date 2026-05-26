import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ email, onLogout }) {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `block px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-100 text-blue-700 font-medium' 
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
        aria-label="Меню"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-50
        w-56 bg-white border-r border-gray-200 p-4 h-screen flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="#3B82F6" />
              <circle cx="32" cy="32" r="20" fill="#fff" />
              <circle cx="32" cy="32" r="14" fill="#3B82F6" />
              <circle cx="32" cy="32" r="7" fill="#fff" />
              <circle cx="32" cy="32" r="3" fill="#3B82F6" />
            </svg>
            <h1 className="text-xl font-bold text-gray-800">GoalPace</h1>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-1 flex-1">
          <NavLink to="/" className={linkClass} onClick={() => setOpen(false)}>
            Дашборд
          </NavLink>
          <NavLink to="/analytics" className={linkClass} onClick={() => setOpen(false)}>
            Аналитика
          </NavLink>
        </nav>
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="text-xs text-gray-500 truncate px-2 mb-2" title={email}>
            {email}
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
