import { useState } from 'react';
import { deleteGoal } from '../api/goals';
import { useToast } from './Toast';
import EditGoalModal from './EditGoalModal';

export default function GoalCard({ goal, onLogProgress, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  const titleString = goal?.title || '';
  const parsedTitle = titleString.match(/^(\p{Extended_Pictographic})\s*(.*)$/u);
  const displayIcon = parsedTitle ? parsedTitle[1] : (goal?.type === 'time' ? '⏱' : '📊');
  const displayTitle = parsedTitle ? parsedTitle[2] : titleString;

  const statusColors = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: '🎉 Выполнено!' },
    on_track: { bg: 'bg-green-100', text: 'text-green-700', label: 'В графике' },
    at_risk: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Риск' },
    behind: { bg: 'bg-red-100', text: 'text-red-700', label: 'Отстаём' },
    overdue: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Время вышло' }
  };

  const formatValue = (val) => {
    if (!val) return goal.unit === 'hours' ? '0 мин' : '0';
    if (goal.unit === 'hours') {
      const h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      if (h > 0 && m > 0) return `${h} ч ${m} мин`;
      if (h > 0) return `${h} ч`;
      return `${m} мин`;
    }
    return `${Number.isInteger(val) ? val : Number(val.toFixed(1))}`;
  };

  const totalCurrent = goal.plan?.reduce((sum, s) => sum + s.current, 0) || 0;
  
  const percent = goal.target > 0 ? (totalCurrent / goal.target) * 100 : 0;

  const daysTotal = Math.ceil(
    (new Date(goal.period_end) - new Date(goal.period_start)) / (1000 * 60 * 60 * 24)
  ) + 1;
  const daysElapsed = Math.max(0, Math.ceil(
    (new Date() - new Date(goal.period_start)) / (1000 * 60 * 60 * 24)
  ));
  const isOverdue = new Date() > new Date(goal.period_end);
  const requiredPercent = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));

  const status = percent >= 100 ? 'completed'
    : isOverdue ? 'overdue'
    : percent >= requiredPercent * 0.85 ? 'on_track' 
    : percent >= requiredPercent * 0.65 ? 'at_risk' 
    : 'behind';
  
  const statusStyle = statusColors[status];

  const hasMultipleSubgoals = goal.plan && goal.plan.length > 1;
  const isSingleSubgoal = goal.plan && goal.plan.length === 1;

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить цель "${displayTitle}"?`)) {
      setIsDeleting(true);
      try {
        await deleteGoal(goal.id);
        if (onRefresh) onRefresh();
      } catch (error) {
        toast.error(error.message);
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative group">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setIsEditing(true)}
          className="text-gray-400 hover:text-blue-500"
          title="Редактировать цель"
        >
          ✎
        </button>
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-gray-400 hover:text-red-500"
          title="Удалить цель"
        >
          ✕
        </button>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-3xl">
          {displayIcon}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800">{displayTitle}</h3>
          {isSingleSubgoal && goal.plan[0].title !== displayTitle && (
            <p className="text-gray-500 text-sm mt-0.5">{goal.plan[0].title}</p>
          )}
          
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-2 py-0.5 rounded text-sm ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            <span className="text-sm text-gray-500">
              Норма на сегодня: {formatValue(goal.unit === 'hours' ? (goal.target * requiredPercent / 100) : Math.ceil(goal.target * requiredPercent / 100))}
            </span>
          </div>

          <div className="mt-3 relative">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'behind' || status === 'overdue' ? 'bg-red-400' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            {status !== 'completed' && (
              <div 
                className="absolute top-0 w-0.5 h-4 bg-red-600"
                style={{ left: `${requiredPercent}%` }}
                title={`Ожидаемый прогресс: ${requiredPercent}%`}
              />
            )}
            <div className="text-right text-sm text-gray-600 mt-1">
              Прогресс: {formatValue(totalCurrent)} / {formatValue(goal.target)} ({Number.isInteger(percent) ? percent : percent.toFixed(1)}%)
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {status !== 'completed' && (
              <button
                onClick={() => onLogProgress(goal)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>▶</span> Внести прогресс
              </button>
            )}
            {hasMultipleSubgoals && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 ${status === 'completed' ? 'flex-1 py-2' : 'w-10 h-10'}`}
              >
                 {status === 'completed' ? (expanded ? 'Скрыть детали ▲' : 'Показать детали ▼') : (expanded ? '▲' : '▼')}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && hasMultipleSubgoals && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Детализация</h4>
          <div className="grid grid-cols-2 gap-3">
            {goal.plan.map((sub) => {
              const subPercent = Math.min(100, (sub.current / sub.target) * 100);
              const isSubCompleted = subPercent >= 100;
              
              return (
                <div key={sub.id} className={`rounded-lg p-3 ${isSubCompleted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm ${isSubCompleted ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                      {sub.title} {isSubCompleted && '✓'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatValue(sub.current)} / {formatValue(sub.target)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isSubCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${subPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {isEditing && (
      <EditGoalModal
        goal={goal}
        onClose={() => setIsEditing(false)}
        onSuccess={onRefresh}
      />
    )}
    </>
  );
}
