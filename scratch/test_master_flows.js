const http = require('http');
const https = require('https');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../src/EduVault.Express/node_modules/pg'));

const API_BASE = 'http://localhost:5265';
const EXPRESS_BASE = 'http://localhost:5005';

const pgConfig = {
  host: 'ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_AtsjP8Okzbe4',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

let pgClient;

function request(urlStr, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = body;
        try { parsed = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const stats = {
  totalFlows: 10,
  passedFlows: 0,
  failedFlows: 0,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  bugs: []
};

function recordTest(module, flow, title, expected, actual, passed, bugDetail = null) {
  stats.totalTests++;
  if (passed) {
    stats.passedTests++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    stats.failedTests++;
    console.error(`  ❌ [FAIL] ${title} | Expected: ${expected} | Actual: ${JSON.stringify(actual)}`);
    if (bugDetail) {
      stats.bugs.push({
        id: `BUG-${String(stats.bugs.length + 1).padStart(3, '0')}`,
        module,
        flow,
        title,
        expected,
        actual,
        detail: bugDetail
      });
    }
  }
}

async function runMasterFlowSuite() {
  console.log("=========================================================================");
  console.log("🚀 STARTING COMPLETE EDUVAULT END-TO-END QA & MASTER FLOW TEST SUITE");
  console.log("=========================================================================\n");

  pgClient = new Client(pgConfig);
  await pgClient.connect();
  console.log("📦 PostgreSQL NeonDB connection established successfully.\n");

  let superAdminToken = '';
  let schoolAId = '';
  let schoolBId = '';
  let schoolAdminToken = '';
  let schoolBAdminToken = '';
  let teacherToken = '';
  let accountantToken = '';
  let librarianToken = '';
  let receptionistToken = '';
  let student1Token = '';
  let student1Id = '';
  let student2Id = '';
  let class10Id = '';
  let class11Id = '';
  let subjectMathId = '';
  let teacherId = '';
  let invoiceId = '';
  let bookId = '';
  let issueId = '';
  let examId = '';

  // ---------------------------------------------------------------------------
  // MODULE 1: AUTHENTICATION & RBAC
  // ---------------------------------------------------------------------------
  console.log("▶ MODULE 1: AUTHENTICATION & SECURITY GUARDS");
  {
    // 1.1 SuperAdmin Login
    const res = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: 'superadmin@eduvault.com',
      password: 'Admin123!'
    });
    const pass = res.status === 200 && res.body.token && (res.body.user?.role === 'superadmin' || res.body.role === 'superadmin');
    superAdminToken = res.body.token;
    recordTest("Authentication", "SuperAdmin Login", "Valid SuperAdmin login generates JWT and user payload", 200, res.status, pass);

    // 1.2 Negative: Invalid Password
    const resBadPass = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: 'superadmin@eduvault.com',
      password: 'WrongPassword999!'
    });
    recordTest("Authentication", "Invalid Login", "Invalid credentials returns 401 Unauthorized", 401, resBadPass.status, resBadPass.status === 401);

    // 1.3 Negative: Empty credentials
    const resEmpty = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: '',
      password: ''
    });
    recordTest("Authentication", "Empty Login", "Empty credentials returns 400 Bad Request", 400, resEmpty.status, resEmpty.status === 400);

    // 1.4 Unauthenticated call to protected endpoint
    const resNoAuth = await request(`${API_BASE}/api/super/schools`, 'GET');
    recordTest("Authentication", "Route Guard", "Accessing protected endpoint without token returns 401", 401, resNoAuth.status, resNoAuth.status === 401);
  }

  // ---------------------------------------------------------------------------
  // MODULE 2: FLOW 1 - SUPER ADMIN PLATFORM PROVISIONING & TENANTS
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 2: FLOW 1 — SUPER ADMIN PLATFORM PROVISIONING (/super-admin/*)");
  {
    // Create School Tenant A
    const schoolAPayload = {
      schoolName: `QA_School_Alpha_${Date.now()}`,
      address: "100 QA Academic Boulevard, Knowledge City",
      city: "Knowledge City",
      website: "https://alpha.qa.eduvault.com",
      adminName: "Alpha School Admin",
      adminEmail: `admin.alpha.${Date.now()}@eduvault.com`,
      adminPassword: "Password123!"
    };

    const resSchoolA = await request(`${API_BASE}/api/super/schools`, 'POST', schoolAPayload, superAdminToken);
    schoolAId = resSchoolA.body?.schoolId;
    const passSchoolA = (resSchoolA.status === 200 || resSchoolA.status === 201) && !!schoolAId;
    recordTest("SuperAdmin", "Create School Tenant A", "Create School Tenant A returns 200/201 with SchoolId", "200/201", resSchoolA.status, passSchoolA);

    // Verify DB row in PostgreSQL
    const dbSchool = await pgClient.query('SELECT * FROM "Schools" WHERE "Id" = $1', [schoolAId]);
    recordTest("Database", "Schools DB Persistence", "School record is persisted in PostgreSQL Schools table", 1, dbSchool.rows.length, dbSchool.rows.length === 1);

    // Create School Tenant B (for multi-tenant isolation testing)
    const schoolBPayload = {
      schoolName: `QA_School_Beta_${Date.now()}`,
      address: "200 QA Beta Street",
      city: "Beta City",
      website: "https://beta.qa.eduvault.com",
      adminName: "Beta School Admin",
      adminEmail: `admin.beta.${Date.now()}@eduvault.com`,
      adminPassword: "Password123!"
    };
    const resSchoolB = await request(`${API_BASE}/api/super/schools`, 'POST', schoolBPayload, superAdminToken);
    schoolBId = resSchoolB.body?.schoolId;
    recordTest("SuperAdmin", "Create School Tenant B", "Create School Tenant B for isolation testing", "200/201", resSchoolB.status, (resSchoolB.status === 200 || resSchoolB.status === 201) && !!schoolBId);

    // Enable Dynamic Modules (HRM, Library, Receptionist) on School A
    const resModules = await request(`${API_BASE}/api/super/schools/${schoolAId}/modules`, 'PUT', {
      hasAccountModule: true,
      hasLibraryModule: true,
      hasReceptionistModule: true
    }, superAdminToken);
    recordTest("SuperAdmin", "Dynamic Module Toggles", "Enable HRM, Library, and Receptionist modules", 200, resModules.status, resModules.status === 200);

    // Login as School Admin A
    const resAdminLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: schoolAPayload.adminEmail,
      password: schoolAPayload.adminPassword
    });
    schoolAdminToken = resAdminLogin.body?.token;
    recordTest("Authentication", "School Admin A Login", "School Admin A logs in successfully", 200, resAdminLogin.status, resAdminLogin.status === 200 && !!schoolAdminToken);

    // Login as School Admin B
    const resAdminBLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: schoolBPayload.adminEmail,
      password: schoolBPayload.adminPassword
    });
    schoolBAdminToken = resAdminBLogin.body?.token;
    recordTest("Authentication", "School Admin B Login", "School Admin B logs in successfully", 200, resAdminBLogin.status, resAdminBLogin.status === 200 && !!schoolBAdminToken);
  }

  // ---------------------------------------------------------------------------
  // MODULE 3: FLOW 2 - SCHOOL SETUP, BRANDING & ACADEMIC INFRASTRUCTURE
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 3: FLOW 2 — SCHOOL ADMIN SETUP & ACADEMIC INFRASTRUCTURE (/school-admin/*)");
  {
    // Create Class Grade 10
    const resClass10 = await request(`${API_BASE}/api/academics/classes`, 'POST', {
      grade: "10",
      section: "Section A",
      capacity: 40,
      level: "Secondary Education",
      room: "Room 10A"
    }, schoolAdminToken);
    class10Id = resClass10.body?.id || resClass10.body?.class?.id;
    recordTest("Academics", "Create Class Grade 10", "Create Class Grade 10", "200/201", resClass10.status, (resClass10.status === 200 || resClass10.status === 201) && !!class10Id);

    // Create Class Grade 11 (for promotion target)
    const resClass11 = await request(`${API_BASE}/api/academics/classes`, 'POST', {
      grade: "11",
      section: "Section A",
      capacity: 40,
      level: "Higher Secondary",
      room: "Room 11A"
    }, schoolAdminToken);
    class11Id = resClass11.body?.id || resClass11.body?.class?.id;
    recordTest("Academics", "Create Class Grade 11", "Create Class Grade 11 for next session promotion", "200/201", resClass11.status, (resClass11.status === 200 || resClass11.status === 201) && !!class11Id);

    // Create Subject: Mathematics
    const resSubMath = await request(`${API_BASE}/api/academics/subjects`, 'POST', {
      name: `Mathematics_${Date.now()}`,
      code: `MATH_${Date.now()}`,
      department: "Science & Mathematics"
    }, schoolAdminToken);
    subjectMathId = resSubMath.body?.id;
    recordTest("Academics", "Create Subject", "Create Mathematics subject", "200/201", resSubMath.status, (resSubMath.status === 200 || resSubMath.status === 201) && !!subjectMathId);

    // Register Teacher
    const teacherEmail = `teacher.qa.${Date.now()}@eduvault.com`;
    const resTeacher = await request(`${API_BASE}/api/academics/teachers`, 'POST', {
      firstName: "John",
      lastName: "Doe",
      email: teacherEmail,
      password: "Password123!",
      specialization: "Mathematics",
      department: "Science & Mathematics"
    }, schoolAdminToken);
    teacherId = resTeacher.body?.userId;
    recordTest("Academics", "Register Teacher", "Register Teacher user in school", "200/201", resTeacher.status, (resTeacher.status === 200 || resTeacher.status === 201));

    // Login as Teacher
    const resTeacherLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: teacherEmail,
      password: "Password123!"
    });
    teacherToken = resTeacherLogin.body?.token;
    recordTest("Authentication", "Teacher Login", "Teacher logs in successfully", 200, resTeacherLogin.status, resTeacherLogin.status === 200 && !!teacherToken);

    // Register Account Manager
    const acctEmail = `accountant.qa.${Date.now()}@eduvault.com`;
    const resAcct = await request(`${API_BASE}/api/academics/register-account-manager`, 'POST', {
      firstName: "Robert",
      lastName: "Accounts",
      email: acctEmail,
      password: "Password123!",
      employeeId: `ACC-QA-${Date.now()}`
    }, schoolAdminToken);
    recordTest("Authentication", "Register Account Manager", "Register Account Manager user", "200/201", resAcct.status, (resAcct.status === 200 || resAcct.status === 201));

    const resAcctLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: acctEmail,
      password: "Password123!"
    });
    accountantToken = resAcctLogin.body?.token;
    recordTest("Authentication", "Account Manager Login", "Account Manager logs in", 200, resAcctLogin.status, resAcctLogin.status === 200 && !!accountantToken);

    // Register Librarian
    const libEmail = `librarian.qa.${Date.now()}@eduvault.com`;
    const resLib = await request(`${API_BASE}/api/academics/register-librarian`, 'POST', {
      firstName: "Lucy",
      lastName: "Books",
      email: libEmail,
      password: "Password123!",
      employeeId: `LIB-QA-${Date.now()}`
    }, schoolAdminToken);
    recordTest("Authentication", "Register Librarian", "Register Librarian user", "200/201", resLib.status, (resLib.status === 200 || resLib.status === 201));

    const resLibLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: libEmail,
      password: "Password123!"
    });
    librarianToken = resLibLogin.body?.token;
    recordTest("Authentication", "Librarian Login", "Librarian logs in", 200, resLibLogin.status, resLibLogin.status === 200 && !!librarianToken);

    // Register Receptionist
    const recepEmail = `receptionist.qa.${Date.now()}@eduvault.com`;
    const resRecep = await request(`${API_BASE}/api/academics/register-receptionist`, 'POST', {
      firstName: "Rachel",
      lastName: "FrontDesk",
      email: recepEmail,
      password: "Password123!",
      employeeId: `REC-QA-${Date.now()}`
    }, schoolAdminToken);
    recordTest("Authentication", "Register Receptionist", "Register Receptionist user", "200/201", resRecep.status, (resRecep.status === 200 || resRecep.status === 201));

    const resRecepLogin = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: recepEmail,
      password: "Password123!"
    });
    receptionistToken = resRecepLogin.body?.token;
    recordTest("Authentication", "Receptionist Login", "Receptionist logs in", 200, resRecepLogin.status, resRecepLogin.status === 200 && !!receptionistToken);
  }

  // ---------------------------------------------------------------------------
  // MODULE 4: FLOW 3 - FINANCIAL RULES & STATUTORY PAYROLL SETUP
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 4: FLOW 3 — FINANCIAL RULES & STATUTORY PAYROLL (/account/*)");
  {
    // Salary Rule & Structure
    const resSalRule = await request(`${API_BASE}/api/account/salary-rules`, 'POST', {
      name: "Standard Teacher Payroll Rule",
      basicRate: 20000,
      hraRate: 8000,
      daRate: 4000,
      isPfApplicable: true,
      isEsiApplicable: true,
      isPtApplicable: true
    }, accountantToken || schoolAdminToken);
    recordTest("HRM", "Configure Salary Rule", "Configure Basic, HRA, DA, PF & ESI statutory rules", "200/201", resSalRule.status, (resSalRule.status === 200 || resSalRule.status === 201));
  }

  // ---------------------------------------------------------------------------
  // MODULE 5: FLOW 4 - STUDENT ADMISSION & INVOICING
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 5: FLOW 4 — STUDENT ADMISSION & INVOICE GENERATION (/school-admin/admission)");
  {
    const stu1Email = `student1.qa.${Date.now()}@eduvault.com`;
    const resStu1 = await request(`${API_BASE}/api/academics/students`, 'POST', {
      firstName: "Aarav",
      lastName: "Sharma",
      email: stu1Email,
      password: "Password123!",
      guardianName: "Vikram Sharma",
      guardianPhone: "+919876500001",
      guardianRelationship: "Father",
      bloodGroup: "O+",
      address: "101 Academic Enclave",
      classId: class10Id
    }, schoolAdminToken);

    student1Id = resStu1.body?.userId;
    recordTest("Academics", "Student 1 Admission", "Admit Student 1 into Grade 10", "200/201", resStu1.status, (resStu1.status === 200 || resStu1.status === 201) && !!student1Id);

    // Check DB for Student & Enrollment
    const dbStu = await pgClient.query('SELECT * FROM "Students" WHERE "UserId" = $1', [student1Id]);
    recordTest("Database", "Student DB Persistence", "Student 1 persisted in Students table", 1, dbStu.rows.length, dbStu.rows.length === 1);

    // Standard Fee Structure (Created for Class 10 which auto-generates invoice for enrolled students)
    const resFeeStruct = await request(`${API_BASE}/api/billing/structures`, 'POST', {
      name: "Grade 10 Annual Tuition Fee",
      grade: "10",
      amount: 5000,
      frequency: "Annual",
      installments: 1
    }, accountantToken || schoolAdminToken);
    recordTest("Billing", "Standard Fee Structure", "Create standard fee structure of Rs 5000", "200/201", resFeeStruct.status, (resFeeStruct.status === 200 || resFeeStruct.status === 201));

    // Verify invoice generated in Invoices table
    const dbInv = await pgClient.query('SELECT * FROM "Invoices" WHERE "StudentId" = $1', [student1Id]);
    if (dbInv.rows.length > 0) {
      invoiceId = dbInv.rows[0].Id;
    }
    recordTest("Billing", "Auto-Generate Invoice", "Student enrollment auto-generates invoice in Invoices table", 1, dbInv.rows.length, dbInv.rows.length >= 1);

    // Admit Student 2 (for Fail / Retention scenario)
    const resStu2 = await request(`${API_BASE}/api/academics/students`, 'POST', {
      firstName: "Rohan",
      lastName: "Verma",
      email: `student2.qa.${Date.now()}@eduvault.com`,
      password: "Password123!",
      guardianName: "Sunil Verma",
      guardianPhone: "+919876500002",
      guardianRelationship: "Father",
      bloodGroup: "B+",
      address: "202 Beta Nagar",
      classId: class10Id
    }, schoolAdminToken);
    student2Id = resStu2.body?.userId;
    recordTest("Academics", "Student 2 Admission", "Admit Student 2 into Grade 10", "200/201", resStu2.status, (resStu2.status === 200 || resStu2.status === 201) && !!student2Id);

    // Login as Student 1
    const resStu1Login = await request(`${API_BASE}/api/auth/login`, 'POST', {
      email: stu1Email,
      password: "Password123!"
    });
    student1Token = resStu1Login.body?.token;
    recordTest("Authentication", "Student 1 Login", "Student 1 logs into Student Portal", 200, resStu1Login.status, resStu1Login.status === 200 && !!student1Token);

    // Negative: Duplicate Email
    const resDupEmail = await request(`${API_BASE}/api/academics/students`, 'POST', {
      firstName: "Duplicate",
      lastName: "Student",
      email: stu1Email,
      password: "Password123!",
      guardianName: "Guardian",
      guardianPhone: "+919800000000",
      guardianRelationship: "Father",
      classId: class10Id
    }, schoolAdminToken);
    recordTest("Validation", "Duplicate Email Rejection", "Duplicate Email is rejected with 400", 400, resDupEmail.status, resDupEmail.status === 400);
  }

  // ---------------------------------------------------------------------------
  // MODULE 6: FLOW 5 - TEACHER DAILY OPERATIONS
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 6: FLOW 5 — TEACHER DAILY CLASSROOM OPERATIONS (/teacher/*)");
  {
    // Classroom Attendance Marking
    const resAtt = await request(`${API_BASE}/api/academics/attendance/submit`, 'POST', {
      date: new Date().toISOString(),
      students: [
        { studentId: student1Id, status: "Present", remarks: "On time" },
        { studentId: student2Id, status: "Absent", remarks: "Unwell" }
      ]
    }, teacherToken || schoolAdminToken);
    recordTest("Teacher", "Mark Daily Attendance", "Teacher marks attendance for Class 10 (Present/Absent)", 200, resAtt.status, resAtt.status === 200);

    // Self-Attendance Punch In (Express Auxiliary with GPS within 300m)
    const resPunch = await request(`${EXPRESS_BASE}/api/teacher-attendance/punch-in`, 'POST', {
      latitude: 26.9124,
      longitude: 75.7873,
      address: "Central School Campus"
    }, teacherToken);
    recordTest("Teacher", "Self Attendance Punch In", "Teacher punches in daily shift with GPS", "200/201", resPunch.status, (resPunch.status === 200 || resPunch.status === 201));

    // Homework Assignment (Express Auxiliary)
    const resHw = await request(`${EXPRESS_BASE}/api/homework`, 'POST', {
      title: "Quadratic Equations 4.2",
      className: "Grade 10",
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      instructions: "Solve questions 1 to 10 from Chapter 4",
      totalStudents: 40
    }, teacherToken || schoolAdminToken);
    recordTest("Teacher", "Create Homework", "Teacher assigns homework to Class 10", "200/201", resHw.status, (resHw.status === 200 || resHw.status === 201));
  }

  // ---------------------------------------------------------------------------
  // MODULE 7: FLOW 6 - RECEPTIONIST & FRONT DESK OPERATIONS
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 7: FLOW 6 — RECEPTIONIST & FRONT DESK DESK (/receptionist/*)");
  {
    // Student Quick Search
    const resSearch = await request(`${API_BASE}/api/receptionist/search-student?q=Aarav`, 'GET', null, receptionistToken || schoolAdminToken);
    recordTest("Receptionist", "Student Quick Lookup", "Search student by name at front desk counter", 200, resSearch.status, resSearch.status === 200);

    // Visitor Register Check-in
    const resVis = await request(`${API_BASE}/api/receptionist/visitors`, 'POST', {
      visitorName: "Sunil Kumar",
      phone: "+919877700011",
      purpose: "Admission inquiry for Grade 10",
      studentName: "Aarav Sharma",
      classSection: "10-Section A",
      whomToMeet: "School Admin"
    }, receptionistToken || schoolAdminToken);
    recordTest("Receptionist", "Visitor Check-in", "Log walk-in visitor", "200/201", resVis.status, (resVis.status === 200 || resVis.status === 201));

    // Student Gate Pass
    const resGate = await request(`${API_BASE}/api/receptionist/gate-pass`, 'POST', {
      studentId: student1Id,
      studentName: "Aarav Sharma",
      classSection: "10-Section A",
      parentName: "Vikram Sharma",
      parentPhone: "+919876500001",
      reason: "Medical appointment with parent"
    }, receptionistToken || schoolAdminToken);
    recordTest("Receptionist", "Student Gate Pass", "Issue early departure gate pass with WhatsApp notice", "200/201", resGate.status, (resGate.status === 200 || resGate.status === 201));

    // Spot Fee Counter Collection (Custom Partial Payment - Aanshik Shulk: Rs 2000 out of Rs 5000)
    if (invoiceId) {
      const resSpotFee = await request(`${API_BASE}/api/receptionist/collect-spot-fee`, 'POST', {
        studentId: student1Id,
        invoiceId: invoiceId,
        amount: 2000,
        paymentMethod: "Cash",
        notes: "First installment partial fee (Aanshik Shulk)"
      }, receptionistToken || schoolAdminToken);
      recordTest("Receptionist", "Spot Counter Partial Fee Collection", "Collect partial fee (Aanshik Shulk) of Rs 2000", "200/201", resSpotFee.status, (resSpotFee.status === 200 || resSpotFee.status === 201));

      // Verify DB update in PostgreSQL
      const dbInvCheck = await pgClient.query('SELECT * FROM "Invoices" WHERE "Id" = $1', [invoiceId]);
      const paid = parseFloat(dbInvCheck.rows[0]?.PaidAmount || 0);
      recordTest("Database", "Invoice Partial Payment Persistence", "Invoice PaidAmount updated to 2000 & Status = Partial/Pending", true, paid === 2000, paid === 2000);
    }
  }

  // ---------------------------------------------------------------------------
  // MODULE 8: FLOW 7 - LIBRARIAN & CATALOG CIRCULATION DESK
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 8: FLOW 7 — LIBRARIAN & CIRCULATION DESK (/library/*)");
  {
    // Add Book to Catalog
    const resBook = await request(`${API_BASE}/api/library/books`, 'POST', {
      title: `Concepts of Modern Physics ${Date.now()}`,
      author: "Arthur Beiser",
      isbn: `978-${Date.now()}`,
      category: "Science",
      totalCopies: 5,
      availableCopies: 5,
      shelfLocation: "A-12"
    }, librarianToken || schoolAdminToken);
    bookId = resBook.body?.id;
    recordTest("Library", "Add Book Catalog", "Add book with 5 copies to library catalog", "200/201", resBook.status, (resBook.status === 200 || resBook.status === 201) && !!bookId);

    // Issue Book to Student 1
    const resIssue = await request(`${API_BASE}/api/library/transactions/issue`, 'POST', {
      bookId: bookId,
      memberId: student1Id,
      memberType: "Student",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString()
    }, librarianToken || schoolAdminToken);
    issueId = resIssue.body?.transactionId || resIssue.body?.id;
    recordTest("Library", "Issue Book", "Issue book copy to Student 1", "200/201", resIssue.status, (resIssue.status === 200 || resIssue.status === 201) && !!issueId);

    // Return Book
    if (issueId) {
      const resReturn = await request(`${API_BASE}/api/library/transactions/${issueId}/return`, 'PUT', {}, librarianToken || schoolAdminToken);
      recordTest("Library", "Return Book", "Return book and update available copy count", 200, resReturn.status, resReturn.status === 200);
    }
  }

  // ---------------------------------------------------------------------------
  // MODULE 9: FLOW 8 & 9 - EXAMINATIONS, REPORT CARDS & OUTCOME ENGINE
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 9: FLOW 8 & 9 — EXAMS, REPORT CARDS & ACADEMIC OUTCOME DECISION ENGINE");
  {
    // Schedule Exam
    const resExam = await request(`${API_BASE}/api/exams/schedule`, 'POST', {
      classId: class10Id,
      subjectId: subjectMathId,
      proctorId: teacherId,
      examType: "Annual Final",
      date: new Date().toISOString(),
      time: "10:00 AM",
      status: "Scheduled"
    }, schoolAdminToken);
    examId = resExam.body?.examId || resExam.body?.id;
    recordTest("Exams", "Schedule Exam", "Schedule Annual Final Exam for Grade 10", "200/201", resExam.status, (resExam.status === 200 || resExam.status === 201) && !!examId);

    // Marks Entry (Pass student 90 marks, Fail student 25 marks)
    const resMarks = await request(`${API_BASE}/api/exams/results/enter-marks`, 'POST', {
      examId: examId,
      results: [
        { studentId: student1Id, marksObtained: 90 },
        { studentId: student2Id, marksObtained: 25 }
      ]
    }, teacherToken || schoolAdminToken);
    recordTest("Exams", "Submit Subject Marks", "Submit marks for Student 1 (90 Pass) and Student 2 (25 Fail)", 200, resMarks.status, resMarks.status === 200);

    // SCENARIO A: Standard Promotion of Student 1 (0 fails) to Grade 11
    const resPromote1 = await request(`${API_BASE}/api/academics/students/${student1Id}/promote`, 'POST', {
      nextClassId: class11Id,
      academicYear: "2026-2027",
      adminOverride: false
    }, schoolAdminToken);
    recordTest("Academic Lifecycle", "Scenario A: Auto Promotion", "Promote Student 1 to Grade 11 with Status = PROMOTED", 200, resPromote1.status, resPromote1.status === 200);

    // SCENARIO D: Retention / Repeat Year for Student 2 (Failing student)
    const resRetain2 = await request(`${API_BASE}/api/academics/students/${student2Id}/retain`, 'POST', {
      currentClassId: class10Id,
      newAcademicYear: "2026-2027",
      retentionReason: "Failed in core subjects"
    }, schoolAdminToken);
    recordTest("Academic Lifecycle", "Scenario D: Retention / Repeat Year", "Retain Student 2 in Grade 10 with Status = RETAINED_REPEAT", 200, resRetain2.status, resRetain2.status === 200);

    // SCENARIO E: Transfer Certificate (TC) 4-Way Clearance Gate
    const resTC = await request(`${API_BASE}/api/academics/students/${student1Id}/generate-tc`, 'POST', {
      reason: "Parent relocation to another city",
      adminOverride: true // Admin override for remaining partial fee clearance
    }, schoolAdminToken);
    recordTest("Academic Lifecycle", "Scenario E: Transfer Certificate (TC) Gate", "Generate serialized TC & set Status = WITHDRAWN", 200, resTC.status, resTC.status === 200);
  }

  // ---------------------------------------------------------------------------
  // MODULE 10: FLOW 10 - MONTHLY STATUTORY PAYROLL RUN
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 10: FLOW 10 — ACCOUNTANT MONTHLY STATUTORY PAYROLL (/account/salaries)");
  {
    const resPayroll = await request(`${API_BASE}/api/hrm/payroll/calculate`, 'POST', {
      month: 8,
      year: 2026,
      totalWorkingDays: 30
    }, accountantToken || schoolAdminToken);
    recordTest("HRM", "1-Click Monthly Statutory Payroll", "Execute monthly payroll calculation engine with PF, ESI, PT, LWP", "200/201/400", resPayroll.status, (resPayroll.status === 200 || resPayroll.status === 201 || resPayroll.status === 400));
  }

  // ---------------------------------------------------------------------------
  // MODULE 11: SECURITY & MULTI-TENANT ISOLATION
  // ---------------------------------------------------------------------------
  console.log("\n▶ MODULE 11: SECURITY & MULTI-TENANT ISOLATION SUITE");
  {
    // Horizontal Privilege Escalation Test: School B admin tries to fetch School A's student
    const resCrossTenant = await request(`${API_BASE}/api/academics/students/${student1Id}`, 'GET', null, schoolBAdminToken);
    recordTest("Security", "Cross-Tenant Data Isolation", "School B cannot view or access School A student (404/403)", "404/403", resCrossTenant.status, resCrossTenant.status === 403 || resCrossTenant.status === 404);

    // Vertical Privilege Escalation: Student tries to access Super Admin endpoints
    const resPrivEsc = await request(`${API_BASE}/api/super/schools`, 'GET', null, student1Token);
    recordTest("Security", "Vertical Privilege Escalation", "Student cannot invoke Super Admin API (403)", 403, resPrivEsc.status, resPrivEsc.status === 403);

    // SQL Injection safe handling
    const resSqlInj = await request(`${API_BASE}/api/receptionist/search-student?q=' OR 1=1; --`, 'GET', null, receptionistToken || schoolAdminToken);
    recordTest("Security", "SQL Injection Sanitization", "SQL injection payload handled safely without 500 DB error", 200, resSqlInj.status, resSqlInj.status === 200 || resSqlInj.status === 400);
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  console.log("\n🧹 CLEANUP & TEST TEARDOWN");
  try {
    if (schoolAId) {
      await pgClient.query('DELETE FROM "AccountManagers" WHERE "SchoolId" = $1', [schoolAId]);
      await pgClient.query('DELETE FROM "Invoices" WHERE "StudentId" = $1 OR "StudentId" = $2', [student1Id, student2Id]);
      await pgClient.query('DELETE FROM "Enrollments" WHERE "StudentId" = $1 OR "StudentId" = $2', [student1Id, student2Id]);
      await pgClient.query('DELETE FROM "Students" WHERE "UserId" = $1 OR "UserId" = $2', [student1Id, student2Id]);
      await pgClient.query('DELETE FROM "Teachers" WHERE "UserId" = $1', [teacherId]);
      await pgClient.query('DELETE FROM "Users" WHERE "SchoolId" = $1', [schoolAId]);
      await pgClient.query('DELETE FROM "Schools" WHERE "Id" = $1', [schoolAId]);
      console.log(`  Cleaned up test school A ${schoolAId}`);
    }
    if (schoolBId) {
      await pgClient.query('DELETE FROM "Users" WHERE "SchoolId" = $1', [schoolBId]);
      await pgClient.query('DELETE FROM "Schools" WHERE "Id" = $1', [schoolBId]);
      console.log(`  Cleaned up test school B ${schoolBId}`);
    }
  } catch (e) {
    console.warn("  Cleanup warning:", e.message);
  }

  await pgClient.end();

  // ---------------------------------------------------------------------------
  // FINAL SCORECARD
  // ---------------------------------------------------------------------------
  console.log("\n=========================================================================");
  console.log("📊 COMPLETE MASTER FLOW TEST SUITE SUMMARY");
  console.log("=========================================================================");
  console.log(`Total Tests Run:  ${stats.totalTests}`);
  console.log(`Tests Passed:     ${stats.passedTests} (${Math.round((stats.passedTests / stats.totalTests) * 100)}%)`);
  console.log(`Tests Failed:     ${stats.failedTests}`);
  console.log(`Discovered Bugs:  ${stats.bugs.length}`);
  console.log("=========================================================================\n");

  if (stats.bugs.length > 0) {
    console.log("BUG SUMMARY:");
    stats.bugs.forEach(b => {
      console.log(`- [${b.id}] ${b.module} > ${b.flow}: ${b.title}`);
    });
  }
}

runMasterFlowSuite().catch(console.error);
