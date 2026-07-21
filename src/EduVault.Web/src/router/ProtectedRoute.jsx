import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const roleRoutes = {
  superadmin: '/super-admin/dashboard',
  schooladmin: '/school-admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token, maintenanceActive } = useAuth();
  const userRole = user?.role?.toLowerCase();

  if (maintenanceActive && user && userRole !== 'superadmin' && userRole !== 'schooladmin') {
    return <Navigate to="/maintenance" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    // If user's role is not authorized, redirect to their authorized landing page
    return <Navigate to={roleRoutes[userRole] || '/'} replace />;
  }

  return <Outlet />;
};
