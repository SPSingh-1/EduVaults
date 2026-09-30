import { useState, useEffect, useCallback } from "react";
import Topbar from "../../components/layout/Topbar";
import { apiClient } from "../../api/apiClient";
import { formatClassLabel } from "../../utils/classUtils";
import {
  Download, Filter, RotateCcw, Printer, ChevronRight,
  AlertCircle, CheckCircle2, Users, Receipt, BarChart2,
  Loader2, FileText, IndianRupee, Calendar
} from "lucide-react";
import * as XLSX from "xlsx";

const DateInput = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const fmt = v => {
    if (!v) return "";
    const p = v.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v;
  };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={focused ? "date" : "text"}
        value={focused ? value : fmt(value)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dd/mm/yyyy"
        className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl"
        style={{ width: "130px" }}
      />
    </div>
  );
};

const REPORT_TYPES = [
  { id: "transactions",       label: "Transaction Log",    icon: Receipt,      desc: "Har ek transaction ki detail with grand total" },
  { id: "pending-by-class",   label: "Pending Payments",   icon: AlertCircle,  desc: "Kon kon se bacho ka payment baki hai" },
  { id: "completed-by-class", label: "Completed Payments", icon: CheckCircle2, desc: "Jinon ne payment complete kar li" },
  { id: "student-detail",     label: "Student Ledger",     icon: Users,        desc: "Specific student ka pura payment record" },
  { id: "collection-summary", label: "Collection Summary", icon: BarChart2,    desc: "Class-wise / fee-wise collection breakdown" },
];

const UPI_PROVIDERS = ["Paytm", "PhonePe", "Google Pay", "Bhim Pay", "Navi"];
const fmtAmt = n => `\u20B9${Number(n || 0).toLocaleString("en-IN")}`;

const StatusBadge = ({ status }) => {
  const raw = String(status || "").trim();
  const s = raw.toLowerCase();
  const label = raw.toUpperCase();
  const cls =
    s === "success" || s === "paid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "partial" || s === "partially paid"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${cls}`}>
      {label}
    </span>
  );
};

const getClassSortOrder = (grade) => {
  if (!grade) return 999;
  const str = String(grade).trim().toLowerCase();
  if (str.includes("play")) return -4;
  if (str.includes("nur"))  return -3;
  if (str.includes("lkg"))  return -2;
  if (str.includes("ukg"))  return -1;
  const digits = str.replace(/[^0-9]/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) || num <= 0 ? 999 : num;
};

const sortClasses = (list) => {
  return [...list].sort((a, b) => {
    const orderA = getClassSortOrder(a.grade);
    const orderB = getClassSortOrder(b.grade);
    if (orderA !== orderB) return orderA - orderB;
    const secA = (a.section || "").trim().toUpperCase();
    const secB = (b.section || "").trim().toUpperCase();
    return secA.localeCompare(secB);
  });
};

const sortStudents = (list) => {
  return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
};

