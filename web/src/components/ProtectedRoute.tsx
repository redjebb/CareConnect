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
  // 1. Докато Firebase проверява сесията, показваме зареждане
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Ако няма логнат потребител - обратно към входа
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 3. Ако ролята на потребителя не е в списъка с разрешените - обратно към входа
  if (!user.role || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 4. Ако всичко е наред - пускаме потребителя до страницата
  return <>{children}</>;
};

export default ProtectedRoute;