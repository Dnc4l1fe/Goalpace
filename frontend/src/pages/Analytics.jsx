import { useEffect, useMemo, useState } from 'react';
import {
  fetchMonthReport,
  fetchOverallSummary,
  getOrCreateUser
} from '../api/goals';
import { useToast } from '../components/Toast';

function formatDateLabel(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatMonthInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function Analytics({ email }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(formatMonthInput(new Date()));
  const toast = useToast();

  useEffect(() => {
    loadAnalytics(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const loadAnalytics = async (monthValue) => {
    setLoading(true);
    setError('');

    try {
      const user = await getOrCreateUser(email);
      const [year, month] = monthValue.split('-').map(Number);

      const [summaryData, monthData] = await Promise.all([
        fetchOverallSummary(user.id),
        fetchMonthReport(user.id, year, month)
      ]);

      setSummary(summaryData);
      setDays(monthData.days ?? []);
    } catch (err) {
      setError('Не удалось загрузить аналитику. Проверь, что backend запущен.');
      toast.error('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  const monthStats = useMemo(() => {
    if (!days.length) return { totalHours: 0, totalCount: 0, activeDays: 0, streak: 0, avgHours: 0 };

    const totalHours = days.reduce((sum, d) => sum + d.total_hours, 0);
    const totalCount = days.reduce((sum, d) => sum + d.total_count, 0);
    const activeDays = days.filter(d => d.total_hours > 0 || d.total_count > 0).length;
    const avgHours = activeDays > 0 ? totalHours / activeDays : 0;

    const sorted = [...days].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const dayDate = new Date(sorted[i].date);
      dayDate.setHours(0, 0, 0, 0);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);

      if (dayDate.getTime() === expected.getTime() && (sorted[i].total_hours > 0 || sorted[i].total_count > 0)) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalCount,
      activeDays,
      streak,
      avgHours: Math.round(avgHours * 10) / 10
    };
  }, [days]);

  const [tooltip, setTooltip] = useState(null);
  const [chartMode, setChartMode] = useState('all');

  const maxByMode = useMemo(() => {
    if (!days.length) return 1;
    if (chartMode === 'time') return Math.max(...days.map(d => d.total_hours), 1);
    if (chartMode === 'count') return Math.max(...days.map(d => d.total_count), 1);
    return Math.max(...days.map(d => d.total_hours + d.total_count), 1);
  }, [days, chartMode]);

  const warningCount = summary ? summary.at_risk + summary.behind : 0;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="month" className="text-sm text-gray-600">Месяц:</label>
          <input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-gray-500 text-sm">Всего целей</div>
          <div className="text-3xl font-bold mt-1">
            {loading ? '—' : (summary?.total_goals ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-gray-500 text-sm">По плану</div>
          <div className="text-3xl font-bold mt-1 text-green-500">
            {loading ? '—' : (summary?.on_track ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-gray-500 text-sm">Требуют внимания</div>
          <div className="text-3xl font-bold mt-1 text-amber-500">
            {loading ? '—' : warningCount}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-gray-500 text-sm">Средний прогресс</div>
          <div className="text-3xl font-bold mt-1 text-blue-500">
            {loading ? '—' : `${summary?.total_percent ?? 0}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-indigo-600">{loading ? '—' : monthStats.totalHours}</div>
          <div className="text-xs text-gray-500 mt-1">Часов за месяц</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-indigo-600">{loading ? '—' : monthStats.totalCount}</div>
          <div className="text-xs text-gray-500 mt-1">Действий</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-indigo-600">{loading ? '—' : monthStats.activeDays}</div>
          <div className="text-xs text-gray-500 mt-1">Активных дней</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-indigo-600">{loading ? '—' : monthStats.avgHours}</div>
          <div className="text-xs text-gray-500 mt-1">Ч/день (средн.)</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-orange-500">{loading ? '—' : monthStats.streak}</div>
          <div className="text-xs text-gray-500 mt-1">Дней подряд</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Активность по дням</h2>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setChartMode('all')}
              className={`px-3 py-1.5 ${chartMode === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Всё
            </button>
            <button
              onClick={() => setChartMode('time')}
              className={`px-3 py-1.5 ${chartMode === 'time' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Время
            </button>
            <button
              onClick={() => setChartMode('count')}
              className={`px-3 py-1.5 ${chartMode === 'count' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Количество
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Загрузка...</div>
        ) : days.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            За выбранный месяц нет логов
          </div>
        ) : (
          <div className="relative flex">
            <div className="w-8 h-52 flex flex-col justify-between shrink-0">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="text-[10px] text-gray-300 text-right leading-none">
                  {Math.round(maxByMode * (1 - i / 3) * 10) / 10}
                </span>
              ))}
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-x-0 top-0 h-52 flex flex-col justify-between pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border-t border-gray-100" />
                ))}
              </div>

              <div className="flex gap-1 relative z-10">
                {days.map((day) => {
                  const hoursPercent = maxByMode > 0 ? (day.total_hours / maxByMode) * 100 : 0;
                  const countPercent = maxByMode > 0 ? (day.total_count / maxByMode) * 100 : 0;
                  const hasActivity = day.total_hours > 0 || day.total_count > 0;

                  let barContent;
                  if (chartMode === 'all') {
                    const totalPercent = Math.max(hoursPercent + countPercent, hasActivity ? 2 : 0);
                    barContent = (
                      <div
                        className="w-full flex flex-col justify-end rounded-t-md overflow-hidden"
                        style={{ height: `${Math.min(totalPercent, 100)}%`, minHeight: hasActivity ? '4px' : '2px' }}
                      >
                        {day.total_count > 0 && (
                          <div className="w-full bg-green-400 hover:bg-green-500 transition-all" style={{ flex: `${countPercent} 0 0%` }} />
                        )}
                        {day.total_hours > 0 && (
                          <div className="w-full bg-blue-500 hover:bg-blue-600 transition-all" style={{ flex: `${hoursPercent} 0 0%` }} />
                        )}
                      </div>
                    );
                  } else {
                    const value = chartMode === 'time' ? day.total_hours : day.total_count;
                    const percent = Math.max((value / maxByMode) * 100, value > 0 ? 2 : 0);
                    const color = chartMode === 'time' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600';
                    barContent = (
                      <div
                        className={`w-full rounded-t-md transition-all ${value > 0 ? color : 'bg-gray-200'}`}
                        style={{ height: `${Math.min(percent, 100)}%`, minHeight: value > 0 ? '4px' : '2px' }}
                      />
                    );
                  }

                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[18px] max-w-[32px] flex flex-col items-center cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ day, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="w-full h-52 flex items-end">
                        {barContent}
                      </div>
                      <span className="text-[10px] text-gray-400 leading-none mt-1">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {chartMode === 'all' && (
              <div className="flex gap-4 mt-2 ml-8 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span>Время (ч)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-400" />
                  <span>Количество (шт.)</span>
                </div>
              </div>
            )}

            {tooltip && (
              <div
                className="fixed bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 whitespace-nowrap pointer-events-none"
                style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
              >
                <div className="font-medium">{formatDateLabel(tooltip.day.date)}</div>
                {tooltip.day.total_hours > 0 && <div>{tooltip.day.total_hours} ч</div>}
                {tooltip.day.total_count > 0 && <div>{tooltip.day.total_count} шт.</div>}
                {!tooltip.day.total_hours && !tooltip.day.total_count && <div>Нет активности</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Последняя активность</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Загрузка...</div>
        ) : days.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Записей пока нет</div>
        ) : (
          <div className="space-y-2">
            {[...days]
              .filter(d => d.total_hours > 0 || d.total_count > 0)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map((day) => (
              <div
                key={day.date}
                className="border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm min-w-[90px]">
                  {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  {day.total_hours > 0 && <span>{day.total_hours} ч</span>}
                  {day.total_count > 0 && <span>{day.total_count} шт.</span>}
                </div>
                <div className="text-xs text-gray-400">
                  {day.goals_active} {day.goals_active === 1 ? 'цель' : day.goals_active < 5 ? 'цели' : 'целей'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
