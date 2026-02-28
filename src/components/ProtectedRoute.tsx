import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { FirebaseUser } from '../services/authService';

interface ProtectedRouteProps {
  user: FirebaseUser | null;
  allowedRoles: string[];
  children: ReactNode;
  isDataLoading: boolean;
}

const ProtectedRoute = ({ user, allowedRoles, children, isDataLoading }: ProtectedRouteProps) => {
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.role || user.role === 'NO_ROLE' || !allowedRoles.includes(user.role)) {
    console.error("Грешка при достъп! Потребител:", user.email, "Роля:", user.role);
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="bg-slate-900 p-8 rounded-2xl border border-red-500/30 text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Достъпът е ограничен</h2>
          <p className="text-slate-400 mb-6">
            Вашият акаунт ({user.email}) няма необходимите права (Роля: {user.role}).
          </p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Към входната страница
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;