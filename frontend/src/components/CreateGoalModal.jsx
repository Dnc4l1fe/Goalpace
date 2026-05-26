import { useState } from 'react';
import { createGoal, API_URL } from '../api/goals';

export default function CreateGoalModal({ userId, onClose, onSuccess }) {
  const emojiOptions = ['🎯', '📚', '💻', '🏃', '🧠', '📝', '🔥', '🚀', '💡', '🏆', '✅', '📈', '💪', '🎓', '🎨', '🏋️', '⭐', '📖'];

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [type, setType] = useState('time');
  const [timeUnit, setTimeUnit] = useState('hours');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const [subgoals, setSubgoals] = useState([{ title: '', target: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/ai/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (!res.ok) {
        throw new Error('Ошибка генерации. Проверьте подключение локального ИИ.');
      }

      const data = await res.json();

      if (data.title) setTitle(data.title.replace(/^[\s\p{Emoji}]+/gu, ''));
      if (data.target_type) {
        const isTime = data.target_type === 'time';
        setType(isTime ? 'time' : 'count');
        if (isTime) {
          setTimeUnit(data.time_unit === 'minutes' ? 'minutes' : 'hours');
        }
      }

      if (data.end_date) {
        setPeriodEnd(data.end_date);
        setPeriodStart(new Date().toISOString().slice(0, 10));
      }

      if (data.subgoals && data.subgoals.length > 0) {
        const mappedSubgoals = data.subgoals.map(s => ({
          title: s.title,
          target: s.target_total.toString()
        }));
        setSubgoals(mappedSubgoals);
      }

      setShowAIPrompt(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const addSubgoal = () => {
    setSubgoals([...subgoals, { title: '', target: '' }]);
  };

  const removeSubgoal = (index) => {
    if (subgoals.length > 1) {
      setSubgoals(subgoals.filter((_, i) => i !== index));
    }
  };

  const updateSubgoal = (index, field, value) => {
    const updated = [...subgoals];
    updated[index][field] = value;
    setSubgoals(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Введите название цели');
      return;
    }

    const validSubgoals = subgoals.filter(s => s.title.trim() && s.target);
    if (validSubgoals.length === 0) {
      setError('Добавьте хотя бы одну подзадачу');
      return;
    }

    if (periodStart > periodEnd) {
      setError('Дата начала должна быть раньше даты окончания');
      return;
    }

    const parsedSubgoals = validSubgoals.map((s) => ({
      title: s.title.trim(),
      target: parseFloat(s.target)
    }));

    const normalizedSubgoals = type === 'time' && timeUnit === 'minutes'
      ? parsedSubgoals.map((s) => ({
          ...s,
          target: Number((s.target / 60).toFixed(2))
        }))
      : parsedSubgoals;

    const totalTarget = Number(
      normalizedSubgoals.reduce((sum, item) => sum + item.target, 0).toFixed(2)
    );

    setLoading(true);
    setError('');

    try {
      await createGoal(userId, {
        title: `${emoji} ${title.trim()}`,
        type,
        target: totalTarget,
        unit: type === 'time' ? 'hours' : 'count',
        period_start: periodStart,
        period_end: periodEnd,
        priority: 2,
        notes: null,
        plan: normalizedSubgoals
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
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 relative">
          <h2 className="text-xl font-semibold">Новая цель</h2>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowAIPrompt(!showAIPrompt)}
              className="flex items-center gap-2 px-4 py-2 border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors font-medium text-sm shadow-sm"
              title="Сгенерировать план с ИИ"
            >
              <span className="text-lg">✨</span> Сгенерировать с ИИ
            </button>
            
            {showTooltip && (
              <div className="absolute right-0 top-12 w-72 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg z-10 font-normal">
                Для лучшего результата опишите свой текущий уровень, желаемую глубину погружения и сколько часов в день вы сможете выполнять цель. Чем больше деталей, тем лучше план и точнее дедлайн!
              </div>
            )}
          </div>
        </div>

        {showAIPrompt && (
          <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-indigo-800 font-medium">ИИ анализирует и составляет план...</p>
              </div>
            )}
            
            <h3 className="text-md font-medium text-indigo-900 mb-2 flex items-center gap-2">
              <span>✨</span> Сгенерировать с помощью ИИ
            </h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              placeholder="Я новичок, хочу освоить базу языка Python за месяц. Готов уделять 2 часа в день..."
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 h-24 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAIPrompt(false)}
                className="px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                Скрыть
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!aiPrompt.trim() || isGenerating}
                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Создать план
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Эмодзи цели</label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  className={`w-10 h-10 rounded-lg border text-xl ${
                    emoji === item
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Изучить Python"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Тип цели</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setType('time')}
                className={`flex-1 py-2 ${type === 'time' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Время
              </button>
              <button
                type="button"
                onClick={() => setType('count')}
                className={`flex-1 py-2 ${type === 'count' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                Количество
              </button>
            </div>
          </div>

          {type === 'time' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Единица времени</label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTimeUnit('minutes')}
                  className={`flex-1 py-2 ${timeUnit === 'minutes' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                >
                  Минуты
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('hours')}
                  className={`flex-1 py-2 ${timeUnit === 'hours' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                >
                  Часы
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дата начала</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дата окончания</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-600">Подзадачи</label>
              <button
                type="button"
                onClick={addSubgoal}
                className="text-blue-500 text-sm hover:underline"
              >
                + Добавить
              </button>
            </div>

            <div className="space-y-2">
              {subgoals.map((sub, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={sub.title}
                    onChange={(e) => updateSubgoal(index, 'title', e.target.value)}
                    placeholder="Название задачи"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    value={sub.target}
                    onChange={(e) => updateSubgoal(index, 'target', e.target.value)}
                    placeholder={
                      type === 'time'
                        ? (timeUnit === 'minutes' ? 'Минуты' : 'Часы')
                        : 'Количество'
                    }
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                    min="1"
                    step="any"
                  />
                  {subgoals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubgoal(index)}
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              disabled={loading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
