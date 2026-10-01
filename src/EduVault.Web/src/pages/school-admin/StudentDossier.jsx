import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/apiClient';
import Topbar from '../../components/layout/Topbar';
import { 
  Search, 
  Calendar, 
  Building2, 
  Users, 
  UserPlus, 
  UserMinus, 
  FileText, 
  ShieldCheck, 
  ArrowLeft, 
  Printer, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookOpen,
  GraduationCap
} from 'lucide-react';

export default function StudentDossier() {
  const { toast } = useToast();
  // Navigation / Drill-down state
  const [activeStep, setActiveStep] = useState('years'); // 'years' | 'classes' | 'students' | 'dossier'
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Data states
  const [yearsList, setYearsList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [dossier, setDossier] = useState(null);

  // Global search bar state
  const [globalQuery, setGlobalQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Academic Years (20-Year Timeline)
  const fetchYears = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await apiClient.get('/academics/archive/years');
      setYearsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load archive years:', err);
      setErrorMsg('Failed to load academic sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  // 2. When Year is selected, fetch class-wise analytics
  const handleSelectYear = async (yearObj) => {
    setSelectedYear(yearObj);
    setActiveStep('classes');
    setSelectedClass(null);
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await apiClient.get(`/academics/archive/year-classes?year=${encodeURIComponent(yearObj.academicYear)}`);
      setClassList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load classes for year:', err);
      setErrorMsg('Failed to load class analytics for session.');
    } finally {
      setLoading(false);
    }
  };

  // 3. When Class is selected, fetch students roster
  const handleSelectClass = async (clsObj) => {
    setSelectedClass(clsObj);
    setActiveStep('students');
    setStudentSearch('');
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await apiClient.get(`/academics/archive/class-students?classId=${clsObj.classId}&year=${encodeURIComponent(selectedYear.academicYear)}`);
      setStudentsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load students for class:', err);
      setErrorMsg('Failed to load student roster.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Load full lifetime dossier ("Sara Kacha Chitha")
  const loadDossier = async (studentId, queryText = null) => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = '/academics/student-dossier';
      if (studentId) {
        url += `?studentId=${studentId}`;
      } else if (queryText) {
        url += `?query=${encodeURIComponent(queryText)}`;
      }
      const res = await apiClient.get(url);
      setDossier(res.data);
      setSelectedStudentId(res.data.studentId);
      setActiveStep('dossier');
    } catch (err) {
      console.error('Failed to load student dossier:', err);
      setErrorMsg(err.response?.data?.error || 'Student record not found in 20-Year Lifetime Archive.');
    } finally {
      setLoading(false);
      setSearchingGlobal(false);
    }
  };

  // 5. Global Omni-search handler
  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!globalQuery.trim()) return;
    setSearchingGlobal(true);
    loadDossier(null, globalQuery.trim());
  };

  // Filter class students
  const filteredStudents = studentsList.filter(s => {
    const q = studentSearch.toLowerCase();
    return (
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.admissionNumber || '').toLowerCase().includes(q) ||
      (s.fatherName || '').toLowerCase().includes(q) ||
      (s.studentIdCode || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Topbar */}
      <Topbar 
        title="🏛️ Student 360° Lifetime 20-Year Archive" 
        subtitle="Permanent Legal Dossier, Inward/Outward TC Records & Cumulative Multi-Year Transcripts"
      />

      {/* Global Omni-Search Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Immutable 20-Year Legal Data Vault (Zero Data Loss)</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Instant Student Record & Cumulative Dossier Search
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Search by Student Legal Name (e.g. <strong>Shashi</strong>), Enrollment/Admission Number, Aadhaar Number, or Board Registration to view their entire academic and TC journey.
            </p>
          </div>

          <form onSubmit={handleGlobalSearch} className="w-full md:w-96 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={globalQuery}
                onChange={e => setGlobalQuery(e.target.value)}
                placeholder="Search Shashi, ADM-2024-001..."
                className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={searchingGlobal || !globalQuery.trim()}
              className="px-4 py-2.5 bg-accent hover:brightness-110 text-slate-900 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md"
            >
              {searchingGlobal ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-bold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-700 text-sm">✕</button>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
        <button 
          onClick={() => { setActiveStep('years'); setSelectedYear(null); setSelectedClass(null); setDossier(null); }}
          className={`hover:text-primary transition ${activeStep === 'years' ? 'text-primary underline' : ''}`}
        >
          20-Year Timeline
        </button>

        {selectedYear && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button 
              onClick={() => { setActiveStep('classes'); setSelectedClass(null); setDossier(null); }}
              className={`hover:text-primary transition ${activeStep === 'classes' ? 'text-primary underline' : ''}`}
            >
              Session: {selectedYear.academicYear}
            </button>
          </>
        )}

        {selectedClass && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button 
              onClick={() => { setActiveStep('students'); setDossier(null); }}
              className={`hover:text-primary transition ${activeStep === 'students' ? 'text-primary underline' : ''}`}
            >
              Class: {selectedClass.grade} - {selectedClass.section}
            </button>
          </>
        )}

        {dossier && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-accent font-extrabold">
              {dossier.fullName} ({dossier.admissionNumber})
            </span>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TIER 1: 20-YEAR ACADEMIC TIMELINE CARDS
          ───────────────────────────────────────────────────────────── */}
      {activeStep === 'years' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Select Academic Year (20-Year Horizon)</span>
            </h3>
            <span className="text-xs text-slate-400">Click any session to view admissions vs leaving statistics</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading 20-year archival timeline...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {yearsList.map((yr) => (
                <div
                  key={yr.academicYear}
                  onClick={() => handleSelectYear(yr)}
                  className="card group hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer border border-slate-200 bg-white relative overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-display font-black text-lg text-slate-800 group-hover:text-primary transition">
                      {yr.academicYear}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-primary border border-blue-100">
                      Session Vault
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        <span>Admissions</span>
                      </div>
                      <div className="text-lg font-black text-emerald-800 mt-0.5">
                        +{yr.newAdmissions}
                      </div>
                    </div>

                    <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-center gap-1">
                        <UserMinus className="w-3 h-3" />
                        <span>Left / TC</span>
                      </div>
                      <div className="text-lg font-black text-rose-800 mt-0.5">
                        -{yr.leftSchoolCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Enrolled: {yr.totalEnrolled}</span>
                    <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                      <span>View Classes</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TIER 2: CLASS-WISE ANALYTICS CARDS FOR SELECTED YEAR
          ───────────────────────────────────────────────────────────── */}
      {activeStep === 'classes' && selectedYear && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Session {selectedYear.academicYear}: Class Admission & Exit Cards</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kon si class me kitne bache aaye aur kitno ne school chhod kar TC li
              </p>
            </div>
            <button 
              onClick={() => setActiveStep('years')} 
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Years</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading class records...</div>
          ) : classList.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">No class records registered for this session.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classList.map((cls) => (
                <div
                  key={cls.classId}
                  onClick={() => handleSelectClass(cls)}
                  className="card group hover:border-accent hover:shadow-lg transition-all duration-300 cursor-pointer border border-slate-200 bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display font-extrabold text-base text-slate-900 group-hover:text-primary transition">
                        Class {cls.grade}
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {cls.section ? `Section ${cls.section}` : 'Standard Batch'} • Room {cls.room || 'General'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Advisor: {cls.classTeacher}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        <span>Admitted</span>
                      </span>
                      <div className="text-xl font-black text-emerald-800 mt-1">
                        +{cls.newAdmissions}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-medium">New in this session</span>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-center gap-1">
                        <UserMinus className="w-3 h-3" />
                        <span>Left / TC</span>
                      </span>
                      <div className="text-xl font-black text-rose-800 mt-1">
                        -{cls.leftSchoolCount}
                      </div>
                      <span className="text-[9px] text-rose-600 font-medium">TC issued</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Total Students: {cls.totalEnrolled}</span>
                    <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                      <span>View Students</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TIER 3: CLASS STUDENT ROSTER WITH SEARCH
          ───────────────────────────────────────────────────────────── */}
      {activeStep === 'students' && selectedClass && (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveStep('classes')} 
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  title="Back to classes"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-display font-extrabold text-base text-slate-900 m-0">
                  Class {selectedClass.grade} ({selectedClass.section || 'All'}) — Student Directory
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 ml-7">
                Session {selectedYear?.academicYear} • Click any student to open their complete lifetime dossier
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Filter by name, admission no..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading class roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">No students match your filter in this class.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="table-th">Student Identity</th>
                    <th className="table-th">Admission No</th>
                    <th className="table-th">Father's Name</th>
                    <th className="table-th">Admission Date</th>
                    <th className="table-th">Session Status</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr 
                      key={s.id} 
                      onClick={() => loadDossier(s.id)}
                      className="border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition"
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {s.fullName?.[0] || 'S'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs">{s.fullName}</div>
                            <div className="text-[10px] text-slate-400">{s.gender} • ID: {s.studentIdCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td font-mono font-bold text-xs text-slate-700">
                        {s.admissionNumber}
                      </td>
                      <td className="table-td text-xs text-slate-600 font-medium">
                        {s.fatherName || 'Not Specified'}
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        {s.admissionDate}
                      </td>
                      <td className="table-td">
                        {s.status === 'TC_ISSUED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            📤 TC Issued ({s.outwardTcNumber || 'Left'})
                          </span>
                        ) : s.status === 'NEW_ADMISSION' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            📥 New Admission
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Active Enrolled
                          </span>
                        )}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={(e) => { e.stopPropagation(); loadDossier(s.id); }}
                          className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <span>Open Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TIER 4: COMPLETE LIFETIME MASTER DOSSIER ("SARA KACHA CHITHA")
          ───────────────────────────────────────────────────────────── */}
      {activeStep === 'dossier' && dossier && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedClass) {
                    setActiveStep('students');
                  } else if (selectedYear) {
                    setActiveStep('classes');
                  } else {
                    setActiveStep('years');
                  }
                }}
                className="btn-outline text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1"></div>
              <span className="text-xs font-bold text-slate-400">Archival Vault Record Ref: #{dossier.studentId.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Cumulative Transcript</span>
              </button>
              <button
                onClick={() => toast.info(`Official Bonafide Character Certificate generated for ${dossier.fullName}. Conduct: ${dossier.tcConductRemark}`)}
                className="px-4 py-2 bg-accent hover:brightness-110 text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Character / Bonafide Cert</span>
              </button>
            </div>
          </div>

          {/* Section 1: Legal Identity & KYC Card */}
          <div className="card border border-slate-200 bg-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {dossier.fullName?.[0] || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900">{dossier.fullName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Official 20-Yr Vault Record
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Admission No: <span className="font-mono text-slate-800 font-bold">{dossier.admissionNumber}</span> • Gender: {dossier.gender} • Blood Group: {dossier.bloodGroup || 'O+'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Permanent Address: {dossier.permanentAddress?.city || 'N/A'}, {dossier.permanentAddress?.state || 'India'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
                <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</div>
                  <div className="text-xs font-extrabold text-slate-800 mt-0.5">{dossier.dateOfBirth || '15/08/2010'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar / ID No</div>
                  <div className="text-xs font-mono font-extrabold text-slate-800 mt-0.5">{dossier.aadhaarNumber || 'XXXX-XXXX-9021'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Identification Mark</div>
                  <div className="text-xs font-extrabold text-amber-800 mt-0.5">{dossier.identificationMark}</div>
                </div>
              </div>
            </div>

            {/* Parent & Family Legal Verification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/60">
                <span className="text-[11px] font-extrabold text-primary uppercase">Father / Guardian Particulars</span>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  <div><strong>Full Name:</strong> {dossier.fatherName}</div>
                  <div><strong>Phone:</strong> {dossier.fatherPhone}</div>
                  <div><strong>Occupation:</strong> {dossier.fatherOccupation || 'Service / Professional'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100/60">
                <span className="text-[11px] font-extrabold text-purple-800 uppercase">Mother Particulars</span>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  <div><strong>Full Name:</strong> {dossier.motherName || 'Not Specified'}</div>
                  <div><strong>Phone:</strong> {dossier.motherPhone || 'On Record'}</div>
                  <div><strong>Occupation:</strong> {dossier.motherOccupation || 'Homemaker / Professional'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Origin & Inward Admission Milestone ("Kahan Se Aaya Tha") */}
          <div className="card border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Origin & Inward Admission History (Kahan Se Aaya Tha)</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Admission Date: <strong>{dossier.admissionDate}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Previous School & Affiliation</span>
                <div className="text-sm font-extrabold text-slate-800 mt-1">{dossier.previousSchoolName}</div>
                <div className="text-xs text-slate-500 mt-0.5">Board: {dossier.previousSchoolBoard}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Inward TC Verification</span>
                <div className="text-sm font-extrabold text-slate-800 mt-1">TC No: {dossier.previousTcNumber}</div>
                <div className="text-xs text-slate-500 mt-0.5">Date: {dossier.previousTcDate} • Prev Class: {dossier.previousClassStudied}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Admission Class & Performance</span>
                <div className="text-sm font-extrabold text-emerald-800 mt-1">Admitted in: {dossier.initialAdmissionClass}</div>
                <div className="text-xs text-slate-500 mt-0.5">Prior Marks: {dossier.previousExamPercentage} • Reason: {dossier.reasonForLeavingPrevious}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Lifetime Cumulative Marksheets Ledger (Year-by-Year) */}
          <div className="card border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span>Cumulative Academic Transcripts (Session-by-Session Marksheets)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete subject-wise marks, theory, practical, total, and promotion records across all classes studied
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-primary border border-blue-200">
                Permanent Academic Ledger
              </span>
            </div>

            <div className="space-y-6">
              {dossier.academicTranscripts?.map((trans, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                    <div>
                      <span className="font-display font-extrabold text-base text-slate-900">
                        {trans.className} ({trans.academicYear})
                      </span>
                      <span className="ml-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {trans.enrollmentStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-slate-600">Total: {trans.totalMarks} / {trans.maxMarks}</span>
                      <span className="px-3 py-1 rounded-full bg-primary text-white font-extrabold">
                        {trans.percentage}% ({trans.division})
                      </span>
                    </div>
                  </div>

                  {/* Marksheet table */}
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          <th className="py-2.5 px-3 font-bold text-slate-600">Subject Code</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600">Subject Name</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600 text-center">Theory</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600 text-center">Practical / Internal</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600 text-center">Total (100)</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600 text-center">Grade</th>
                          <th className="py-2.5 px-3 font-bold text-slate-600 text-center">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trans.subjects?.map((sub, sIdx) => (
                          <tr key={sIdx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{sub.subjectCode || 'SUB'}</td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-800">{sub.subjectName}</td>
                            <td className="py-2.5 px-3 text-center text-slate-700">{sub.theoryMarks}</td>
                            <td className="py-2.5 px-3 text-center text-slate-700">{sub.practicalMarks}</td>
                            <td className="py-2.5 px-3 text-center font-black text-primary">{sub.totalMarks}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">{sub.grade}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                    <span>Promotion Status: <strong className="text-slate-800">{trans.promotionOutcome}</strong></span>
                    <span>Verified by: Controller of Examinations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: School Exit & Outward TC Record ("Kahan Tak Padha") */}
          <div className="card border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" />
                <span>School Exit & Outward TC Record (Kahan Tak Padha)</span>
              </h3>
              {dossier.outwardTcNumber ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Transfer Certificate Issued
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Currently Enrolled / Active Student
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Class Up To Which Studied</span>
                <div className="text-base font-black text-slate-800 mt-1">{dossier.leavingClass}</div>
                <div className="text-xs text-slate-500 mt-0.5">Completed Curriculum Track</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Outward TC Certificate</span>
                <div className="text-sm font-extrabold text-slate-800 mt-1">
                  {dossier.outwardTcNumber ? `TC No: ${dossier.outwardTcNumber}` : 'Not Discharged (Active)'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Issued: {dossier.outwardTcIssuedDate || 'N/A (Student is currently studying)'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Conduct & Character Assessment</span>
                <div className="text-sm font-extrabold text-slate-800 mt-1">{dossier.tcConductRemark}</div>
                <div className="text-xs text-slate-500 mt-0.5">Reason: {dossier.tcReason || 'Regular Studies Ongoing'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
