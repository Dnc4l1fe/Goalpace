import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('goalpace_email') || '');

  const handleLogin = (userEmail) => {
    localStorage.setItem('goalpace_email', userEmail);
    setEmail(userEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('goalpace_email');
    setEmail('');
  };

  if (!email) {
    return (
      <ToastProvider>
        <LoginPage onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-100">
          <Sidebar email={email} onLogout={handleLogout} />
          <main className="flex-1 p-6 pt-16 md:pt-6 overflow-y-auto h-screen">
            <Routes>
              <Route path="/" element={<Dashboard email={email} />} />
              <Route path="/analytics" element={<Analytics email={email} />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
