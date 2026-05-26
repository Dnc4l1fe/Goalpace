import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Введите email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Некорректный формат email');
      return;
    }

    onLogin(trimmed);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="w-8 h-8" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="#3B82F6" />
            <circle cx="32" cy="32" r="20" fill="#fff" />
            <circle cx="32" cy="32" r="14" fill="#3B82F6" />
            <circle cx="32" cy="32" r="7" fill="#fff" />
            <circle cx="32" cy="32" r="3" fill="#3B82F6" />
          </svg>
          <h1 className="text-2xl font-bold">GoalPace</h1>
        </div>
        <p className="text-gray-500 text-sm text-center mb-6">
          Войдите, чтобы продолжить
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="user@example.com"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
