import React, { useState, useEffect } from 'react';
import DeploymentManagementSystem from './components/DeploymentManagementSystem'
import LoginForm from './components/LoginForm'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for saved authentication state
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (success) => {
    if (success) {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <DeploymentManagementSystem onLogout={handleLogout} />
    </div>
  )
}

export default App
