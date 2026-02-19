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
  // Покажи лоудър не само ако данните се зареждат, но и ако потребителят е там, но ролята му липсва
  if (isDataLoading || (user && !user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!user.role || !allowedRoles.includes(user.role)) {
    // Пренасочване към правилния Dashboard при грешен достъп
    return <Navigate to={user.role === 'DRIVER' ? "/driver/view" : "/admin/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;