import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PollView from './components/PollView';
import CreatePoll from './components/CreatePoll';
import Navbar from './components/Navbar';

const API_BASE = 'http://localhost:3001';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [selectedPollId, setSelectedPollId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data.data?.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    setCurrentPage('dashboard');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  const navigate = (page, pollId = null) => {
    setCurrentPage(page);
    if (pollId) {
      setSelectedPollId(pollId);
    }
  };

  const renderCurrentPage = () => {
    if (!token) {
      switch (currentPage) {
        case 'register':
          return <Register onLogin={login} onNavigate={navigate} />;
        default:
          return <Login onLogin={login} onNavigate={navigate} />;
      }
    }

    switch (currentPage) {
      case 'create':
        return <CreatePoll token={token} onNavigate={navigate} />;
      case 'poll':
        return <PollView pollId={selectedPollId} token={token} user={user} onNavigate={navigate} />;
      default:
        return <Dashboard token={token} user={user} onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar 
        user={user} 
        token={token} 
        onLogout={logout} 
        onNavigate={navigate}
        currentPage={currentPage}
      />
      {renderCurrentPage()}
    </div>
  );
}

export default App;