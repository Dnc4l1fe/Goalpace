import { useState, useEffect } from 'react';
import GoalCard from '../components/GoalCard';
import CreateGoalModal from '../components/CreateGoalModal';
import LogProgressModal from '../components/LogProgressModal';
import { useToast } from '../components/Toast';
import { fetchGoals, getOrCreateUser } from '../api/goals';

export default function Dashboard({ email }) {
  const [goals, setGoals] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logGoal, setLogGoal] = useState(null);
  const toast = useToast();

  useEffect(() => {
    initUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const initUser = async () => {
    try {
      const userData = await getOrCreateUser(email);
      setUser(userData);
      loadGoals(userData.id);
    } catch (err) {
      toast.error('Не удалось инициализировать пользователя');
    }
  };

  const loadGoals = async (userId) => {
    setLoading(true);
    try {
      const data = await fetchGoals(userId);
      setGoals(data);
    } catch (err) {
      toast.error('Не удалось загрузить цели');
    } finally {
      setLoading(false);
    }
  };

  const handleLogProgress = (goal) => {
    setLogGoal(goal);
  };

  const handleLogSuccess = () => {
    if (user) {
      loadGoals(user.id);
    }
  };

  const handleCreateSuccess = () => {
    if (user) {
      loadGoals(user.id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <span>+</span>
          <span>Создать</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">🎯</div>
          <div className="text-gray-500 mb-2">Целей пока нет</div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-500 hover:underline"
          >
            Создать первую цель
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onLogProgress={handleLogProgress}
              onRefresh={() => { if(user) loadGoals(user.id); }}
            />
          ))}
        </div>
      )}

      {showCreateModal && user && (
        <CreateGoalModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {logGoal && (
        <LogProgressModal
          goal={logGoal}
          onClose={() => setLogGoal(null)}
          onSuccess={handleLogSuccess}
        />
      )}
    </div>
  );
}
