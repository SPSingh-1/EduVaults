import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  BookMarked, 
  History, 
  Sliders, 
  User 
} from 'lucide-react';

const libraryLinks = [
  { pageKey: 'library.dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/library/dashboard' },
  { pageKey: 'library.catalog', icon: BookOpen, label: 'Book Catalog', path: '/library/catalog' },
  { pageKey: 'library.issue_return', icon: BookMarked, label: 'Issue & Return', path: '/library/issue-return' },
  { pageKey: 'library.transactions', icon: History, label: 'Loans & History', path: '/library/transactions' },
  { pageKey: 'library.settings', icon: Sliders, label: 'Fine & Loan Rules', path: '/library/settings' },
  { pageKey: 'library.profile', icon: User, label: 'My Profile', path: '/library/profile' },
];

const LibrarianLayout = () => {
  const { user } = useAuth();

  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/library') || p.pageKey?.startsWith('library'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/library') || p.pageKey?.startsWith('library')))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(p => ({
          pageKey: p.pageKey,
          icon: p.icon || 'Layers',
          label: p.pageName,
          path: p.route
        }))
    : libraryLinks;

  return (
    <div className="flex">
      <Sidebar links={finalLinks} role="librarian" />
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default LibrarianLayout;
