
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Capture } from './pages/Capture';
import { LoginForm } from './components/LoginForm'; 
import { SignupForm } from './components/SignupForm';

type View = 'LANDING' | 'LOGIN' | 'SIGNUP' | 'DASHBOARD' | 'CAPTURE';

const SESSION_KEY = 'facerec_session_v2';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('LANDING');
  const [loginRole, setLoginRole] = useState<UserRole>(UserRole.STUDENT);

  // Restore session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        // Determine view based on user state
        if (user.role === UserRole.STUDENT && !user.faceDataRegistered) {
          setCurrentView('CAPTURE');
        } else {
          setCurrentView('DASHBOARD');
        }
      } catch (e) {
        console.error("Failed to parse session", e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    // Save session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    
    setCurrentUser(user);
    if (user.role === UserRole.STUDENT && !user.faceDataRegistered) {
      setCurrentView('CAPTURE');
    } else {
      setCurrentView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setCurrentView('LANDING');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'LANDING':
        return (
          <Landing 
            onLogin={(role) => {
              setLoginRole(role);
              setCurrentView('LOGIN');
            }}
            onSignup={() => setCurrentView('SIGNUP')}
          />
        );
      case 'LOGIN':
        return (
          <LoginForm 
            role={loginRole}
            onSuccess={handleLoginSuccess}
            onBack={() => setCurrentView('LANDING')}
          />
        );
      case 'SIGNUP':
        return (
          <SignupForm 
            onSuccess={(user) => {
              // Save session immediately after signup
              localStorage.setItem(SESSION_KEY, JSON.stringify(user));
              setCurrentUser(user);
              setCurrentView('CAPTURE'); 
            }}
            onBack={() => setCurrentView('LANDING')}
          />
        );
      case 'CAPTURE':
        if (!currentUser) return null;
        return (
          <Capture 
            user={currentUser}
            onComplete={(updatedUser) => {
              // Update session with new image data
              localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
              setCurrentUser(updatedUser); 
              setCurrentView('DASHBOARD');
            }}
          />
        );
      case 'DASHBOARD':
        if (!currentUser) return null;
        return currentUser.role === UserRole.ADMIN 
          ? <AdminDashboard /> 
          : <StudentDashboard user={currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={currentUser} onLogout={handleLogout} />
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