// ───────────────────────────────────────────────────────────────────────────
const PaymentReports = () => {
  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [classId,         setClassId]         = useState("");
  const [studentId,       setStudentId]       = useState("");
  const [paymentType,     setPaymentType]     = useState("");
  const [onlineSub,       setOnlineSub]       = useState("");
  const [upiProvider,     setUpiProvider]     = useState("");
  const [reportType,      setReportType]      = useState("transactions");
  const [classesList,     setClassesList]     = useState([]);
  const [studentsList,    setStudentsList]    = useState([]);
  const [reportData,      setReportData]      = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generated,       setGenerated]       = useState(false);

  useEffect(() => {
    apiClient.get("/academics/classes")
      .then(r => setClassesList(sortClasses(Array.isArray(r.data) ? r.data : [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setStudentId("");
    if (!classId) { setStudentsList([]); return; }
    setLoadingStudents(true);
    apiClient.get("/academics/students")
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        setStudentsList(sortStudents(all.filter(s => s.classId === classId)));
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [classId]);

  useEffect(() => { setOnlineSub(""); setUpiProvider(""); }, [paymentType]);
  useEffect(() => { setUpiProvider(""); }, [onlineSub]);

  const buildParams = useCallback(() => {
    const p = {};
    if (dateFrom)  p.dateFrom  = dateFrom;
    if (dateTo)    p.dateTo    = dateTo;
    if (classId)   p.classId   = classId;
    if (studentId) p.studentId = studentId;
    if (paymentType === "Cash") {
      p.paymentMethod = "Cash";
    } else if (paymentType === "Online") {
      if (onlineSub === "Bank")       { p.paymentMethod = "Bank"; }
      else if (onlineSub === "UPI")   { p.paymentMethod = "UPI"; if (upiProvider) p.upiProvider = upiProvider; }
      else                            { p.paymentMethod = "Online"; }
    }
    return p;
  }, [dateFrom, dateTo, classId, studentId, paymentType, onlineSub, upiProvider]);

  const handleGenerate = useCallback(async () => {
    setLoading(true); setReportData(null); setGenerated(false);
    try {
      const res = await apiClient.get(`/billing/reports/${reportType}`, { params: buildParams() });
      setReportData(res.data); setGenerated(true);
    } catch (err) { console.error("Report error:", err); }
    finally { setLoading(false); }
  }, [reportType, buildParams]);

  const handleReset = () => {
    setDateFrom(""); setDateTo(""); setClassId(""); setStudentId("");
    setPaymentType(""); setOnlineSub(""); setUpiProvider("");
    setReportData(null); setGenerated(false);
  };

  const handleExport = () => {
    if (!reportData) return;
    const wb   = XLSX.utils.book_new();
    const meta = REPORT_TYPES.find(r => r.id === reportType);
    const date = new Date().toISOString().slice(0, 10);
    const addSheet = (data, name) => { if (!data?.length) return; XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name); };

    if (reportType === "transactions" && reportData.transactions) {
      const rows = reportData.transactions.map(t => ({ "Ref No": t.referenceNumber, "Student": t.studentName, "Class": t.className, "Fee": t.feeName, "Date": t.date, "Method": t.paymentMethod, "Amount": t.amount, "Status": String(t.status || "").toUpperCase() }));
      rows.push({ "Ref No": "GRAND TOTAL", "Amount": reportData.grandTotal });
      addSheet(rows, "Transactions");
    } else if (reportType === "pending-by-class" && reportData.students) {
      const rows = reportData.students.map(s => ({ "Student": s.studentName, "Roll": s.rollNo, "Class": s.className, "Billed": s.totalBilled, "Paid": s.totalPaid, "Pending": s.pendingAmount, "Due Date": s.nearestDueDate, "Overdue Days": s.daysOverdue }));
      rows.push({ "Student": "TOTAL PENDING", "Pending": reportData.totalPending });
      addSheet(rows, "Pending");
    } else if (reportType === "completed-by-class" && reportData.students) {
      const rows = reportData.students.map(s => ({ "Student": s.studentName, "Roll": s.rollNo, "Class": s.className, "Paid": s.totalPaid, "Fee Types": s.feeTypes, "Last Paid": s.lastPaidDate }));
      rows.push({ "Student": "TOTAL COLLECTED", "Paid": reportData.totalCollected });
      addSheet(rows, "Completed");
    } else if (reportType === "student-detail" && reportData.invoices) {
      addSheet(reportData.invoices.map(i => ({ "Fee": i.feeName, "Amount": i.amount, "Paid": i.paidAmount, "Due": i.dueAmount, "Issue": i.issueDate, "Due Date": i.dueDate, "Status": String(i.status || "").toUpperCase() })), "Invoices");
      if (reportData.transactions?.length) addSheet(reportData.transactions.map(t => ({ "Date": t.date, "Ref": t.referenceNo, "Amount": t.amount, "Method": t.paymentMethod, "Fee": t.feeName, "Status": String(t.status || "").toUpperCase() })), "Transactions");
    } else if (reportType === "collection-summary") {
      if (reportData.classwise?.length)  addSheet(reportData.classwise.map(c  => ({ "Class": c.className,   "Students": c.studentCount, "Collected": c.totalCollected, "Pending": c.totalPending })), "Class-wise");
      if (reportData.feewise?.length)    addSheet(reportData.feewise.map(f    => ({ "Fee": f.feeName,        "Freq": f.frequency,       "Collected": f.totalCollected, "Pending": f.totalPending })), "Fee-wise");
      if (reportData.monthwise?.length)  addSheet(reportData.monthwise.map(m  => ({ "Month": m.month,       "Collected": m.collected,  "Pending": m.pending })), "Month-wise");
    }
    XLSX.writeFile(wb, `PaymentReport_${(meta?.label || "").replace(/\s+/g, "_")}_${date}.xlsx`);
  };

  const getMethodLabel = () => {
    if (!paymentType)           return "All Methods";
    if (paymentType === "Cash") return "Cash";
    if (onlineSub === "Bank")   return "Bank Transfer";
    if (onlineSub === "UPI")    return upiProvider ? `UPI - ${upiProvider}` : "UPI (All)";
    return "Online";
  };

  const currentReport = REPORT_TYPES.find(r => r.id === reportType);

  return (
    <div className="space-y-5">
      <Topbar
        title="Payment Reports"
        subtitle="Dashboard > Fees > Payment Reports"
        actions={
          <div className="flex gap-2">
            {generated && reportData && (
              <>
                <button onClick={() => window.print()} className="btn-outline text-xs flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={handleExport} className="btn-primary text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              </>
            )}
          </div>
        }
      />

      {/* ── Filter Card ── */}
      <div className="card no-print">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Filter className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-primary text-sm m-0">Report Filters</h3>
            <p className="text-[10px] text-gray-400">Filters select karo phir Generate Report click karo</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
          <DateInput label="Date To"   value={dateTo}   onChange={setDateTo} />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl" style={{ minWidth: "145px" }}>
              <option value="">— All Classes —</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{formatClassLabel(c.grade, c.section)}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Student {loadingStudents && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
            </label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId}
              className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl disabled:opacity-50" style={{ minWidth: "155px" }}>
              <option value="">— {classId ? "All Students" : "Select Class First"} —</option>
              {studentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Payment Type</label>
            <select value={paymentType} onChange={e => setPaymentType(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl" style={{ minWidth: "145px" }}>
              <option value="">— All Methods —</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl" style={{ minWidth: "175px" }}>
              {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Payment sub-type cascade */}
        {paymentType === "Online" && (
          <div className="mt-3 flex items-center gap-3 flex-wrap pl-3 border-l-2 border-primary/20">
            <ChevronRight className="w-4 h-4 text-primary/40" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Online Sub-type</label>
              <select value={onlineSub} onChange={e => setOnlineSub(e.target.value)}
                className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl" style={{ minWidth: "145px" }}>
                <option value="">— UPI + Bank —</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>
            {onlineSub === "UPI" && (
              <>
                <ChevronRight className="w-4 h-4 text-primary/30 mt-4" />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">UPI Provider</label>
                  <select value={upiProvider} onChange={e => setUpiProvider(e.target.value)}
                    className="input text-xs py-1.5 px-3 bg-white border border-gray-200 rounded-xl" style={{ minWidth: "155px" }}>
                    <option value="">— All UPI —</option>
                    {UPI_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50 flex-wrap">
          <button onClick={handleGenerate} disabled={loading}
            className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> Generate Report</>}
          </button>
          <button onClick={handleReset} className="btn-outline text-xs flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <div className="flex flex-wrap gap-1.5">
            {(dateFrom || dateTo) && (
              <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-semibold rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3" />{dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom || dateTo}
              </span>
            )}
            {classId && classesList.find(c => c.id === classId) && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">
                {formatClassLabel(classesList.find(c => c.id === classId).grade, classesList.find(c => c.id === classId).section)}
              </span>
            )}
            {studentId && studentsList.find(s => s.id === studentId) && (
              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-semibold rounded-full">
                {studentsList.find(s => s.id === studentId)?.name}
              </span>
            )}
            {paymentType && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full">
                {getMethodLabel()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!generated && !loading && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
            {currentReport && <currentReport.icon className="w-8 h-8 text-primary/40" />}
          </div>
          <h3 className="font-display font-semibold text-primary text-sm mb-1">{currentReport?.label}</h3>
          <p className="text-xs text-gray-400">{currentReport?.desc}</p>
          <p className="text-xs text-gray-300 mt-2">Filters select karo aur Generate Report click karo</p>
        </div>
      )}

      {loading && (
        <div className="card flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-sm text-gray-500 font-medium">Report generate ho raha hai...</p>
        </div>
      )}

      {generated && reportType === "transactions"       && reportData && <ReportTransactions     data={reportData} />}
      {generated && reportType === "pending-by-class"   && reportData && <ReportPending          data={reportData} />}
      {generated && reportType === "completed-by-class" && reportData && <ReportCompleted        data={reportData} />}
      {generated && reportType === "student-detail"     && reportData && <ReportStudentDetail    data={reportData} />}
      {generated && reportType === "collection-summary" && reportData && <ReportCollectionSummary data={reportData} />}
    </div>
  );
};

// ───────────────────── R1: Transaction Log ────────────────────────────────
const ReportTransactions = ({ data }) => {
  const txns = data.transactions || [];
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-primary m-0">Transaction Log</h3>
          <p className="text-xs text-gray-400">{txns.length} transactions found</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <IndianRupee className="w-4 h-4 text-emerald-600" />
          <span className="text-xs text-gray-500 font-medium">Grand Total:</span>
          <span className="font-display font-black text-emerald-700">{fmtAmt(data.grandTotal)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: "820px" }}>
          <thead>
            <tr className="border-b border-gray-100">
              {["#","Reference No.","Student","Class","Fee","Date","Method","Amount","Status"].map(h => (
                <th key={h} className={`table-th ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txns.map((t, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <td className="table-td text-xs text-gray-400 font-mono">{i + 1}</td>
                <td className="table-td font-mono text-xs text-primary font-bold">{t.referenceNumber}</td>
                <td className="table-td text-sm font-semibold">{t.studentName}</td>
                <td className="table-td text-xs text-gray-500">{t.className}</td>
                <td className="table-td text-xs text-gray-600">{t.feeName}</td>
                <td className="table-td text-xs text-gray-400">{t.date}</td>
                <td className="table-td">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">{t.paymentMethod}</span>
                </td>
                <td className="table-td text-right font-bold text-primary">{fmtAmt(t.amount)}</td>
                <td className="table-td text-center"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">Koi transaction nahi mili is filter ke sath.</td></tr>}
          </tbody>
          {txns.length > 0 && (
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td colSpan={7} className="table-td font-bold text-primary text-sm text-right pr-4">Grand Total</td>
                <td className="table-td text-right font-display font-black text-primary text-base">{fmtAmt(data.grandTotal)}</td>
                <td className="table-td" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ───────────────────── R2: Pending Payments ───────────────────────────────
const ReportPending = ({ data }) => {
  const students = data.students || [];
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-primary m-0">Pending Payments</h3>
          <p className="text-xs text-gray-400">{data.totalStudents} students with pending dues</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span className="text-xs text-gray-500 font-medium">Total Pending:</span>
          <span className="font-display font-black text-rose-600">{fmtAmt(data.totalPending)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: "760px" }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th text-left">Student</th>
              <th className="table-th">Roll No</th>
              <th className="table-th">Class</th>
              <th className="table-th text-right">Total Billed</th>
              <th className="table-th text-right">Paid</th>
              <th className="table-th text-right">Pending</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                <td className="table-td font-semibold text-sm">{s.studentName}</td>
                <td className="table-td text-center font-mono text-xs text-gray-500">{s.rollNo}</td>
                <td className="table-td text-center text-xs text-gray-500">{s.className}</td>
                <td className="table-td text-right text-sm text-gray-700">{fmtAmt(s.totalBilled)}</td>
                <td className="table-td text-right text-sm text-emerald-600 font-semibold">{fmtAmt(s.totalPaid)}</td>
                <td className="table-td text-right font-bold text-rose-600">{fmtAmt(s.pendingAmount)}</td>
                <td className="table-td text-center text-xs text-gray-500">{s.nearestDueDate}</td>
                <td className="table-td text-center">
                  {s.daysOverdue > 0
                    ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">{s.daysOverdue}d overdue</span>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Is class mein koi pending dues nahi hain!</td></tr>}
          </tbody>
          {students.length > 0 && (
            <tfoot>
              <tr className="bg-rose-50/60 border-t-2 border-rose-200">
                <td colSpan={5} className="table-td font-bold text-rose-700 text-sm text-right pr-4">Total Pending</td>
                <td className="table-td text-right font-display font-black text-rose-600 text-base">{fmtAmt(data.totalPending)}</td>
                <td colSpan={2} className="table-td" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ───────────────────── R3: Completed Payments ─────────────────────────────
const ReportCompleted = ({ data }) => {
  const students = data.students || [];
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-primary m-0">Completed Payments</h3>
          <p className="text-xs text-gray-400">{data.totalStudents} students with fully paid invoices</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs text-gray-500 font-medium">Total Collected:</span>
          <span className="font-display font-black text-emerald-700">{fmtAmt(data.totalCollected)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: "650px" }}>
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th text-left">Student</th>
              <th className="table-th">Roll No</th>
              <th className="table-th">Class</th>
              <th className="table-th text-right">Total Paid</th>
              <th className="table-th text-left">Fee Types</th>
              <th className="table-th">Last Paid</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                <td className="table-td font-semibold text-sm">{s.studentName}</td>
                <td className="table-td text-center font-mono text-xs text-gray-500">{s.rollNo}</td>
                <td className="table-td text-center text-xs text-gray-500">{s.className}</td>
                <td className="table-td text-right font-bold text-emerald-600">{fmtAmt(s.totalPaid)}</td>
                <td className="table-td text-xs text-gray-500">{s.feeTypes}</td>
                <td className="table-td text-center text-xs text-gray-400">{s.lastPaidDate}</td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Is period mein koi complete payment nahi mili.</td></tr>}
          </tbody>
          {students.length > 0 && (
            <tfoot>
              <tr className="bg-emerald-50/60 border-t-2 border-emerald-200">
                <td colSpan={3} className="table-td font-bold text-emerald-700 text-sm text-right pr-4">Total Collected</td>
                <td className="table-td text-right font-display font-black text-emerald-700 text-base">{fmtAmt(data.totalCollected)}</td>
                <td colSpan={2} className="table-td" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ───────────────────── R4: Student Detail Ledger ──────────────────────────
const ReportStudentDetail = ({ data }) => {
  if (!data.studentInfo) return <div className="card text-center py-12 text-gray-400">Student data nahi mila.</div>;
  const { studentInfo, invoices = [], transactions = [], summary } = data;
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-5 border-b border-gray-100">
          <div>
            <h3 className="font-display font-bold text-xl text-primary m-0">{studentInfo.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Roll: <span className="font-mono font-semibold">{studentInfo.rollNo}</span>{" · "}{studentInfo.className}
            </p>
            {studentInfo.guardianPhone !== "N/A" && <p className="text-xs text-gray-400 mt-0.5">Phone: {studentInfo.guardianPhone}</p>}
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { l: "Total Billed", v: fmtAmt(summary?.totalBilled), b: "bg-gray-50 border-gray-200",      t: "text-gray-700" },
              { l: "Total Paid",   v: fmtAmt(summary?.totalPaid),   b: "bg-emerald-50 border-emerald-200", t: "text-emerald-700" },
              ...(summary?.advancePaid > 0 ? [{ l: "Advance / Excess", v: fmtAmt(summary.advancePaid), b: "bg-blue-50 border-blue-200", t: "text-blue-700" }] : []),
              { l: "Total Due",    v: fmtAmt(summary?.totalDue),     b: "bg-rose-50 border-rose-200",       t: "text-rose-600" },
            ].map(s => (
              <div key={s.l} className={`flex flex-col px-4 py-3 rounded-xl border ${s.b} min-w-[115px]`}>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{s.l}</span>
                <span className={`font-display font-black text-lg ${s.t}`}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        <h4 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Invoice Summary</h4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full" style={{ minWidth: "600px" }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th text-left">Fee</th>
                <th className="table-th text-right">Amount</th>
                <th className="table-th text-right">Paid</th>
                <th className="table-th text-right">Due</th>
                <th className="table-th">Issue Date</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="table-td font-semibold text-sm">{inv.feeName}</td>
                  <td className="table-td text-right text-sm">{fmtAmt(inv.amount)}</td>
                  <td className="table-td text-right text-sm text-emerald-600 font-semibold">{fmtAmt(inv.paidAmount)}</td>
                  <td className="table-td text-right text-sm font-bold text-rose-600">{fmtAmt(inv.dueAmount)}</td>
                  <td className="table-td text-center text-xs text-gray-400">{inv.issueDate}</td>
                  <td className="table-td text-center text-xs text-gray-400">{inv.dueDate}</td>
                  <td className="table-td text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">
          Payment History ({transactions.length} transactions)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: "580px" }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th text-left">Date</th>
                <th className="table-th text-left">Reference No.</th>
                <th className="table-th text-right">Amount</th>
                <th className="table-th text-left">Method</th>
                <th className="table-th text-left">Fee</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="table-td text-xs text-gray-500">{t.date}</td>
                  <td className="table-td font-mono text-xs text-primary font-bold">{t.referenceNo}</td>
                  <td className="table-td text-right font-bold text-primary">{fmtAmt(t.amount)}</td>
                  <td className="table-td">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">{t.paymentMethod}</span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{t.feeName}</td>
                  <td className="table-td text-center"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Koi transaction nahi mili.</td></tr>}
            </tbody>
            {transactions.length > 0 && (
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td colSpan={2} className="table-td font-bold text-primary text-sm text-right pr-4">Total Paid</td>
                  <td className="table-td text-right font-display font-black text-primary">{fmtAmt(summary?.totalPaid)}</td>
                  <td colSpan={3} className="table-td" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

// ───────────────────── R5: Collection Summary ─────────────────────────────
const ReportCollectionSummary = ({ data }) => {
  const [activeTab, setActiveTab] = useState("classwise");
  const tabs = [{ id: "classwise", label: "Class-wise" }, { id: "feewise", label: "Fee-wise" }, { id: "monthwise", label: "Month-wise" }];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-gray-400 font-medium mb-1">Total Collected</div>
            <div className="font-display text-2xl font-black text-emerald-600">{fmtAmt(data.grandTotal?.totalCollected)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-gray-400 font-medium mb-1">Total Pending</div>
            <div className="font-display text-2xl font-black text-rose-600">{fmtAmt(data.grandTotal?.totalPending)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="flex gap-4 border-b border-gray-100 mb-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "classwise" && (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "450px" }}>
              <thead><tr className="border-b border-gray-100">
                <th className="table-th text-left">Class</th>
                <th className="table-th">Students</th>
                <th className="table-th text-right">Collected</th>
                <th className="table-th text-right">Pending</th>
              </tr></thead>
              <tbody>
                {(data.classwise || []).map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="table-td font-semibold text-sm">{c.className}</td>
                    <td className="table-td text-center text-xs text-gray-500">{c.studentCount}</td>
                    <td className="table-td text-right font-bold text-emerald-600">{fmtAmt(c.totalCollected)}</td>
                    <td className="table-td text-right font-semibold text-rose-500">{fmtAmt(c.totalPending)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td colSpan={2} className="table-td font-bold text-primary text-sm text-right">Grand Total</td>
                  <td className="table-td text-right font-display font-black text-emerald-700">{fmtAmt(data.grandTotal?.totalCollected)}</td>
                  <td className="table-td text-right font-display font-black text-rose-600">{fmtAmt(data.grandTotal?.totalPending)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === "feewise" && (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "420px" }}>
              <thead><tr className="border-b border-gray-100">
                <th className="table-th text-left">Fee Name</th>
                <th className="table-th">Frequency</th>
                <th className="table-th text-right">Collected</th>
                <th className="table-th text-right">Pending</th>
              </tr></thead>
              <tbody>
                {(data.feewise || []).map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="table-td font-semibold text-sm">{f.feeName}</td>
                    <td className="table-td text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">{f.frequency}</span>
                    </td>
                    <td className="table-td text-right font-bold text-emerald-600">{fmtAmt(f.totalCollected)}</td>
                    <td className="table-td text-right font-semibold text-rose-500">{fmtAmt(f.totalPending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "monthwise" && (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "400px" }}>
              <thead><tr className="border-b border-gray-100">
                <th className="table-th text-left">Month</th>
                <th className="table-th text-right">Collected</th>
                <th className="table-th text-right">Pending</th>
                <th className="table-th text-right">Collection %</th>
              </tr></thead>
              <tbody>
                {(data.monthwise || []).map((m, i) => {
                  const total = (m.collected || 0) + (m.pending || 0);
                  const pct = total > 0 ? Math.round((m.collected / total) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="table-td font-semibold text-sm">{m.month}</td>
                      <td className="table-td text-right font-bold text-emerald-600">{fmtAmt(m.collected)}</td>
                      <td className="table-td text-right font-semibold text-rose-500">{fmtAmt(m.pending)}</td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReports;
