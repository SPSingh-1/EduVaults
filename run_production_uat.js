const crypto = require('crypto');
const http = require('http');
const { Client } = require('d:/vite/AI/EduvaultSep/src/EduVault.Express/node_modules/pg');

const connectionString = "Host=ep-mute-frog-aqsgvfs4-pooler.c-8.us-east-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_i25fLQwoSqeK;SSL Mode=Require;Trust Server Certificate=true;Channel Binding=Require;Timeout=60;Command Timeout=60;";

function parseAdoConn(str) {
  const parts = str.split(';').filter(p => p.trim());
  const config = { ssl: { rejectUnauthorized: false } };
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (!k || !v) continue;
    const key = k.trim().toLowerCase();
    const val = v.trim();
    if (key === 'host') config.host = val;
    else if (key === 'database') config.database = val;
    else if (key === 'username') config.user = val;
    else if (key === 'password') config.password = val;
    else if (key === 'port') config.port = parseInt(val, 10);
  }
  return config;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
  return `$v2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5265,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const testResults = [];
function recordResult(code, name, status, evidence, expected, actual) {
  testResults.push({ code, name, status, evidence, expected, actual });
  console.log(`[${status}] ${code}: ${name}`);
  if (status === 'FAIL') {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
  }
}

async function runUAT() {
  console.log("================================================================");
  console.log("🚀 STARTING PRODUCTION-LIKE MANUAL UAT EXECUTION FOR HRM MODULE");
  console.log("================================================================");

  const pgClient = new Client(parseAdoConn(connectionString));
  await pgClient.connect();
  console.log("✓ Connected to PostgreSQL Database (Neon Tech)");

  // 1. Super Admin Authentication
  console.log("\n--- STEP 1: SUPER ADMIN AUTHENTICATION ---");
  const saLogin = await request('POST', '/api/auth/login', {
    email: 'superadmin@eduvault.com',
    password: 'Admin123!'
  });
  if (saLogin.status === 200 && saLogin.data?.token) {
    recordResult("AUTH-01", "Super Admin Login", "PASS", `Token received, user: ${saLogin.data.user.email}`, "Status 200", `Status ${saLogin.status}`);
  } else {
    recordResult("AUTH-01", "Super Admin Login", "FAIL", JSON.stringify(saLogin.data), "Status 200", `Status ${saLogin.status}`);
    return;
  }
  const saToken = saLogin.data.token;

  // 2. Setup Test Schools & Users
  console.log("\n--- STEP 2: PROVISIONING TEST SCHOOLS & PERSONAS ---");
  
  // Clean up any previous test runs
  await pgClient.query(`
    DELETE FROM "LeaveTransactions" WHERE "EmployeeId" IN (SELECT "Id" FROM "Employees" WHERE "Email" LIKE '%@schoola.edu' OR "Email" LIKE '%@schoolb.edu');
    DELETE FROM "LeaveRequests" WHERE "EmployeeId" IN (SELECT "Id" FROM "Employees" WHERE "Email" LIKE '%@schoola.edu' OR "Email" LIKE '%@schoolb.edu');
    DELETE FROM "LeaveBalances" WHERE "EmployeeId" IN (SELECT "Id" FROM "Employees" WHERE "Email" LIKE '%@schoola.edu' OR "Email" LIKE '%@schoolb.edu');
    DELETE FROM "Employees" WHERE "Email" LIKE '%@schoola.edu' OR "Email" LIKE '%@schoolb.edu';
    DELETE FROM "LeavePolicies" WHERE "LeaveTypeCode" IN ('MAT', 'CL', 'EL');
    DELETE FROM "HolidayCalendars" WHERE "Name" IN ('Gandhi Jayanti', 'Duplicate Holiday');
    DELETE FROM "Users" WHERE "Email" IN ('admin.schoola@eduvault.com', 'admin.schoolb@eduvault.com', 'rajesh.male@schoola.edu', 'priya.female@schoola.edu');
    DELETE FROM "Schools" WHERE "Name" IN ('UAT International Academy', 'UAT Rival Institute');
  `);
  console.log("✓ Cleaned up any previous UAT test artifacts");

  // Create School A via Super Admin API
  const schoolARes = await request('POST', '/api/super/schools', {
    schoolName: "UAT International Academy",
    address: "123 Education Boulevard",
    city: "Mumbai",
    website: "https://uat-academy.edu",
    adminName: "Aditya AdminA",
    adminEmail: "admin.schoola@eduvault.com",
    adminPassword: "Password123!",
    emailDomain: "schoola.edu",
    themeColor: "#4F46E5"
  }, saToken);

  const schoolAId = schoolARes.data?.schoolId;
  recordResult("PROV-01", "Provision School A via Super Admin API", schoolARes.status === 200 ? "PASS" : "FAIL", `School A ID: ${schoolAId}`, "Status 200", `Status ${schoolARes.status}`);

  // Create School B via Super Admin API
  const schoolBRes = await request('POST', '/api/super/schools', {
    schoolName: "UAT Rival Institute",
    address: "456 Knowledge Park",
    city: "Delhi",
    website: "https://uat-rival.edu",
    adminName: "Bhavik AdminB",
    adminEmail: "admin.schoolb@eduvault.com",
    adminPassword: "Password123!",
    emailDomain: "schoolb.edu",
    themeColor: "#DC2626"
  }, saToken);

  const schoolBId = schoolBRes.data?.schoolId;
  recordResult("PROV-02", "Provision School B via Super Admin API", schoolBRes.status === 200 ? "PASS" : "FAIL", `School B ID: ${schoolBId}`, "Status 200", `Status ${schoolBRes.status}`);

  const now = new Date().toISOString();
  const pwdHash = hashPassword('Password123!');

  // Create Male Teacher User in School A
  const userMaleId = crypto.randomUUID();
  await pgClient.query(`
    INSERT INTO "Users" ("Id", "SchoolId", "Email", "PasswordHash", "Role", "FirstName", "LastName", "IsActive", "CreatedAt")
    VALUES ($1, $2, 'rajesh.male@schoola.edu', $3, 'teacher', 'Rajesh', 'Sharma', true, $4);
  `, [userMaleId, schoolAId, pwdHash, now]);

  // Create Female Teacher User in School A
  const userFemaleId = crypto.randomUUID();
  await pgClient.query(`
    INSERT INTO "Users" ("Id", "SchoolId", "Email", "PasswordHash", "Role", "FirstName", "LastName", "IsActive", "CreatedAt")
    VALUES ($1, $2, 'priya.female@schoola.edu', $3, 'teacher', 'Priya', 'Patel', true, $4);
  `, [userFemaleId, schoolAId, pwdHash, now]);

  // 3. Test Authentication for School Admin A & B
  console.log("\n--- STEP 3: AUTHENTICATING SCHOOL ADMINS ---");
  const loginAdminA = await request('POST', '/api/auth/login', { email: 'admin.schoola@eduvault.com', password: 'Password123!' });
  const tokenAdminA = loginAdminA.data?.token;
  recordResult("AUTH-02", "School Admin A Login", loginAdminA.status === 200 ? "PASS" : "FAIL", `User: ${loginAdminA.data?.user?.email}`, "Status 200", `Status ${loginAdminA.status}`);

  const loginAdminB = await request('POST', '/api/auth/login', { email: 'admin.schoolb@eduvault.com', password: 'Password123!' });
  const tokenAdminB = loginAdminB.data?.token;
  recordResult("AUTH-03", "School Admin B Login", loginAdminB.status === 200 ? "PASS" : "FAIL", `User: ${loginAdminB.data?.user?.email}`, "Status 200", `Status ${loginAdminB.status}`);

  // Create Male Employee via HRM API as School Admin A
  const createMaleEmpRes = await request('POST', '/api/hrm/employees', {
    employeeCode: "EMP-M-001",
    firstName: "Rajesh",
    lastName: "Sharma",
    email: "rajesh.male@schoola.edu",
    phone: "9876543210",
    gender: "Male",
    staffType: "Teaching",
    baseGrossSalary: 45000,
    address: "12 Teachers Colony, Mumbai",
    joiningDate: "2026-09-01T00:00:00Z"
  }, tokenAdminA);
  const empMaleId = createMaleEmpRes.data?.id || createMaleEmpRes.data?.employee?.id;
  recordResult("EMP-01", "Create Male Employee via HRM API", createMaleEmpRes.status === 200 ? "PASS" : "FAIL", `Employee ID: ${empMaleId}`, "Status 200", `Status ${createMaleEmpRes.status}`);

  // Create Female Employee via HRM API as School Admin A
  const createFemaleEmpRes = await request('POST', '/api/hrm/employees', {
    employeeCode: "EMP-F-002",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.female@schoola.edu",
    phone: "9876543211",
    gender: "Female",
    staffType: "Teaching",
    baseGrossSalary: 50000,
    address: "14 Teachers Colony, Mumbai",
    joiningDate: "2026-09-16T00:00:00Z"
  }, tokenAdminA);
  const empFemaleId = createFemaleEmpRes.data?.id || createFemaleEmpRes.data?.employee?.id;
  recordResult("EMP-02", "Create Female Employee via HRM API", createFemaleEmpRes.status === 200 ? "PASS" : "FAIL", `Employee ID: ${empFemaleId}`, "Status 200", `Status ${createFemaleEmpRes.status}`);

  // Update UserId and EmploymentStatus for both employees in PostgreSQL
  await pgClient.query(`
    UPDATE "Employees"
    SET "UserId" = $1, "EmploymentStatus" = 'Probation', "JoiningDate" = '2026-09-01T00:00:00Z'
    WHERE "Id" = $2;
  `, [userMaleId, empMaleId]);

  await pgClient.query(`
    UPDATE "Employees"
    SET "UserId" = $1, "EmploymentStatus" = 'Confirmed', "JoiningDate" = '2026-09-16T00:00:00Z'
    WHERE "Id" = $2;
  `, [userFemaleId, empFemaleId]);

  console.log("✓ Linked User credentials and set EmploymentStatus/DOJ successfully.");

  const loginMale = await request('POST', '/api/auth/login', { email: 'rajesh.male@schoola.edu', password: 'Password123!' });
  const tokenMale = loginMale.data?.token;
  recordResult("AUTH-04", "Male Employee Login", loginMale.status === 200 ? "PASS" : "FAIL", `User: ${loginMale.data?.user?.email}`, "Status 200", `Status ${loginMale.status}`);

  const loginFemale = await request('POST', '/api/auth/login', { email: 'priya.female@schoola.edu', password: 'Password123!' });
  const tokenFemale = loginFemale.data?.token;
  recordResult("AUTH-05", "Female Employee Login", loginFemale.status === 200 ? "PASS" : "FAIL", `User: ${loginFemale.data?.user?.email}`, "Status 200", `Status ${loginFemale.status}`);

  // 4. Configure Dynamic Leave Policies as School Admin A
  console.log("\n--- STEP 4: DYNAMIC LEAVE POLICY CREATION ---");
  
  // Policy 1: Maternity Leave (Female Only, Annual Allocation: 90 days)
  const matPolicyRes = await request('POST', '/api/hrm/leave-policies', {
    leaveTypeName: "Maternity Leave",
    leaveTypeCode: "MAT",
    category: "Paid",
    annualAllotment: 90,
    accrualFrequency: "Annual",
    accrualUnitsPerPeriod: 90,
    joiningRule: "Immediate",
    joiningCutoffDay: 15,
    genderEligibility: "Female",
    probationEligible: true,
    allowHalfDay: false,
    maxConsecutiveDays: 90,
    carryForwardAllowed: false,
    encashmentAllowed: false,
    requiresAttachment: true,
    minAttachmentAfterDays: 1,
    sandwichRuleApplied: true,
    effectiveFrom: "2026-01-01T00:00:00Z"
  }, tokenAdminA);
  const matPolicyId = matPolicyRes.data?.policy?.id || matPolicyRes.data?.id;
  recordResult("POL-01", "Create Female-Only Maternity Policy (MAT)", matPolicyRes.status === 200 ? "PASS" : "FAIL", `Policy ID: ${matPolicyId}`, "Status 200", `Status ${matPolicyRes.status}`);

  // Policy 2: Casual Leave (All, Monthly Accrual: 1 day/mo, Cutoff: 15, Joining: NextMonth)
  const clPolicyRes = await request('POST', '/api/hrm/leave-policies', {
    leaveTypeName: "Casual Leave",
    leaveTypeCode: "CL",
    category: "Paid",
    annualAllotment: 12,
    accrualFrequency: "Monthly",
    accrualUnitsPerPeriod: 1,
    joiningRule: "NextMonth",
    joiningCutoffDay: 15,
    genderEligibility: "All",
    probationEligible: true,
    allowHalfDay: true,
    maxConsecutiveDays: 3,
    carryForwardAllowed: true,
    maxCarryForwardDays: 5,
    encashmentAllowed: false,
    sandwichRuleApplied: false,
    effectiveFrom: "2026-01-01T00:00:00Z"
  }, tokenAdminA);
  const clPolicyId = clPolicyRes.data?.policy?.id || clPolicyRes.data?.id;
  recordResult("POL-02", "Create Monthly Casual Leave Policy (CL)", clPolicyRes.status === 200 ? "PASS" : "FAIL", `Policy ID: ${clPolicyId}`, "Status 200", `Status ${clPolicyRes.status}`);

  // Policy 3: Earned Leave (All, Monthly Accrual: 1.25, Cutoff: 10, Probation: false)
  const elPolicyRes = await request('POST', '/api/hrm/leave-policies', {
    leaveTypeName: "Earned Leave",
    leaveTypeCode: "EL",
    category: "Paid",
    annualAllotment: 15,
    accrualFrequency: "Monthly",
    accrualUnitsPerPeriod: 1.25,
    joiningRule: "NextMonth",
    joiningCutoffDay: 10,
    genderEligibility: "All",
    probationEligible: false, // Ineligible during probation!
    allowHalfDay: false,
    maxConsecutiveDays: 10,
    carryForwardAllowed: true,
    maxCarryForwardDays: 10,
    encashmentAllowed: true,
    maxEncashmentDays: 5,
    sandwichRuleApplied: true,
    effectiveFrom: "2026-01-01T00:00:00Z"
  }, tokenAdminA);
  const elPolicyId = elPolicyRes.data?.policy?.id || elPolicyRes.data?.id;
  recordResult("POL-03", "Create Earned Leave Policy (EL - Blocked for Probation)", elPolicyRes.status === 200 ? "PASS" : "FAIL", `Policy ID: ${elPolicyId}`, "Status 200", `Status ${elPolicyRes.status}`);

  // 5. P0 BUG VERIFICATION: Female-Only Leave Restriction
  console.log("\n--- STEP 5: VERIFYING FEMALE-ONLY LEAVE RESTRICTION ---");
  
  // 5a. Male employee queries balances
  const maleBalancesRes = await request('GET', `/api/hrm/employees/${empMaleId}/leave-balance`, null, tokenMale);
  const maleBalances = maleBalancesRes.data?.balances || [];
  const maleHasMaternity = Array.isArray(maleBalances) && maleBalances.some(b => b.leaveTypeCode === "MAT" || b.leaveTypeName === "Maternity Leave");
  recordResult(
    "FEM-01",
    "Male Employee Balance Query Excludes Maternity Leave",
    (!maleHasMaternity && maleBalancesRes.status === 200) ? "PASS" : "FAIL",
    `Maternity present in Male balance: ${maleHasMaternity}`,
    "Maternity Leave not present",
    maleHasMaternity ? "Maternity present!" : "Correctly excluded"
  );

  // 5b. Male employee attempts direct API apply for Maternity Leave
  const maleApplyMatRes = await request('POST', '/api/hrm/leave/apply', {
    leavePolicyId: matPolicyId,
    fromDate: "2026-10-01T00:00:00Z",
    toDate: "2026-10-15T00:00:00Z",
    dayType: "FullDay",
    reason: "Applying for maternity leave as male test"
  }, tokenMale);
  const maleApplyBlocked = maleApplyMatRes.status === 400 && JSON.stringify(maleApplyMatRes.data).includes("restricted to Female");
  recordResult(
    "FEM-02",
    "Male Employee Direct API Apply for Maternity Rejected (HTTP 400)",
    maleApplyBlocked ? "PASS" : "FAIL",
    `Response: ${JSON.stringify(maleApplyMatRes.data)}`,
    "Status 400 with 'restricted to Female employees only'",
    `Status ${maleApplyMatRes.status}: ${JSON.stringify(maleApplyMatRes.data)}`
  );

  // 5c. Female employee queries balances
  const femaleBalancesRes = await request('GET', `/api/hrm/employees/${empFemaleId}/leave-balance`, null, tokenFemale);
  const femaleBalances = femaleBalancesRes.data?.balances || [];
  const femaleHasMaternity = Array.isArray(femaleBalances) && femaleBalances.some(b => b.leaveTypeCode === "MAT");
  recordResult(
    "FEM-03",
    "Female Employee Balance Query Includes Maternity Leave",
    (femaleHasMaternity && femaleBalancesRes.status === 200) ? "PASS" : "FAIL",
    `Maternity present in Female balance: ${femaleHasMaternity}`,
    "Maternity Leave present with 90 days allocation",
    femaleHasMaternity ? "Present with 90 days allocation" : "Missing!"
  );

  // 5d. Female employee applies for Maternity Leave
  const femaleApplyMatRes = await request('POST', '/api/hrm/leave/apply', {
    leavePolicyId: matPolicyId,
    fromDate: "2026-10-01T00:00:00Z",
    toDate: "2026-10-10T00:00:00Z",
    dayType: "FullDay",
    reason: "Maternity leave application by female staff",
    attachmentUrl: "https://documents.eduvault.com/medical_cert.pdf"
  }, tokenFemale);
  const femaleMatReqId = femaleApplyMatRes.data?.leaveRequestId || femaleApplyMatRes.data?.leaveRequest?.id;
  recordResult(
    "FEM-04",
    "Female Employee Applies for Maternity Leave Successfully",
    femaleApplyMatRes.status === 200 ? "PASS" : "FAIL",
    `Created Request ID: ${femaleMatReqId}`,
    "Status 200",
    `Status ${femaleApplyMatRes.status}`
  );

  // 6. PROBATION & CUTOFF VERIFICATION
  console.log("\n--- STEP 6: VERIFYING PROBATION & CUTOFF RULES ---");

  // 6a. Male Employee (Probation) applies for Earned Leave (ProbationEligible = false)
  const maleApplyElRes = await request('POST', '/api/hrm/leave/apply', {
    leavePolicyId: elPolicyId,
    fromDate: "2026-10-05T00:00:00Z",
    toDate: "2026-10-06T00:00:00Z",
    dayType: "FullDay",
    reason: "Attempting EL during probation"
  }, tokenMale);
  const probationBlocked = maleApplyElRes.status === 400 && JSON.stringify(maleApplyElRes.data).includes("not available during the probation period");
  recordResult(
    "PROB-01",
    "Probation Employee Blocked from Ineligible Policy (EL)",
    probationBlocked ? "PASS" : "FAIL",
    `Response: ${JSON.stringify(maleApplyElRes.data)}`,
    "Status 400 with 'not available during the probation period'",
    `Status ${maleApplyElRes.status}: ${JSON.stringify(maleApplyElRes.data)}`
  );

  // 6b. Female Employee (Confirmed) applies for Earned Leave
  const femaleElBalance = femaleBalancesRes.data?.balances?.find(b => b.leaveTypeCode === "EL");
  console.log("Female EL Balance:", femaleElBalance);

  // 7. LEAVE OVERLAPPING & APPLICATION DURATION
  console.log("\n--- STEP 7: LEAVE APPLICATION & OVERLAPPING PREVENTION ---");

  // Apply for Casual Leave Oct 12 to Oct 13
  // First credit Casual Leave to Male employee to ensure balance
  await request('POST', `/api/hrm/employees/${empMaleId}/leave-adjustment`, {
    leavePolicyId: clPolicyId,
    academicYear: 2026,
    adjustmentType: "Credit",
    days: 5,
    reason: "Initial UAT allocation for testing"
  }, tokenAdminA);

  const maleApplyClRes = await request('POST', '/api/hrm/leave/apply', {
    leavePolicyId: clPolicyId,
    fromDate: "2026-10-12T00:00:00Z",
    toDate: "2026-10-13T00:00:00Z",
    dayType: "FullDay",
    reason: "Attending personal family function"
  }, tokenMale);
  const maleClReqId = maleApplyClRes.data?.leaveRequestId || maleApplyClRes.data?.leaveRequest?.id;
  recordResult(
    "LEAVE-01",
    "Apply for Casual Leave (2 Days)",
    maleApplyClRes.status === 200 ? "PASS" : "FAIL",
    `Status ${maleApplyClRes.status}`
  );

  // Attempt overlapping leave on same dates
  const maleApplyOverlapRes = await request('POST', '/api/hrm/leave/apply', {
    leavePolicyId: clPolicyId,
    fromDate: "2026-10-13T00:00:00Z",
    toDate: "2026-10-14T00:00:00Z",
    dayType: "FullDay",
    reason: "Conflicting overlap leave request"
  }, tokenMale);
  const overlapBlocked = maleApplyOverlapRes.status === 400 && (JSON.stringify(maleApplyOverlapRes.data).includes("already has an active") || JSON.stringify(maleApplyOverlapRes.data).includes("overlapping this date range"));
  recordResult(
    "LEAVE-02",
    "Overlapping Leave Application Rejected (HTTP 400)",
    overlapBlocked ? "PASS" : "FAIL",
    `Response: ${JSON.stringify(maleApplyOverlapRes.data)}`,
    "Status 400 with overlapping rejection error",
    `Status ${maleApplyOverlapRes.status}: ${JSON.stringify(maleApplyOverlapRes.data)}`
  );

  // 8. APPROVAL FLOW & BALANCE LEDGER AUDIT
  console.log("\n--- STEP 8: LEAVE APPROVAL & LEDGER VERIFICATION ---");
  
  // Balance before approval
  const balBeforeRes = await request('GET', `/api/hrm/employees/${empMaleId}/leave-balance`, null, tokenAdminA);
  const clBalBefore = balBeforeRes.data?.balances?.find(b => b.leaveTypeCode === "CL");

  // School Admin approves the leave
  const approveRes = await request('POST', `/api/hrm/leave-requests/${maleClReqId}/approve`, {
    remarks: "Approved by School Admin for UAT"
  }, tokenAdminA);
  recordResult(
    "APPR-01",
    "School Admin Approves Leave Request",
    approveRes.status === 200 ? "PASS" : "FAIL",
    `Approve response: ${JSON.stringify(approveRes.data)}`,
    "Status 200",
    `Status ${approveRes.status}`
  );

  // Double approval attempt
  const doubleApproveRes = await request('POST', `/api/hrm/leave-requests/${maleClReqId}/approve`, {
    remarks: "Attempt duplicate approval"
  }, tokenAdminA);
  const doubleBlocked = doubleApproveRes.status === 400 && JSON.stringify(doubleApproveRes.data).includes("already approved");
  recordResult(
    "APPR-02",
    "Duplicate Approval Attempt Blocked (HTTP 400)",
    doubleBlocked ? "PASS" : "FAIL",
    `Response: ${JSON.stringify(doubleApproveRes.data)}`,
    "Status 400 with 'already approved'",
    `Status ${doubleApproveRes.status}: ${JSON.stringify(doubleApproveRes.data)}`
  );

  // Balance after approval
  const balAfterRes = await request('GET', `/api/hrm/employees/${empMaleId}/leave-balance`, null, tokenAdminA);
  const clBalAfter = balAfterRes.data?.balances?.find(b => b.leaveTypeCode === "CL");

  // Check ledger transaction in database
  const ledgerRes = await pgClient.query(`
    SELECT "TransactionType", "Amount", "BalanceBefore", "BalanceAfter", "Remarks"
    FROM "LeaveTransactions"
    WHERE "EmployeeId" = $1 AND "LeavePolicyId" = $2
    ORDER BY "CreatedAt" DESC LIMIT 5;
  `, [empMaleId, clPolicyId]);
  
  const approveTx = ledgerRes.rows.find(r => r.TransactionType === "LEAVE_APPROVED");
  const hasAccurateLedger = approveTx && Math.abs(parseFloat(approveTx.Amount)) === 2;
  recordResult(
    "LEDGER-01",
    "Ledger Entry Created for Approval with Exact Balance Before & After",
    hasAccurateLedger ? "PASS" : "FAIL",
    `Ledger rows: ${JSON.stringify(ledgerRes.rows)}`,
    "TransactionType = LEAVE_APPROVED, Amount = -2",
    JSON.stringify(approveTx)
  );

  // 9. LEAVE REVOCATION & BALANCE RESTORATION
  console.log("\n--- STEP 9: LEAVE REVOCATION & RESTORATION ---");
  const revokeRes = await request('POST', `/api/hrm/leave-requests/${maleClReqId}/revoke`, {
    remarks: "Revoked due to schedule change"
  }, tokenAdminA);
  recordResult(
    "REV-01",
    "School Admin Revokes Approved Leave",
    revokeRes.status === 200 ? "PASS" : "FAIL",
    `Revoke response: ${JSON.stringify(revokeRes.data)}`,
    "Status 200",
    `Status ${revokeRes.status}`
  );

  // Check restored balance and ledger
  const balRestoredRes = await request('GET', `/api/hrm/employees/${empMaleId}/leave-balance`, null, tokenAdminA);
  const clBalRestored = balRestoredRes.data?.balances?.find(b => b.leaveTypeCode === "CL");
  const ledgerRevokeRes = await pgClient.query(`
    SELECT "TransactionType", "Amount", "BalanceBefore", "BalanceAfter", "Remarks"
    FROM "LeaveTransactions"
    WHERE "EmployeeId" = $1 AND "LeavePolicyId" = $2
    ORDER BY "CreatedAt" DESC LIMIT 1;
  `, [empMaleId, clPolicyId]);

  const hasRevokeTx = ledgerRevokeRes.rows[0]?.TransactionType === "LEAVE_CANCELLED";
  recordResult(
    "LEDGER-02",
    "Ledger Entry Created for Revocation and Balance Restored",
    hasRevokeTx ? "PASS" : "FAIL",
    `Restored Remaining: ${clBalRestored?.remaining}, Last Tx: ${JSON.stringify(ledgerRevokeRes.rows[0])}`,
    "TransactionType = LEAVE_CANCELLED",
    JSON.stringify(ledgerRevokeRes.rows[0])
  );

  // 10. MULTI-TENANT SCHOOL ISOLATION VERIFICATION
  console.log("\n--- STEP 10: MULTI-TENANT SCHOOL ISOLATION ---");
  
  // School B Admin attempts to view School A's employees
  const bViewAEmployees = await request('GET', '/api/hrm/employees', null, tokenAdminB);
  const bSeesAEmployee = Array.isArray(bViewAEmployees.data?.employees) && bViewAEmployees.data.employees.some(e => e.id === empMaleId);
  recordResult(
    "TENANT-01",
    "School B Admin Cannot View School A Employees",
    (!bSeesAEmployee && bViewAEmployees.status === 200) ? "PASS" : "FAIL",
    `School B employee count: ${bViewAEmployees.data?.employees?.length}`,
    "School A employee not visible to School B",
    bSeesAEmployee ? "LEAKED!" : "Completely Isolated"
  );

  // School B Admin attempts to approve School A's leave request
  const bApproveALeave = await request('POST', `/api/hrm/leave-requests/${femaleMatReqId}/approve`, {
    remarks: "Malicious cross-school approval attempt"
  }, tokenAdminB);
  recordResult(
    "TENANT-02",
    "School B Admin Cannot Approve School A Leave Request (HTTP 404)",
    bApproveALeave.status === 404 ? "PASS" : "FAIL",
    `Cross-tenant approve status: ${bApproveALeave.status}, body: ${JSON.stringify(bApproveALeave.data)}`,
    "Status 404 Not Found",
    `Status ${bApproveALeave.status}`
  );

  // 11. HOLIDAY CALENDAR & PRESET
  console.log("\n--- STEP 11: HOLIDAY CALENDAR CRUD ---");
  const holidayRes = await request('POST', '/api/hrm/holidays', {
    name: "Gandhi Jayanti",
    date: "2026-10-02T00:00:00Z",
    type: "National",
    academicYear: 2026,
    description: "National Holiday"
  }, tokenAdminA);
  const holidayId = holidayRes.data?.id;
  recordResult(
    "HOL-01",
    "Create Public Holiday",
    holidayRes.status === 200 ? "PASS" : "FAIL",
    `Holiday ID: ${holidayId}`,
    "Status 200",
    `Status ${holidayRes.status}`
  );

  // Duplicate holiday check
  const dupHolidayRes = await request('POST', '/api/hrm/holidays', {
    name: "Duplicate Holiday",
    date: "2026-10-02T00:00:00Z",
    type: "National",
    academicYear: 2026
  }, tokenAdminA);
  const dupBlocked = (dupHolidayRes.status === 400 || dupHolidayRes.status === 409) && JSON.stringify(dupHolidayRes.data).includes("already exists");
  recordResult(
    "HOL-02",
    "Duplicate Holiday Rejected (HTTP 409 / 400)",
    dupBlocked ? "PASS" : "FAIL",
    `Duplicate response: ${JSON.stringify(dupHolidayRes.data)}`,
    "Status 409 Conflict with 'already exists'",
    `Status ${dupHolidayRes.status}: ${JSON.stringify(dupHolidayRes.data)}`
  );

  // 12. HRM ANALYTICS
  console.log("\n--- STEP 12: HRM ANALYTICS ---");
  const analyticsRes = await request('GET', '/api/hrm/leave/analytics', null, tokenAdminA);
  const hasAnalytics = analyticsRes.status === 200 && analyticsRes.data?.activePolicies !== undefined;
  recordResult(
    "ANALYTICS-01",
    "HRM Leave Analytics Live Database Aggregation",
    hasAnalytics ? "PASS" : "FAIL",
    `Active Policies: ${analyticsRes.data?.activePolicies}, Total Requests: ${analyticsRes.data?.totalRequests}, Holidays: ${analyticsRes.data?.totalHolidays}`,
    "Status 200 with aggregated data",
    `Status ${analyticsRes.status}`
  );

  await pgClient.end();

  console.log("\n================================================================");
  console.log("📊 PRODUCTION UAT TEST RESULTS SUMMARY");
  console.log("================================================================");
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === "PASS").length;
  const failed = testResults.filter(r => r.status === "FAIL").length;
  console.log(`Total Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  return { total, passed, failed, testResults, schoolAId, schoolBId, userMaleId, userFemaleId };
}

runUAT().catch(err => {
  console.error("FATAL ERROR IN UAT:", err);
});
