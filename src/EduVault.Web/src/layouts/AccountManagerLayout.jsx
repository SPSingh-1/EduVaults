import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  DollarSign, 
  CalendarCheck, 
  Sliders, 
  Layers, 
  CreditCard, 
  User,
  PieChart
} from 'lucide-react';

const accountLinks = [
  { pageKey: 'account.dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/account/dashboard' },
  { pageKey: 'account.billing', icon: Receipt, label: 'School Billing & Fees', path: '/account/billing' },
  { pageKey: 'account.salaries', icon: DollarSign, label: 'Teacher Salaries', path: '/account/salaries' },
  { pageKey: 'account.salary_rules', icon: Sliders, label: 'Salary Rules (HRA/PF)', path: '/account/salary-rules' },
  { pageKey: 'account.leaves', icon: CalendarCheck, label: 'Leave Requests', path: '/account/leaves' },
  { pageKey: 'account.quotas', icon: Layers, label: 'Leave Quotas (CL/PL)', path: '/account/quotas' },
  { pageKey: 'account.expenses', icon: CreditCard, label: 'Expenses & Vouchers', path: '/account/expenses' },
  { pageKey: 'account.profile', icon: User, label: 'My Profile', path: '/account/profile' },
];

const AccountManagerLayout = () => {
  const { user } = useAuth();

  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/account') || p.pageKey?.startsWith('account'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/account') || p.pageKey?.startsWith('account')))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(p => ({
          pageKey: p.pageKey,
          icon: p.icon || 'Layers',
          label: p.pageName,
          path: p.route
        }))
    : accountLinks;

  return (
    <div className="flex">
      <Sidebar links={finalLinks} role="accountmanager" />
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AccountManagerLayout;
