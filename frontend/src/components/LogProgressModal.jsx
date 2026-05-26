import { useState } from 'react';
import { createLog } from '../api/goals';

export default function LogProgressModal({ goal, onClose, onSuccess }) {
  const [subgoalId, setSubgoalId] = useState(goal.plan?.[0]?.id || '');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('min');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isNaN(value)) return;

    setLoading(true);
    setError('');

    try {
      const minutes = unit === 'hours' ? parseFloat(value) * 60 : parseFloat(value);
      
      await createLog({
        goal_id: goal.id,
        subgoal_id: subgoalId || null,
        log_date: new Date().toISOString().split('T')[0],
        minutes_spent: goal.type === 'time' ? Math.round(minutes) : 0,
        count_done: goal.type === 'count' ? parseInt(value) : 0
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Записать прогресс</h2>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">{goal.type === 'time' ? '⏱' : '📊'}</span>
          <div>
            <div className="text-sm text-gray-500">Цель</div>
            <div className="font-medium">{goal.title}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {goal.plan && goal.plan.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Задача</label>
              <select
                value={subgoalId}
                onChange={(e) => setSubgoalId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {goal.plan.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.title} ({sub.current} / {sub.target})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">
                {goal.type === 'time' ? 'Время' : 'Количество'}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={goal.type === 'time' ? '30' : '1'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                step="any"
              />
            </div>

            {goal.type === 'time' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ед. изм.</label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setUnit('min')}
                    className={`px-3 py-2 ${unit === 'min' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  >
                    Мин
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('hours')}
                    className={`px-3 py-2 ${unit === 'hours' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  >
                    Часы
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !value}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
