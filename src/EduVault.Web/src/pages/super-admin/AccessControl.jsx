import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import * as Icons from 'lucide-react';
import { 
  ShieldCheck, 
  Shield, 
  Users, 
  GraduationCap, 
  UserCheck, 
  BookOpen, 
  DollarSign, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Eye,
  PlusCircle,
  Pencil,
  Trash2,
  Building,
  Layers,
  Sparkles,
  Plus,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  Sliders,
  CheckSquare,
  ClipboardList,
  Flame,
  ArrowUpRight,
  EyeOff,
  Activity,
  LineChart,
  PieChart,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const roleMeta = {
  schooladmin: {
    label: 'School Admin',
    desc: 'Institution administrators managing academic operations, staff, and classes',
    badge: 'Admin',
    icon: Building,
    targetPage: 'School Admin Dashboard',
    pageRoute: '/school-admin/dashboard'
  },
  teacher: {
    label: 'Teacher',
    desc: 'Teaching faculty managing classroom attendance, marks, homework, and leaves',
    badge: 'Faculty',
    icon: UserCheck,
    targetPage: 'Teacher Faculty Dashboard',
    pageRoute: '/teacher/dashboard'
  },
  student: {
    label: 'Student',
    desc: 'Enrolled students checking attendance, fees, exams, notices, and library books',
    badge: 'Student',
    icon: GraduationCap,
    targetPage: 'Student Portal Dashboard',
    pageRoute: '/student/dashboard'
  },
  accountmanager: {
    label: 'Account Manager',
    desc: 'Finance and HR officers handling teacher payroll, leave quotas, billing, and expenses',
    badge: 'HRM / Finance',
    icon: DollarSign,
    targetPage: 'Account & HRM Dashboard',
    pageRoute: '/account/dashboard'
  },
  librarian: {
    label: 'Librarian',
    desc: 'Library managers controlling book inventory, loans, returns, and overdue fines',
    badge: 'Library',
    icon: BookOpen,
    targetPage: 'Library Management Dashboard',
    pageRoute: '/library/dashboard'
  }
};

const roleToModuleMap = {
  schooladmin: 'school_admin',
  teacher: 'teacher',
  student: 'student',
  accountmanager: 'account',
  librarian: 'library'
};

const themeStyles = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200/90',
    text: 'text-emerald-700'
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200/90',
    text: 'text-blue-700'
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200/90',
    text: 'text-purple-700'
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200/90',
    text: 'text-amber-700'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200/90',
    text: 'text-rose-700'
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconBg: 'bg-cyan-100 text-cyan-700',
    border: 'border-cyan-200/90',
    text: 'text-cyan-700'
  }
};

