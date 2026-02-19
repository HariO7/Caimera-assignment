import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import JoinScreen from './components/JoinScreen';
import QuizScreen from './components/QuizScreen';
import Leaderboard from './components/Leaderboard';

// Persist userId across page refreshes for score continuity
function getOrCreateUserId(): string {
  const existing = localStorage.getItem('mathrace_user_id');
  if (existing) return existing;
  const newId = uuidv4();
  localStorage.setItem('mathrace_user_id', newId);
  return newId;
}

const App: React.FC = () => {
  const [username, setUsername] = useState<string>(() => localStorage.getItem('mathrace_username') || '');
  const userId = getOrCreateUserId();

  const handleJoin = useCallback((name: string) => {
    localStorage.setItem('mathrace_username', name);
    setUsername(name);
  }, []);

  const handleExit = useCallback(() => {
    localStorage.removeItem('mathrace_username');
    localStorage.removeItem('mathrace_user_id');
    setUsername('');
  }, []);

  const isLoggedIn = Boolean(username);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn
              ? <Navigate to="/quiz" replace />
              : <JoinScreen onJoin={handleJoin} />
          }
        />
        <Route
          path="/quiz"
          element={
            isLoggedIn
              ? <QuizScreen username={username} userId={userId} onExit={handleExit} />
              : <Navigate to="/" replace />
          }
        />
        <Route
          path="/leaderboard"
          element={<Leaderboard userId={userId} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
