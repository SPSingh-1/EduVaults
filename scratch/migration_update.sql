START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "OutwardTcIssuedDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "OutwardTcNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "PreviousSchoolName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "PreviousTcDate" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "PreviousTcDocumentUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "PreviousTcNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "TcConductRemark" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Students" ADD "TcReason" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "HasReceptionistModule" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "SchoolUpiId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppAdmissionInquiryEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppFeeReceiptsEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppFeeRemindersEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppGatePassAlertsEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppLibraryAlertsEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Schools" ADD "WhatsAppTcNoticeEnabled" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Invoices" ADD "LateFineAmount" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Invoices" ADD "PaidAmount" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "FeeStructures" ADD "FeeCategory" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "FeeStructures" ADD "GracePeriodDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "FeeStructures" ADD "IsCustomPaymentAllowed" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "FeeStructures" ADD "LateFeePerDay" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "FeeStructures" ADD "MinPartialPaymentAmount" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Enrollments" ADD "AcademicOutcomeRemark" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Enrollments" ADD "FailedSubjectsCount" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Enrollments" ADD "IsAdminOverride" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    ALTER TABLE "Enrollments" ADD "OverrideReason" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "AdmissionInquiries" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ChildName" text NOT NULL,
        "TargetClass" text NOT NULL,
        "ParentName" text NOT NULL,
        "Phone" text NOT NULL,
        "Address" text,
        "Notes" text,
        "Status" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AdmissionInquiries" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AdmissionInquiries_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "AttendanceSyncRecords" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "EmployeeId" uuid NOT NULL,
        "EmployeeCode" character varying(50) NOT NULL,
        "SourceSystem" character varying(50) NOT NULL,
        "SourceRecordId" character varying(100) NOT NULL,
        "PunchDate" timestamp with time zone NOT NULL,
        "CheckInTime" timestamp with time zone,
        "CheckOutTime" timestamp with time zone,
        "Status" character varying(20) NOT NULL,
        "SyncStatus" character varying(20) NOT NULL,
        "SyncedAt" timestamp with time zone NOT NULL,
        "Remarks" text NOT NULL,
        CONSTRAINT "PK_AttendanceSyncRecords" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "Designations" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "DepartmentId" uuid,
        "Name" text NOT NULL,
        "Code" text NOT NULL,
        "Description" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Designations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Designations_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id"),
        CONSTRAINT "FK_Designations_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "Employees" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "UserId" uuid,
        "EmployeeCode" text NOT NULL,
        "FirstName" text NOT NULL,
        "LastName" text NOT NULL,
        "Email" text NOT NULL,
        "Phone" text NOT NULL,
        "Gender" text NOT NULL,
        "DateOfBirth" timestamp with time zone,
        "Address" text NOT NULL,
        "EmergencyContactName" text NOT NULL,
        "EmergencyContactPhone" text NOT NULL,
        "StaffType" text NOT NULL,
        "DepartmentId" uuid,
        "DesignationId" uuid,
        "DesignationName" text NOT NULL,
        "DepartmentName" text NOT NULL,
        "EmploymentTypeId" uuid,
        "EmploymentStatus" text NOT NULL,
        "JoiningDate" timestamp with time zone NOT NULL,
        "ConfirmationDate" timestamp with time zone,
        "ExitDate" timestamp with time zone,
        "BaseGrossSalary" numeric NOT NULL,
        "SalaryStructureId" uuid,
        "PfApplicable" boolean NOT NULL,
        "EsiApplicable" boolean NOT NULL,
        "PtApplicable" boolean NOT NULL,
        "TdsApplicable" boolean NOT NULL,
        "BankName" text NOT NULL,
        "BankAccountNumber" text NOT NULL,
        "BankIfscCode" text NOT NULL,
        "PanNumber" text NOT NULL,
        "AadhaarLast4" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Employees" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Employees_Departments_DepartmentId" FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id"),
        CONSTRAINT "FK_Employees_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Employees_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "EmploymentTypes" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        "Code" text NOT NULL,
        "Description" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_EmploymentTypes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_EmploymentTypes_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "GatePasses" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "PassNumber" text NOT NULL,
        "StudentId" uuid NOT NULL,
        "StudentName" text NOT NULL,
        "ClassSection" text NOT NULL,
        "ParentName" text NOT NULL,
        "ParentPhone" text NOT NULL,
        "Reason" text NOT NULL,
        "IssuedAt" timestamp with time zone NOT NULL,
        "Status" text NOT NULL,
        CONSTRAINT "PK_GatePasses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_GatePasses_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "LeavePolicies" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "LeaveTypeCode" text NOT NULL,
        "LeaveTypeName" text NOT NULL,
        "AnnualAllotment" numeric NOT NULL,
        "CarryForwardAllowed" boolean NOT NULL,
        "MaxCarryForwardDays" numeric NOT NULL,
        "EncashmentAllowed" boolean NOT NULL,
        "IsPaid" boolean NOT NULL,
        "RequiresAttachment" boolean NOT NULL,
        "ApprovalSequenceJson" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "EffectiveFrom" timestamp with time zone NOT NULL,
        "EffectiveTo" timestamp with time zone,
        CONSTRAINT "PK_LeavePolicies" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LeavePolicies_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "Payrolls" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "PeriodMonth" integer NOT NULL,
        "PeriodYear" integer NOT NULL,
        "PeriodStartDate" timestamp with time zone NOT NULL,
        "PeriodEndDate" timestamp with time zone NOT NULL,
        "TotalEmployeesProcessed" integer NOT NULL,
        "TotalGrossPay" numeric NOT NULL,
        "TotalDeductions" numeric NOT NULL,
        "TotalNetPay" numeric NOT NULL,
        "Status" text NOT NULL,
        "ReviewedAt" timestamp with time zone,
        "ApprovedAt" timestamp with time zone,
        "FinalizedAt" timestamp with time zone,
        "PaidAt" timestamp with time zone,
        "BankBatchRef" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Payrolls" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Payrolls_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "SalaryComponents" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Type" text NOT NULL,
        "CalculationType" text NOT NULL,
        "DefaultValue" numeric NOT NULL,
        "FormulaExpression" text NOT NULL,
        "IsTaxable" boolean NOT NULL,
        "IsPfApplicable" boolean NOT NULL,
        "IsEsiApplicable" boolean NOT NULL,
        "IsPtApplicable" boolean NOT NULL,
        "IsTdsApplicable" boolean NOT NULL,
        "IsStatutory" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "EffectiveFrom" timestamp with time zone NOT NULL,
        "EffectiveTo" timestamp with time zone,
        CONSTRAINT "PK_SalaryComponents" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalaryComponents_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "SalaryStructures" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "StructureName" text NOT NULL,
        "Description" text NOT NULL,
        "BasePay" numeric NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_SalaryStructures" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalaryStructures_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "StatutoryConfigurations" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "StatutoryType" text NOT NULL,
        "IsEnabled" boolean NOT NULL,
        "ConfigurationJson" text NOT NULL,
        "VersionNumber" integer NOT NULL,
        "Remarks" text,
        "EffectiveFrom" timestamp with time zone NOT NULL,
        "EffectiveTo" timestamp with time zone,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_StatutoryConfigurations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StatutoryConfigurations_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "Visitors" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "VisitorName" text NOT NULL,
        "Phone" text NOT NULL,
        "Purpose" text NOT NULL,
        "StudentName" text,
        "ClassSection" text,
        "WhomToMeet" text,
        "CheckInTime" timestamp with time zone NOT NULL,
        "CheckOutTime" timestamp with time zone,
        "Status" text NOT NULL,
        CONSTRAINT "PK_Visitors" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Visitors_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "WorkSchedules" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ShiftName" text NOT NULL,
        "StartTime" text NOT NULL,
        "EndTime" text NOT NULL,
        "GraceMinutes" integer NOT NULL,
        "LateCountThresholdForHalfDay" integer NOT NULL,
        "HalfDayMinutesThreshold" integer NOT NULL,
        "WorkingDaysMask" text NOT NULL,
        "SaturdayRule" text NOT NULL,
        "IsOvertimeEnabled" boolean NOT NULL,
        "OvertimeRateMultiplier" numeric NOT NULL,
        "EffectiveFrom" timestamp with time zone NOT NULL,
        "EffectiveTo" timestamp with time zone,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_WorkSchedules" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_WorkSchedules_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "EmployeeDocuments" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "EmployeeId" uuid NOT NULL,
        "DocumentType" text NOT NULL,
        "DocumentName" text NOT NULL,
        "FileUrl" text NOT NULL,
        "VerificationStatus" text NOT NULL,
        "UploadedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_EmployeeDocuments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_EmployeeDocuments_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_EmployeeDocuments_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "TeacherProfiles" (
        "EmployeeId" uuid NOT NULL,
        "Qualification" text NOT NULL,
        "Specialization" text NOT NULL,
        "MaxWeeklyPeriods" integer NOT NULL,
        CONSTRAINT "PK_TeacherProfiles" PRIMARY KEY ("EmployeeId"),
        CONSTRAINT "FK_TeacherProfiles_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "PayrollItems" (
        "Id" uuid NOT NULL,
        "PayrollId" uuid NOT NULL,
        "EmployeeId" uuid NOT NULL,
        "EmployeeName" text NOT NULL,
        "EmployeeCode" text NOT NULL,
        "Designation" text NOT NULL,
        "Department" text NOT NULL,
        "TotalWorkingDays" integer NOT NULL,
        "PresentDays" numeric NOT NULL,
        "HalfDays" numeric NOT NULL,
        "PaidLeaveDays" numeric NOT NULL,
        "LwpDays" numeric NOT NULL,
        "BaseGross" numeric NOT NULL,
        "BasicEarned" numeric NOT NULL,
        "GrossEarned" numeric NOT NULL,
        "TotalAllowances" numeric NOT NULL,
        "StatutoryDeductions" numeric NOT NULL,
        "LwpDeduction" numeric NOT NULL,
        "ManualAdjustments" numeric NOT NULL,
        "NetSalary" numeric NOT NULL,
        "ItemizedEarningsJson" text NOT NULL,
        "ItemizedDeductionsJson" text NOT NULL,
        "Status" text NOT NULL,
        "Remarks" text,
        CONSTRAINT "PK_PayrollItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PayrollItems_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PayrollItems_Payrolls_PayrollId" FOREIGN KEY ("PayrollId") REFERENCES "Payrolls" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "PayrollSnapshots" (
        "Id" uuid NOT NULL,
        "PayrollId" uuid NOT NULL,
        "CompleteEngineSnapshotJson" text NOT NULL,
        "SnapshotTakenAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_PayrollSnapshots" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PayrollSnapshots_Payrolls_PayrollId" FOREIGN KEY ("PayrollId") REFERENCES "Payrolls" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE TABLE "SalaryStructureComponents" (
        "Id" uuid NOT NULL,
        "SalaryStructureId" uuid NOT NULL,
        "SalaryComponentId" uuid NOT NULL,
        "Amount" numeric NOT NULL,
        "Percentage" numeric NOT NULL,
        CONSTRAINT "PK_SalaryStructureComponents" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalaryStructureComponents_SalaryComponents_SalaryComponentId" FOREIGN KEY ("SalaryComponentId") REFERENCES "SalaryComponents" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SalaryStructureComponents_SalaryStructures_SalaryStructureId" FOREIGN KEY ("SalaryStructureId") REFERENCES "SalaryStructures" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_AdmissionInquiries_SchoolId_CreatedAt" ON "AdmissionInquiries" ("SchoolId", "CreatedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Designations_DepartmentId" ON "Designations" ("DepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Designations_SchoolId" ON "Designations" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_EmployeeDocuments_EmployeeId" ON "EmployeeDocuments" ("EmployeeId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_EmployeeDocuments_SchoolId" ON "EmployeeDocuments" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Employees_DepartmentId" ON "Employees" ("DepartmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE UNIQUE INDEX "IX_Employees_SchoolId_EmployeeCode" ON "Employees" ("SchoolId", "EmployeeCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Employees_SchoolId_StaffType_EmploymentStatus" ON "Employees" ("SchoolId", "StaffType", "EmploymentStatus");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Employees_UserId" ON "Employees" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_EmploymentTypes_SchoolId" ON "EmploymentTypes" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_GatePasses_SchoolId_IssuedAt" ON "GatePasses" ("SchoolId", "IssuedAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_LeavePolicies_SchoolId" ON "LeavePolicies" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_PayrollItems_EmployeeId" ON "PayrollItems" ("EmployeeId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_PayrollItems_PayrollId" ON "PayrollItems" ("PayrollId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Payrolls_SchoolId_PeriodYear_PeriodMonth" ON "Payrolls" ("SchoolId", "PeriodYear", "PeriodMonth");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE UNIQUE INDEX "IX_PayrollSnapshots_PayrollId" ON "PayrollSnapshots" ("PayrollId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_SalaryComponents_SchoolId" ON "SalaryComponents" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_SalaryStructureComponents_SalaryComponentId" ON "SalaryStructureComponents" ("SalaryComponentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_SalaryStructureComponents_SalaryStructureId" ON "SalaryStructureComponents" ("SalaryStructureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_SalaryStructures_SchoolId" ON "SalaryStructures" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_StatutoryConfigurations_SchoolId_StatutoryType_EffectiveFrom" ON "StatutoryConfigurations" ("SchoolId", "StatutoryType", "EffectiveFrom");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_Visitors_SchoolId_CheckInTime" ON "Visitors" ("SchoolId", "CheckInTime");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    CREATE INDEX "IX_WorkSchedules_SchoolId" ON "WorkSchedules" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827163857_AddFeeLateFineAndReceptionist') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260827163857_AddFeeLateFineAndReceptionist', '10.0.8');
    END IF;
END $EF$;
COMMIT;