const resolveWidgetIcon = (iconName) => {
  if (!iconName) return TrendingUp;
  const match = Icons[iconName] || Icons[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
  return match || TrendingUp;
};

const AccessControl = () => {
  const [activeTab, setActiveTab] = useState('menus'); // 'menus' or 'widgets'
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedRole, setSelectedRole] = useState('schooladmin');
  
  // Menus / Permissions State
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [error, setError] = useState('');

  // Modals State
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);

  // Add Menu Form
  const [menuForm, setMenuForm] = useState({
    pageName: '',
    route: '',
    icon: 'Layers',
    targetRole: 'schooladmin',
    sortOrder: 10
  });

  // Dashboard Widgets State
  const [widgets, setWidgets] = useState([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [widgetForm, setWidgetForm] = useState({
    title: '',
    metricSource: 'StudentAttendance',
    timeRange: 'Daily',
    chartType: 'None',
    colorTheme: 'emerald',
    iconName: 'Users',
    targetRole: 'schooladmin',
    displayOrder: 1
  });

  // 1. Fetch schools list on mount
  const fetchSchools = async () => {
    try {
      const res = await apiClient.get('/super/schools');
      setSchools(res.data || []);
      if (res.data && res.data.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch schools:', err);
      setError('Failed to load schools list.');
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // 2. Fetch permissions for selected school + role
  const fetchPermissions = async (schoolId, role) => {
    if (!schoolId || !role) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/rbac/permissions/${schoolId}/${role}`);
      setPermissions(res.data || []);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setError('Failed to load role permissions from server.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch dashboard widgets for selected school + role
  const fetchWidgets = async (schoolId, role) => {
    if (!schoolId || !role) return;
    setLoadingWidgets(true);
    setError('');
    try {
      const res = await apiClient.get(`/rbac/widgets/${schoolId}/${role}`);
      setWidgets(res.data || []);
    } catch (err) {
      console.error('Failed to load dashboard widgets:', err);
      setError('Failed to load dashboard widgets configuration.');
    } finally {
      setLoadingWidgets(false);
    }
  };

  useEffect(() => {
    if (selectedSchoolId && selectedRole) {
      if (activeTab === 'menus') {
        fetchPermissions(selectedSchoolId, selectedRole);
      } else {
        fetchWidgets(selectedSchoolId, selectedRole);
      }
    }
  }, [selectedSchoolId, selectedRole, activeTab]);

  // Handle direct module toggle (HRM & Library)
  const handleToggleModule = async (moduleType) => {
    const school = schools.find(s => s.id === selectedSchoolId);
    if (!school) return;

    const newHrm = moduleType === 'hrm' ? !school.hasAccountModule : school.hasAccountModule;
    const newLib = moduleType === 'lib' ? !school.hasLibraryModule : school.hasLibraryModule;

    try {
      await apiClient.put(`/super/schools/${selectedSchoolId}/modules`, {
        hasAccountModule: newHrm,
        hasLibraryModule: newLib
      });
      setSchools(prev => prev.map(s => {
        if (s.id === selectedSchoolId) {
          return { ...s, hasAccountModule: newHrm, hasLibraryModule: newLib };
        }
        return s;
      }));
      setSaveSuccess(`Module privileges updated for ${school.name}!`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update module privileges.');
    }
  };

  // Menu Permissions Actions
  const handleToggleMenu = (pageId, field) => {
    setPermissions(prev => prev.map(p => {
      if (p.pageId === pageId) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    }));
  };

  const handleGrantAll = () => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true
    })));
  };

  const handleRevokeAll = () => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    })));
  };

  const handleSavePermissions = async () => {
    if (!selectedSchoolId || !selectedRole) return;
    setSaving(true);
    setError('');
    try {
      const payload = permissions.map(p => ({
        pageId: p.pageId,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete
      }));

      await apiClient.put(`/rbac/permissions/${selectedSchoolId}/${selectedRole}`, payload);
      setSaveSuccess(`Permissions for ${roleMeta[selectedRole]?.label || selectedRole} saved successfully!`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save permissions:', err);
      setError(err.response?.data?.error || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Add Custom Menu / Page
  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!menuForm.pageName || !menuForm.route) {
      setError('Page Name and Route are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const targetRole = menuForm.targetRole || selectedRole;
      const targetModule = roleToModuleMap[targetRole] || 'custom';
      const cleanRoute = (menuForm.route.startsWith('/') ? menuForm.route : '/' + menuForm.route)
        .trim()
        .replace(/\s+/g, '-');

      await apiClient.post('/rbac/pages', {
        pageName: menuForm.pageName.trim(),
        route: cleanRoute,
        icon: menuForm.icon || 'Layers',
        module: targetModule,
        targetRole: targetRole,
        sortOrder: parseInt(menuForm.sortOrder) || 10
      });
      setShowAddMenuModal(false);
      setMenuForm({ pageName: '', route: '', icon: 'Layers', targetRole: selectedRole, sortOrder: 10 });
      setSaveSuccess(`New menu screen registered for ${roleMeta[targetRole]?.label || targetRole}!`);
      fetchPermissions(selectedSchoolId, selectedRole);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register new menu page.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (pageId) => {
    if (!window.confirm('Are you sure you want to remove this menu page?')) return;
    try {
      await apiClient.delete(`/rbac/pages/${pageId}`);
      setSaveSuccess('Menu page removed.');
      fetchPermissions(selectedSchoolId, selectedRole);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove menu page.');
    }
  };

  // Widget Actions
  const handleToggleWidget = (widgetKey) => {
    setWidgets(prev => prev.map(w => {
      if (w.widgetKey === widgetKey) {
        return { ...w, isEnabled: !w.isEnabled };
      }
      return w;
    }));
  };

  const handleWidgetTimeRange = (widgetKey, timeRange) => {
    setWidgets(prev => prev.map(w => {
      if (w.widgetKey === widgetKey) {
        return { ...w, timeRange };
      }
      return w;
    }));
  };

  const handleWidgetChartType = (widgetKey, role) => {
    setWidgets(prev => prev.map(w => {
      const format = w.graphFormat || (w.chartType?.toLowerCase().includes('area') ? 'area' : w.chartType?.toLowerCase().includes('pie') ? 'pie' : w.chartType?.toLowerCase().includes('line') ? 'line' : 'bar');
      if (role === 'MainGraph') {
        if (w.widgetKey === widgetKey) {
          return { ...w, chartType: `MainGraph_${format}`, graphRole: 'MainGraph', graphFormat: format };
        } else if (w.chartType?.startsWith('MainGraph') || w.chartType === 'MainGraph' || w.graphRole === 'MainGraph') {
          const otherFormat = w.graphFormat || (w.chartType?.toLowerCase().includes('area') ? 'area' : w.chartType?.toLowerCase().includes('pie') ? 'pie' : w.chartType?.toLowerCase().includes('line') ? 'line' : 'bar');
          return { ...w, chartType: `None_${otherFormat}`, graphRole: 'None' };
        }
        return w;
      }
      if (w.widgetKey === widgetKey) {
        return { ...w, chartType: `${role}_${format}`, graphRole: role, graphFormat: format };
      }
      return w;
    }));
  };

  const handleWidgetGraphFormat = (widgetKey, format) => {
    setWidgets(prev => prev.map(w => {
      if (w.widgetKey === widgetKey) {
        const isMain = w.chartType?.startsWith('MainGraph') || w.chartType === 'MainGraph' || w.graphRole === 'MainGraph';
        const role = isMain ? 'MainGraph' : (w.graphRole || (w.chartType?.startsWith('Mini') ? 'MiniChart' : 'None'));
        return { ...w, graphFormat: format, chartType: `${role}_${format}` };
      }
      return w;
    }));
  };

  const handleWidgetTitleChange = (widgetKey, newTitle) => {
    setWidgets(prev => prev.map(w => {
      if (w.widgetKey === widgetKey) {
        return { ...w, title: newTitle };
      }
      return w;
    }));
  };

  const handleSaveWidgets = async () => {
    if (!selectedSchoolId || !selectedRole) return;
    setSaving(true);
    setError('');
    try {
      const payload = widgets.map(w => ({
        widgetKey: w.widgetKey,
        customTitle: w.title,
        timeRange: w.timeRange,
        chartType: w.chartType,
        isEnabled: w.isEnabled,
        displayOrder: w.displayOrder
      }));

      await apiClient.put(`/rbac/widgets/${selectedSchoolId}/${selectedRole}`, payload);
      setSaveSuccess(`Dashboard configuration saved for ${roleMeta[selectedRole]?.label || selectedRole}!`);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save dashboard widgets:', err);
      setError(err.response?.data?.error || 'Failed to save dashboard widgets.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = async (e) => {
    e.preventDefault();
    if (!widgetForm.title || !widgetForm.metricSource) {
      setError('Title and Metric Source are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const targetRole = widgetForm.targetRole || selectedRole;
      await apiClient.post('/rbac/widgets', {
        title: widgetForm.title,
        metricSource: widgetForm.metricSource,
        timeRange: widgetForm.timeRange,
        chartType: widgetForm.chartType,
        colorTheme: widgetForm.colorTheme,
        iconName: widgetForm.iconName,
        targetRole: targetRole,
        displayOrder: parseInt(widgetForm.displayOrder) || 1
      });
      setShowAddWidgetModal(false);
      setWidgetForm({ title: '', metricSource: 'StudentAttendance', timeRange: 'Daily', chartType: 'None', colorTheme: 'emerald', iconName: 'Users', targetRole: selectedRole, displayOrder: 1 });
      setSaveSuccess(`New Dashboard Card created for ${roleMeta[targetRole]?.label || targetRole}!`);
      fetchWidgets(selectedSchoolId, selectedRole);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create dashboard card.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId) => {
    if (!window.confirm('Delete this dashboard card / widget?')) return;
    try {
      await apiClient.delete(`/rbac/widgets/${widgetId}`);
      setSaveSuccess('Dashboard widget removed.');
      fetchWidgets(selectedSchoolId, selectedRole);
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete widget.');
    }
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const activeRoleData = roleMeta[selectedRole] || {};
  const ActiveRoleIcon = activeRoleData.icon || Shield;

  return (
    <div className="space-y-6">
      <Topbar 
        title="Access Control & Dynamic Configuration Matrix" 
        subtitle="Manage Role Permissions, Dynamic Menus & Dashboard KPI Cards Per School" 
      />

      {/* TOP INSTITUTION CARD WITH DIRECT MODULE TOGGLE SWITCHES */}
      <div className="card p-5 border border-gray-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <Building className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-primary text-base">
                Target Institution / School
              </h2>
              <p className="text-xs text-gray-500">
                Directly configure module access, menu navigation, and dashboard metric cards
              </p>
            </div>
          </div>

          <div className="min-w-[280px]">
            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              className="input text-xs font-semibold py-2.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl w-full shadow-2xs"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.schoolCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-CLICK DIRECT MODULE TOGGLE SWITCHES */}
        {selectedSchool && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/70">
            <div className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              School Module Privileges:
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Account / HRM Module Switch */}
              <div className="flex items-center gap-3 bg-white py-2 px-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <div className="text-left">
                  <span className="text-xs font-bold text-gray-800 block">Account & HRM Module</span>
                  <span className="text-[11px] text-gray-400">Salaries, Leaves, Expenses</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={selectedSchool.hasAccountModule}
                    onChange={() => handleToggleModule('hrm')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Library Module Switch */}
              <div className="flex items-center gap-3 bg-white py-2 px-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <div className="text-left">
                  <span className="text-xs font-bold text-gray-800 block">Library Management</span>
                  <span className="text-[11px] text-gray-400">Books, Loans, Fines</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={selectedSchool.hasLibraryModule}
                    onChange={() => handleToggleModule('lib')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-700 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-semibold">{saveSuccess}</p>
        </div>
      )}

      {/* MODE SWITCHER: 1. MENUS & RBAC vs 2. DASHBOARD CARDS & GRAPHS */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100/90 p-1 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveTab('menus')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'menus'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            📱 Navigation Menus & Page Permissions
          </button>
          <button
            onClick={() => setActiveTab('widgets')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'widgets'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            📊 Dashboard Cards & Graphs Configurator
          </button>
        </div>

        {activeTab === 'menus' ? (
          <button
            onClick={() => {
              setMenuForm({
                pageName: '',
                route: '',
                icon: 'Layers',
                targetRole: selectedRole,
                sortOrder: 10
              });
              setShowAddMenuModal(true);
            }}
            className="btn-primary text-xs py-2 px-4 font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New Menu / Screen
          </button>
        ) : (
          <button
            onClick={() => {
              setWidgetForm({
                title: '',
                metricSource: 'StudentAttendance',
                timeRange: 'Daily',
                chartType: 'None',
                colorTheme: 'emerald',
                iconName: 'Users',
                targetRole: selectedRole,
                displayOrder: 1
              });
              setShowAddWidgetModal(true);
            }}
            className="btn-primary text-xs py-2 px-4 font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Custom Dashboard Card
          </button>
        )}
      </div>

      {/* SEGMENTED ROLE TABS BAR */}
      <div className="card p-2.5 bg-gray-50/90 border border-gray-200/80 rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {Object.entries(roleMeta).map(([roleKey, meta]) => {
            const isSelected = selectedRole === roleKey;
            const Icon = meta.icon;
            return (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={`py-3 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/70 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  <span className="font-semibold truncate">{meta.label}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {meta.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NAVIGATION MENUS & PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'menus' && (
        <div className="card overflow-hidden p-0 border border-gray-200/80">
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <ActiveRoleIcon className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-primary text-base">
                    {activeRoleData.label} Menu Navigation
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-2xs font-bold">
                    {permissions.length} Screens
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Target Route: <span className="font-mono text-primary font-semibold">{activeRoleData.pageRoute}</span>. Toggle <span className="font-semibold text-primary">Can View (Sidebar)</span> to show or hide screens in navigation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGrantAll}
                className="btn-secondary text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Grant All
              </button>
              <button
                onClick={handleRevokeAll}
                className="btn-secondary text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                <X className="w-3.5 h-3.5" />
                Revoke All
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="btn-primary text-xs py-1.5 px-4 font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Menu Permissions'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <Loader message={`Loading ${activeRoleData.label} menu permissions...`} />
            </div>
          ) : permissions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <Layers className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No Menus Configured for {activeRoleData.label}</p>
              <p className="text-xs text-gray-400">Click "+ Add New Menu / Screen" to add a screen to this role.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">LMS Menu / Screen</th>
                    <th className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Eye className="w-3.5 h-3.5" />
                        Can View (Sidebar)
                      </span>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <PlusCircle className="w-3.5 h-3.5" />
                        Can Create
                      </span>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Pencil className="w-3.5 h-3.5" />
                        Can Edit
                      </span>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                        Can Delete
                      </span>
                    </th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {permissions.map((page) => (
                    <tr
                      key={page.pageId}
                      className={`transition-colors hover:bg-gray-50/80 ${
                        page.canView ? 'bg-white' : 'bg-gray-50/40 opacity-70'
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block text-xs">
                              {page.pageName}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {page.route} • <span className="capitalize">{page.module.replace('_', ' ')}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.canView}
                            onChange={() => handleToggleMenu(page.pageId, 'canView')}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.canCreate}
                            onChange={() => handleToggleMenu(page.pageId, 'canCreate')}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.canEdit}
                            onChange={() => handleToggleMenu(page.pageId, 'canEdit')}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={page.canDelete}
                            onChange={() => handleToggleMenu(page.pageId, 'canDelete')}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {page.isCustom ? (
                          <button
                            onClick={() => handleDeleteMenu(page.pageId)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete custom menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-2xs text-gray-400 font-mono">System</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-2xs text-gray-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Navigation menus sync dynamically from the database and take effect immediately.
            </p>
            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="btn-primary text-xs py-2 px-5 font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50 self-end sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Role Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DASHBOARD KPI CARDS & MAIN GRAPH CONFIGURATOR */}
      {/* ========================================================================= */}
      {activeTab === 'widgets' && (
        <div className="card overflow-hidden p-0 border border-gray-200/80 space-y-0 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-primary text-base">
                    {activeRoleData.label} Dashboard Cards & Analytics Graph
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-2xs font-bold">
                    {widgets.length} Configured
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Target Page: <span className="font-mono text-primary font-bold">{activeRoleData.pageRoute}</span> ({activeRoleData.targetPage}). Control which card is visible on dashboard and which metric feeds the main analytics graph.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveWidgets}
                disabled={saving}
                className="btn-primary text-xs py-2 px-4 font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Dashboard Configuration'}
              </button>
            </div>
          </div>

          {loadingWidgets ? (
            <div className="py-24 text-center">
              <Loader message={`Loading ${activeRoleData.label} dashboard configuration...`} />
            </div>
          ) : widgets.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <LayoutDashboard className="w-12 h-12 mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">No Dashboard Cards Registered for {activeRoleData.label}</p>
              <p className="text-xs text-gray-400">Click "+ Add Custom Dashboard Card" to create one.</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 bg-slate-50/40">
              {widgets.map((w) => {
                const theme = themeStyles[w.colorTheme] || themeStyles.blue;
                const IconComp = resolveWidgetIcon(w.iconName);
                const isMainGraph = w.chartType?.startsWith('MainGraph') || w.chartType === 'MainGraph' || w.graphRole === 'MainGraph';
                const currentFormat = w.graphFormat || (w.chartType?.toLowerCase().includes('area') ? 'area' : w.chartType?.toLowerCase().includes('pie') ? 'pie' : w.chartType?.toLowerCase().includes('line') ? 'line' : 'bar');

                return (
                  <div
                    key={w.widgetKey}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between gap-4 ${
                      isMainGraph
                        ? 'bg-white border-primary shadow-md ring-2 ring-primary/20'
                        : w.isEnabled
                        ? `bg-white ${theme.border} shadow-sm hover:shadow-md`
                        : 'bg-gray-100/50 border-gray-200/60 opacity-60'
                    }`}
                  >
                    {/* Top Row: Icon, Title Input, Page Location & Main Toggle Switch */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${theme.iconBg}`}>
                            <IconComp className="w-5 h-5 stroke-[2]" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 group">
                              <input
                                type="text"
                                value={w.title}
                                onChange={e => handleWidgetTitleChange(w.widgetKey, e.target.value)}
                                placeholder="Card Title"
                                className="font-display font-bold text-sm text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-0.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary focus:outline-none w-full transition-all"
                              />
                              <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>

                            {/* Target Page indicator and Metric Source */}
                            <div className="flex flex-wrap items-center gap-2 mt-1 px-2">
                              <span className="text-[11px] font-mono text-primary font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                📍 {activeRoleData.pageRoute}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Metric: {w.metricSource}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Visibility Toggle Switch & Custom Delete Button */}
                        <div className="flex items-center gap-2.5 shrink-0 pt-1">
                          <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                            w.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {w.isEnabled ? '● Visible' : '○ Hidden'}
                          </span>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={w.isEnabled}
                              onChange={() => handleToggleWidget(w.widgetKey)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>

                          {w.isCustom && (
                            <button
                              onClick={() => handleDeleteWidget(w.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Delete custom card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle Control Box: Graph Connection / Display Role Selector */}
                      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
                        <div className="flex items-center justify-between text-2xs font-bold text-slate-500">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <BarChart3 className="w-3.5 h-3.5 text-primary" />
                            Dashboard Visualization & Graph Role:
                          </span>
                          {isMainGraph && (
                            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <LineChart className="w-3 h-3" />
                              Main Analytics Graph Source
                            </span>
                          )}
                        </div>

                        {/* Graph Role Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleWidgetChartType(w.widgetKey, 'None')}
                            className={`py-1.5 px-2 rounded-lg text-2xs font-bold transition-all text-center border ${
                              !isMainGraph && (w.chartType === 'None' || w.chartType?.startsWith('None') || !w.chartType)
                                ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                            }`}
                          >
                            🎴 KPI Summary Card
                          </button>

                          <button
                            type="button"
                            onClick={() => handleWidgetChartType(w.widgetKey, 'MainGraph')}
                            className={`py-1.5 px-2 rounded-lg text-2xs font-bold transition-all text-center border ${
                              isMainGraph
                                ? 'bg-primary text-white border-primary shadow-xs'
                                : 'bg-transparent text-slate-600 border-transparent hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            📈 Main Graph Driver
                          </button>

                          <button
                            type="button"
                            onClick={() => handleWidgetChartType(w.widgetKey, 'MiniChart')}
                            className={`py-1.5 px-2 rounded-lg text-2xs font-bold transition-all text-center border ${
                              !isMainGraph && (w.chartType === 'MiniChart' || w.chartType?.startsWith('Mini'))
                                ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                            }`}
                          >
                            📊 Mini Trend Chart
                          </button>
                        </div>

                        {/* Chart Format (Bar, Area, Pie, Line) Selector */}
                        <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                            <span>📐</span> Graph / Chart Format:
                          </span>
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                            {[
                              { id: 'bar', label: '📊 Bar Graph' },
                              { id: 'area', label: '📈 Area Curve' },
                              { id: 'pie', label: '🥧 Pie Chart' },
                              { id: 'line', label: '📉 Line Graph' }
                            ].map(fmt => (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => handleWidgetGraphFormat(w.widgetKey, fmt.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  currentFormat === fmt.id
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {fmt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Calculation Frequency Selector */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        Calculation Range:
                      </span>

                      <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
                        {[
                          { id: 'Daily', label: 'Daily' },
                          { id: 'Weekly', label: 'Weekly' },
                          { id: 'Monthly', label: 'Monthly' }
                        ].map(range => (
                          <button
                            key={range.id}
                            type="button"
                            onClick={() => handleWidgetTimeRange(w.widgetKey, range.id)}
                            className={`px-3 py-1 rounded-lg text-2xs font-bold transition-all ${
                              w.timeRange === range.id
                                ? 'bg-white text-primary shadow-xs border border-slate-200/60'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-2xs text-gray-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              Card visibility, calculation frequencies, and main graph driver assignments update dynamically on the selected school dashboard.
            </p>
            <button
              onClick={handleSaveWidgets}
              disabled={saving}
              className="btn-primary text-xs py-2.5 px-6 font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 self-end sm:self-auto"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Dashboard Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW MENU / SCREEN */}
      {/* ========================================================================= */}
      {showAddMenuModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 text-left">
            <div className="bg-primary px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-white" />
                Register New Menu / Screen
              </h3>
              <button onClick={() => setShowAddMenuModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddMenu} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Target Module / Role *</label>
                <select
                  value={menuForm.targetRole}
                  onChange={e => setMenuForm(p => ({ ...p, targetRole: e.target.value }))}
                  className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:bg-white"
                >
                  <option value="schooladmin">🏫 School Admin (Institution Management)</option>
                  <option value="teacher">👨‍🏫 Teacher (Faculty Portal)</option>
                  <option value="student">🎓 Student (Student Portal)</option>
                  <option value="accountmanager">💰 Account Manager (Finance & HRM)</option>
                  <option value="librarian">📚 Librarian (Library Management)</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Page / Menu Title *</label>
                <input
                  type="text"
                  required
                  value={menuForm.pageName}
                  onChange={e => setMenuForm(p => ({ ...p, pageName: e.target.value }))}
                  placeholder="e.g. Transport & Bus Tracking"
                  className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Route Path *</label>
                  <input
                    type="text"
                    required
                    value={menuForm.route}
                    onChange={e => setMenuForm(p => ({ ...p, route: e.target.value }))}
                    placeholder="/school-admin/transport"
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Lucide Icon</label>
                  <input
                    type="text"
                    value={menuForm.icon}
                    onChange={e => setMenuForm(p => ({ ...p, icon: e.target.value }))}
                    placeholder="Layers / Users / Bus"
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Display Order</label>
                <input
                  type="number"
                  value={menuForm.sortOrder}
                  onChange={e => setMenuForm(p => ({ ...p, sortOrder: e.target.value }))}
                  className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddMenuModal(false)} className="btn-secondary text-xs py-2 px-4 font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-5 font-semibold">Register Screen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM DASHBOARD CARD / WIDGET */}
      {/* ========================================================================= */}
      {showAddWidgetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 text-left">
            <div className="bg-primary px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-white" />
                Register New Dashboard Card / Widget
              </h3>
              <button onClick={() => setShowAddWidgetModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddWidget} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Target Module / Role *</label>
                <select
                  value={widgetForm.targetRole}
                  onChange={e => setWidgetForm(p => ({ ...p, targetRole: e.target.value }))}
                  className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:bg-white"
                >
                  <option value="schooladmin">🏫 School Admin (Institution Management)</option>
                  <option value="teacher">👨‍🏫 Teacher (Faculty Portal)</option>
                  <option value="student">🎓 Student (Student Portal)</option>
                  <option value="accountmanager">💰 Account Manager (Finance & HRM)</option>
                  <option value="librarian">📚 Librarian (Library Management)</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Card Title *</label>
                <input
                  type="text"
                  required
                  value={widgetForm.title}
                  onChange={e => setWidgetForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Weekly Attendance Average"
                  className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Metric Source *</label>
                  <select
                    value={widgetForm.metricSource}
                    onChange={e => setWidgetForm(p => ({ ...p, metricSource: e.target.value }))}
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="StudentAttendance">Student Attendance</option>
                    <option value="TeacherAttendance">Teacher Attendance</option>
                    <option value="FeeCollection">Fee Collection</option>
                    <option value="SalaryDisbursed">Salary Disbursed</option>
                    <option value="ExpenseTotal">School Expenses</option>
                    <option value="LibraryLoans">Library Loans</option>
                    <option value="ClassEnrollment">Class Enrollment</option>
                    <option value="PendingReviews">Pending Reviews</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Calculation Range</label>
                  <select
                    value={widgetForm.timeRange}
                    onChange={e => setWidgetForm(p => ({ ...p, timeRange: e.target.value }))}
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="Daily">Daily Count</option>
                    <option value="Weekly">Weekly Average</option>
                    <option value="Monthly">Monthly Summary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Visualization Role</label>
                  <select
                    value={widgetForm.chartType}
                    onChange={e => setWidgetForm(p => ({ ...p, chartType: e.target.value }))}
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="None">🎴 KPI Metric Card</option>
                    <option value="MainGraph">📈 Main Graph Driver</option>
                    <option value="AreaChart">📊 Mini Trend Chart</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Color Theme</label>
                  <select
                    value={widgetForm.colorTheme}
                    onChange={e => setWidgetForm(p => ({ ...p, colorTheme: e.target.value }))}
                    className="input text-xs w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                  >
                    <option value="emerald">Emerald Green</option>
                    <option value="blue">Royal Blue</option>
                    <option value="amber">Warm Amber</option>
                    <option value="purple">Vibrant Purple</option>
                    <option value="rose">Rose Red</option>
                    <option value="cyan">Teal Cyan</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddWidgetModal(false)} className="btn-secondary text-xs py-2 px-4 font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-5 font-semibold">Create Card</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
