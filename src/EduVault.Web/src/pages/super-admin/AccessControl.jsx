import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
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
  Sparkles
} from 'lucide-react';

const roleMeta = {
  schooladmin: {
    label: 'School Admin',
    desc: 'Institution administrators managing academic operations, staff, and classes',
    badge: 'Admin',
    icon: Building
  },
  teacher: {
    label: 'Teacher',
    desc: 'Teaching faculty managing classroom attendance, marks, homework, and leaves',
    badge: 'Faculty',
    icon: UserCheck
  },
  student: {
    label: 'Student',
    desc: 'Enrolled students checking attendance, fees, exams, notices, and library books',
    badge: 'Student',
    icon: GraduationCap
  },
  accountmanager: {
    label: 'Account Manager',
    desc: 'Finance and HR officers handling teacher payroll, leave quotas, billing, and expenses',
    badge: 'Finance / HRM',
    icon: DollarSign
  },
  librarian: {
    label: 'Librarian',
    desc: 'Library managers controlling book inventory, loans, returns, and overdue fines',
    badge: 'Library',
    icon: BookOpen
  }
};

const AccessControl = () => {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedRole, setSelectedRole] = useState('schooladmin');
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch schools list on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await apiClient.get('/super/schools');
        setSchools(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedSchoolId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch schools:', err);
        setError('Failed to load schools list.');
      }
    };
    fetchSchools();
  }, []);

  // 2. Fetch permissions for selected school + role
  const fetchPermissions = async (schoolId, role) => {
    if (!schoolId || !role) return;
    setLoading(true);
    setError('');
    setSaveSuccess('');
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

  useEffect(() => {
    if (selectedSchoolId && selectedRole) {
      fetchPermissions(selectedSchoolId, selectedRole);
    }
  }, [selectedSchoolId, selectedRole]);

  // Handle single toggle change
  const handleToggle = (pageId, field) => {
    setPermissions(prev => prev.map(p => {
      if (p.pageId === pageId) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    }));
  };

  // Grant all permissions for current role
  const handleGrantAll = () => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true
    })));
  };

  // Revoke all permissions for current role
  const handleRevokeAll = () => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    })));
  };

  // Save permissions
  const handleSave = async () => {
    if (!selectedSchoolId || !selectedRole) return;
    setSaving(true);
    setError('');
    setSaveSuccess('');
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

  // Reset to system defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all custom permissions for this school back to system defaults?')) return;
    setSaving(true);
    try {
      await apiClient.delete(`/rbac/permissions/${selectedSchoolId}`);
      fetchPermissions(selectedSchoolId, selectedRole);
      setSaveSuccess('Permissions reset to system defaults.');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to reset:', err);
      setError('Failed to reset permissions.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const activeRoleData = roleMeta[selectedRole] || {};
  const ActiveRoleIcon = activeRoleData.icon || Shield;

  return (
    <div className="space-y-6">
      <Topbar 
        title="Role-Based Access Control (RBAC)" 
        subtitle="Manage Screen Visibility & Action Permissions Per School & Role" 
      />

      {/* Top Controls & School Selector Card */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-primary text-base">
              Target Institution / School
            </h2>
            <p className="text-xs text-gray-500">
              Select the school to configure custom module and screen permissions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[260px]">
            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              className="input text-xs font-semibold py-2 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl w-full"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.schoolCode})
                </option>
              ))}
            </select>
          </div>

          {selectedSchool && (
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border ${
                selectedSchool.hasAccountModule 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
                HRM {selectedSchool.hasAccountModule ? '✓' : '✗'}
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border ${
                selectedSchool.hasLibraryModule 
                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
                Library {selectedSchool.hasLibraryModule ? '✓' : '✗'}
              </span>
            </div>
          )}
        </div>
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

      {/* Segmented Role Tabs Bar */}
      <div className="card p-2 bg-gray-50/80 border border-gray-200/80">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(roleMeta).map(([roleKey, meta]) => {
            const isSelected = selectedRole === roleKey;
            const Icon = meta.icon;
            return (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                <span className="truncate">{meta.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {meta.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Permissions Matrix Table Card */}
      <div className="card overflow-hidden p-0 border border-gray-200/80">
        {/* Table Card Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <ActiveRoleIcon className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-primary text-base">
                  {activeRoleData.label} Permissions
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-2xs font-semibold">
                  {permissions.length} Screens
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeRoleData.desc}
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
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
              onClick={handleResetDefaults}
              disabled={saving}
              className="btn-secondary text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 text-gray-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-4 font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 text-center">
            <Loader message="Loading permission matrix..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">LMS Menu / Screen</th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Eye className="w-3.5 h-3.5" />
                      Can View (Sidebar)
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <PlusCircle className="w-3.5 h-3.5" />
                      Can Create
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Pencil className="w-3.5 h-3.5" />
                      Can Edit
                    </span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                      Can Delete
                    </span>
                  </th>
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
                    {/* Screen Name & Route */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                          <Layers className="w-3.5 h-3.5" />
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

                    {/* Can View (Sidebar) Toggle */}
                    <td className="py-3 px-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={page.canView}
                          onChange={() => handleToggle(page.pageId, 'canView')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </td>

                    {/* Can Create Toggle */}
                    <td className="py-3 px-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={page.canCreate}
                          onChange={() => handleToggle(page.pageId, 'canCreate')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </td>

                    {/* Can Edit Toggle */}
                    <td className="py-3 px-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={page.canEdit}
                          onChange={() => handleToggle(page.pageId, 'canEdit')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </td>

                    {/* Can Delete Toggle */}
                    <td className="py-3 px-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={page.canDelete}
                          onChange={() => handleToggle(page.pageId, 'canDelete')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Action Bar */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-2xs text-gray-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Permissions are enforced dynamically and update immediately on the next navigation or token refresh.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs py-2 px-5 font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50 self-end sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Role Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
