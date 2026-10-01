import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { formatClassLabel, formatGrade } from '../../utils/classUtils';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  CheckSquare, 
  Calendar, 
  Edit, 
  PenTool, 
  MessageSquare, 
  Megaphone, 
  User, 
  DollarSign, 
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Send,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  Upload,
  Check
} from 'lucide-react';

const showToast = (msg, type = 'info') => {
  if (typeof window !== 'undefined' && window.appToast?.[type]) {
    window.appToast[type](msg);
  } else {
    console.log(`[Toast ${type}]:`, msg);
  }
};

export const TeacherSelfAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [schoolSetting, setSchoolSetting] = useState(null);
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [distance, setDistance] = useState(null);
  const [punching, setPunching] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayAndSettings = async () => {
    try {
      const res = await expressClient.get('/teacher-attendance/today');
      setTodayAttendance(res.data.attendance || null);
      setSchoolSetting(res.data.schoolSetting || null);
      if (res.data.attendance) {
        setSelectedRecord(res.data.attendance);
      }
    } catch (err) {
      console.error('Failed to load today punch status:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await expressClient.get('/teacher-attendance/my-attendance');
      setAttendanceList(res.data || []);
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAndSettings();
    fetchAttendanceHistory();
    // Auto-detect GPS location on load
    if (navigator.geolocation) {
      setLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setTeacherLocation({ latitude: lat, longitude: lng });
          setLocatingGps(false);
        },
        (err) => {
          setLocatingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    if (teacherLocation && schoolSetting) {
      const d = calculateHaversineDistance(
        schoolSetting.latitude,
        schoolSetting.longitude,
        teacherLocation.latitude,
        teacherLocation.longitude
      );
      setDistance(d);
    }
  }, [teacherLocation, schoolSetting]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setTeacherLocation({ latitude: lat, longitude: lng });
        setLocatingGps(false);
        showToast('GPS location detected.', 'success');
      },
      (err) => {
        setLocatingGps(false);
        showToast('GPS location detection failed: ' + err.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePunchIn = async () => {
    if (!teacherLocation) {
      showToast('Please detect your current GPS location first.', 'warning');
      return;
    }
    setPunching(true);
    try {
      const res = await expressClient.post('/teacher-attendance/punch-in', {
        latitude: teacherLocation.latitude,
        longitude: teacherLocation.longitude,
        address: 'School Premises GPS'
      });
      showToast('📍 Punch In Successful!', 'success');
      fetchTodayAndSettings();
      fetchAttendanceHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Punch In failed.', 'error');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!teacherLocation) {
      showToast('Please detect your current GPS location first.', 'warning');
      return;
    }
    setPunching(true);
    try {
      const res = await expressClient.post('/teacher-attendance/punch-out', {
        latitude: teacherLocation.latitude,
        longitude: teacherLocation.longitude,
        address: 'School Premises GPS'
      });
      showToast('🚀 Punch Out Successful!', 'success');
      fetchTodayAndSettings();
      fetchAttendanceHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Punch Out failed.', 'error');
    } finally {
      setPunching(false);
    }
  };

  const radiusLimit = schoolSetting?.geofenceRadiusMeters || 300;
  const isWithinRadius = distance !== null && distance <= radiusLimit;
  const activeModes = schoolSetting?.attendanceModes || ['app', 'biometric'];
  const isAppEnabled = activeModes.includes('app');
  const isBiometricEnabled = activeModes.includes('biometric');

  const totalDays = attendanceList.length;
  const presentCount = attendanceList.filter(a => a.status === 'Present').length;
  const lateCount = attendanceList.filter(a => a.status === 'Late').length;
  const singlePunchCount = attendanceList.filter(a => a.status === 'Single Punch').length;
  const halfDayCount = attendanceList.filter(a => a.status === 'Half Day').length;
  const absentCount = attendanceList.filter(a => a.status === 'Absent').length;
  const leaveCount = attendanceList.filter(a => a.status === 'On Leave').length;
  
  const attendanceRate = totalDays > 0 
    ? (((presentCount + lateCount + halfDayCount) / totalDays) * 100).toFixed(1) + '%' 
    : '100%';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedRecord(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedRecord(null);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ padding: true, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const isSunday = dateObj.getDay() === 0;
    const record = attendanceList.find(a => a.date === dateStr);
    calendarDays.push({
      padding: false,
      day,
      dateStr,
      isSunday,
      record,
      key: `day-${day}`
    });
  }

  const getStatusColor = (status) => {
    if (status === 'Present') return 'bg-emerald-500 text-white hover:bg-emerald-600';
    if (status === 'Late') return 'bg-amber-500 text-white hover:bg-amber-600';
    if (status === 'Single Punch') return 'bg-blue-500 text-white hover:bg-blue-600';
    if (status === 'Half Day') return 'bg-purple-500 text-white hover:bg-purple-600';
    if (status === 'Absent') return 'bg-rose-500 text-white hover:bg-rose-600';
    if (status === 'On Leave') return 'bg-orange-500 text-white hover:bg-orange-600';
    return 'bg-gray-100 text-gray-400 hover:bg-gray-200';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return <Loader message="Accessing your attendance logs" />;
  }

  return (
    <div>
      <Topbar title="My Attendance Logs" subtitle="View your daily punch history, working hours, and campus attendance status" />
      
      {/* Geofence Radar / Punch Control Card */}
      {isAppEnabled ? (
        <div className="card bg-gradient-to-br from-slate-900 via-primary-dark to-slate-900 text-white mb-6 p-6 shadow-xl rounded-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${
                isWithinRadius ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border-2 border-rose-400 text-rose-300'
              }`}>
                {isWithinRadius ? '🎯' : '⚠️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-display text-white">Daily 300m GPS Punch In / Punch Out</h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    isWithinRadius ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                  }`}>
                    {distance === null ? 'Locating GPS...' : isWithinRadius ? '🟢 Inside Premises (≤ 300m)' : '🔴 Outside Premises (> 300m)'}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-1">
                  School GPS: ({schoolSetting?.latitude || 26.9124}, {schoolSetting?.longitude || 75.7873}) | Geofence Radius: <strong>{radiusLimit} meters</strong>
                </p>
                {teacherLocation && (
                  <div className="text-[11px] text-emerald-300 font-mono mt-1 flex items-center gap-2">
                    <span>📍 Your GPS: {teacherLocation.latitude}, {teacherLocation.longitude}</span>
                    <span className="text-white/60">|</span>
                    <span className="font-bold">Distance: {distance != null ? `${distance} meters` : 'Calculating...'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={detectLocation}
                disabled={locatingGps}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-2"
              >
                {locatingGps ? '📡 Locating...' : '🔄 Refresh My GPS'}
              </button>

              {!todayAttendance?.punchInTime ? (
                <button
                  type="button"
                  onClick={handlePunchIn}
                  disabled={!isWithinRadius || punching}
                  className={`px-6 py-3 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 ${
                    isWithinRadius && !punching
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer shadow-emerald-500/30'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {punching ? '⏳ Punching In...' : '📍 Punch In Now'}
                </button>
              ) : !todayAttendance?.punchOutTime ? (
                <button
                  type="button"
                  onClick={handlePunchOut}
                  disabled={!isWithinRadius || punching}
                  className={`px-6 py-3 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 ${
                    isWithinRadius && !punching
                      ? 'bg-purple-500 hover:bg-purple-400 text-white cursor-pointer shadow-purple-500/30'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {punching ? '⏳ Punching Out...' : '🚀 Punch Out Now'}
                </button>
              ) : (
                <div className="px-5 py-2.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  ✅ Completed Punch In & Out Today
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner when outside 300m radius */}
          {!isWithinRadius && distance !== null && (
            <div className="mt-4 bg-rose-500/20 border border-rose-400/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
              ⚠️ <strong>Punching Disabled:</strong> You are currently <strong>{distance} meters</strong> away from school campus. Please reach within the <strong>{radiusLimit}m</strong> geofence boundary to enable punch in/out buttons.
            </div>
          )}
        </div>
      ) : isBiometricEnabled ? (
        <div className="card bg-gradient-to-r from-slate-900 via-primary to-slate-900 text-white mb-6 p-6 shadow-xl rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border-2 border-blue-400 text-blue-300 flex items-center justify-center text-3xl font-bold shadow-lg">
              ☝️
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                Biometric Fingerprint Punch Active
              </h3>
              <p className="text-xs text-blue-200 mt-1">
                Your school uses official biometric thumb hardware for attendance. Please place your thumb on the campus biometric machine to punch in and out. Logs sync automatically to your portal.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl text-xs font-bold whitespace-nowrap">
            📡 Hardware Synced
          </div>
        </div>
      ) : null}

      {/* Today's Punch Summary */}
      {todayAttendance && (
        <div className="card mb-6 bg-slate-900 text-white p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Punch In Time</span>
            <span className="font-bold text-emerald-400 text-sm">
              {todayAttendance.punchInTime ? new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Punched In'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Punch Out Time</span>
            <span className="font-bold text-purple-400 text-sm">
              {todayAttendance.punchOutTime ? new Date(todayAttendance.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Punched Out'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Worked Hours</span>
            <span className="font-bold text-blue-300 text-sm">
              {todayAttendance.workingHours ? `${todayAttendance.workingHours} hrs` : 'In Progress'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Today Status</span>
            <span className="font-extrabold text-amber-300 text-sm">{todayAttendance.status}</span>
          </div>
        </div>
      )}

      {/* Monthly Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Attendance Rate', value: attendanceRate, color: 'text-primary', icon: '📈' },
          { label: 'Present Days', value: presentCount, color: 'text-emerald-600', icon: '✅' },
          { label: 'Late Days', value: lateCount, color: 'text-amber-500', icon: '⏱️' },
          { label: 'Single Punch', value: singlePunchCount, color: 'text-blue-500', icon: '📍' },
          { label: 'Half Days', value: halfDayCount, color: 'text-purple-600', icon: '🌓' },
          { label: 'Absent Days', value: absentCount, color: 'text-rose-500', icon: '❌' }
        ].map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-lg shrink-0">{stat.icon}</div>
            <div>
              <div className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-primary text-lg">
              📅 {monthNames[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">◀ Prev</button>
              <button onClick={handleNextMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">Next ▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className={`py-2 ${d === 'Sun' ? 'text-rose-500 font-extrabold' : 'text-gray-400'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(item => {
              if (item.padding) {
                return <div key={item.key} className="h-16 bg-gray-50/30 rounded-xl border border-dashed border-gray-100" />;
              }
              const hasRecord = !!item.record;

              if (item.isSunday && !hasRecord) {
                return (
                  <div
                    key={item.key}
                    className="h-16 rounded-xl border border-rose-200/80 bg-rose-50/40 flex flex-col justify-between p-2 text-left relative text-rose-700 shadow-3xs"
                  >
                    <span className="text-xs font-bold text-rose-600">{item.day}</span>
                    <span className="text-[8px] sm:text-[9px] font-extrabold uppercase leading-none text-rose-500">
                      Sunday Off
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => item.record && setSelectedRecord(item.record)}
                  className={`h-16 rounded-xl border flex flex-col justify-between p-2 text-left relative transition-all ${
                    hasRecord
                      ? getStatusColor(item.record.status)
                      : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-xs font-bold">{item.day}</span>
                  {hasRecord && (
                    <span className="text-[9px] font-extrabold uppercase leading-none opacity-95 truncate max-w-full">
                      {item.record.status}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Details Drawer */}
        <div className="space-y-4">
          <div className="card bg-gray-50/50">
            <h3 className="font-display font-bold text-primary text-sm mb-4 flex items-center gap-2">
              ℹ️ Date Inspection Log
            </h3>
            {selectedRecord ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Date</span>
                  <span className="font-bold text-primary">{selectedRecord.date}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Status</span>
                  <span className="font-extrabold text-primary">{selectedRecord.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Punch In</span>
                  <span className="font-bold text-emerald-600">
                    {selectedRecord.punchInTime ? new Date(selectedRecord.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Punch Out</span>
                  <span className="font-bold text-purple-600">
                    {selectedRecord.punchOutTime ? new Date(selectedRecord.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Working Hours</span>
                  <span className="font-bold text-blue-600">
                    {selectedRecord.workingHours ? `${selectedRecord.workingHours} hrs` : 'N/A'}
                  </span>
                </div>
                {selectedRecord.status === 'Late' && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase">Minutes Late</span>
                    <span className="font-bold text-amber-600">{selectedRecord.lateMinutes} mins</span>
                  </div>
                )}
                {selectedRecord.punchInLocation && (
                  <div className="py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block mb-1">GPS Location</span>
                    <span className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-gray-200 block">
                      📍 Lat: {selectedRecord.punchInLocation.latitude}, Lng: {selectedRecord.punchInLocation.longitude}
                    </span>
                  </div>
                )}
                <div className="py-1.5">
                  <span className="text-gray-400 font-semibold uppercase block mb-1">Remarks</span>
                  <p className="text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100 italic leading-normal">
                    {selectedRecord.remarks || 'No remarks provided.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-2xs">
                Click on any marked date in the calendar to view full attendance logs and GPS details.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-primary text-sm mb-3">Status Legend</h3>
            <div className="space-y-2">
              {[
                { label: 'Present', color: 'bg-emerald-500' },
                { label: 'Late', color: 'bg-amber-500' },
                { label: 'Single Punch', color: 'bg-blue-500' },
                { label: 'Half Day', color: 'bg-purple-500' },
                { label: 'Absent', color: 'bg-rose-500' },
                { label: 'On Leave', color: 'bg-orange-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="font-medium text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Teacher Notices ---
export default TeacherSelfAttendance;
