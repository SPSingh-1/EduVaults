START TRANSACTION;
ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "BirthCertificateNumber" text;

ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "BoardRegistrationNumber" text;

ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "CasteCertificateNumber" text;

ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "IdentificationMark" text;

ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "InitialAdmissionClass" text;

ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "LeavingClass" text;

ALTER TABLE "LeaveRequests" ADD "ApprovedAt" timestamp with time zone;

ALTER TABLE "LeaveRequests" ADD "ApproverOneAction" text;

ALTER TABLE "LeaveRequests" ADD "ApproverOneActionAt" timestamp with time zone;

ALTER TABLE "LeaveRequests" ADD "ApproverOneId" text;

ALTER TABLE "LeaveRequests" ADD "ApproverOneNote" text;

ALTER TABLE "LeaveRequests" ADD "ApproverTwoAction" text;

ALTER TABLE "LeaveRequests" ADD "ApproverTwoActionAt" timestamp with time zone;

ALTER TABLE "LeaveRequests" ADD "ApproverTwoId" text;

ALTER TABLE "LeaveRequests" ADD "ApproverTwoNote" text;

ALTER TABLE "LeaveRequests" ADD "AttachmentUrl" text;

ALTER TABLE "LeaveRequests" ADD "CancellationReason" text;

ALTER TABLE "LeaveRequests" ADD "CancelledAt" timestamp with time zone;

ALTER TABLE "LeaveRequests" ADD "ContactDuringLeave" text;

ALTER TABLE "LeaveRequests" ADD "CurrentApprovalLevel" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeaveRequests" ADD "EmployeeCode" text NOT NULL DEFAULT '';

ALTER TABLE "LeaveRequests" ADD "EmployeeId" uuid;

ALTER TABLE "LeaveRequests" ADD "EmployeeName" text NOT NULL DEFAULT '';

ALTER TABLE "LeaveRequests" ADD "FinalApprovedById" text;

ALTER TABLE "LeaveRequests" ADD "HandoverNotes" text;

ALTER TABLE "LeaveRequests" ADD "HandoverTo" text;

ALTER TABLE "LeaveRequests" ADD "LeavePolicyId" uuid;

ALTER TABLE "LeaveRequests" ADD "LeaveTypeName" text NOT NULL DEFAULT '';

ALTER TABLE "LeaveRequests" ADD "TotalCalendarDays" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "AccrualFrequency" text NOT NULL DEFAULT '';

ALTER TABLE "LeavePolicies" ADD "AccrualUnitsPerPeriod" numeric NOT NULL DEFAULT 0.0;

ALTER TABLE "LeavePolicies" ADD "AllowHalfDay" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "LeavePolicies" ADD "CarryForwardExpiryMonths" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "ColorHex" text NOT NULL DEFAULT '';

ALTER TABLE "LeavePolicies" ADD "CreatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';

ALTER TABLE "LeavePolicies" ADD "Description" text;

ALTER TABLE "LeavePolicies" ADD "GenderEligibility" text NOT NULL DEFAULT '';

ALTER TABLE "LeavePolicies" ADD "JoiningCutoffDay" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "JoiningRule" text NOT NULL DEFAULT '';

ALTER TABLE "LeavePolicies" ADD "MaxApplicationsPerYear" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "MaxConsecutiveDays" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "MaxEncashmentDays" numeric NOT NULL DEFAULT 0.0;

ALTER TABLE "LeavePolicies" ADD "MinAttachmentAfterDays" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "MinimumServiceDays" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "NoticePeriodDays" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "ProbationEligible" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "LeavePolicies" ADD "SandwichRuleApplied" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "LeavePolicies" ADD "SortOrder" integer NOT NULL DEFAULT 0;

ALTER TABLE "LeavePolicies" ADD "StaffTypeEligibilityJson" text NOT NULL DEFAULT '';

ALTER TABLE "LeavePolicies" ADD "UpdatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';

ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperNotes" text;

ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUploadedAt" timestamp with time zone;

ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUploadedByTeacherId" uuid;

ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUrl" text;

CREATE TABLE "HolidayCalendars" (
    "Id" uuid NOT NULL,
    "SchoolId" uuid NOT NULL,
    "Name" text NOT NULL,
    "Date" timestamp with time zone NOT NULL,
    "HolidayType" text NOT NULL,
    "IsOptional" boolean NOT NULL,
    "Description" text,
    "IsRecurringYearly" boolean NOT NULL,
    "AcademicYear" integer NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_HolidayCalendars" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_HolidayCalendars_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
);

CREATE TABLE "LeaveBalances" (
    "Id" uuid NOT NULL,
    "SchoolId" uuid NOT NULL,
    "EmployeeId" uuid NOT NULL,
    "TeacherUserId" uuid,
    "LeavePolicyId" uuid NOT NULL,
    "LeaveTypeCode" text NOT NULL,
    "AcademicYear" integer NOT NULL,
    "OpeningBalance" numeric NOT NULL,
    "TotalAccrued" numeric NOT NULL,
    "CarryForward" numeric NOT NULL,
    "ManualCredits" numeric NOT NULL,
    "TotalAvailable" numeric NOT NULL,
    "TotalUsed" numeric NOT NULL,
    "PendingUsed" numeric NOT NULL,
    "RemainingBalance" numeric NOT NULL,
    "LastCalculatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_LeaveBalances" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_LeaveBalances_LeavePolicies_LeavePolicyId" FOREIGN KEY ("LeavePolicyId") REFERENCES "LeavePolicies" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_LeaveBalances_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
);

CREATE TABLE "LeaveTransactions" (
    "Id" uuid NOT NULL,
    "SchoolId" uuid NOT NULL,
    "EmployeeId" uuid NOT NULL,
    "TeacherUserId" uuid,
    "LeavePolicyId" uuid NOT NULL,
    "LeaveTypeCode" text NOT NULL,
    "TransactionType" text NOT NULL,
    "Amount" numeric NOT NULL,
    "BalanceBefore" numeric NOT NULL,
    "BalanceAfter" numeric NOT NULL,
    "LeaveRequestId" uuid,
    "Remarks" text,
    "ProcessedBy" uuid,
    "AcademicYear" integer NOT NULL,
    "Month" integer,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_LeaveTransactions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_LeaveTransactions_LeavePolicies_LeavePolicyId" FOREIGN KEY ("LeavePolicyId") REFERENCES "LeavePolicies" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_LeaveTransactions_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS "PrintTemplates" (
    "Id" uuid NOT NULL,
    "SchoolId" uuid,
    "DocumentType" character varying(50) NOT NULL,
    "TemplateName" text NOT NULL,
    "Description" text NOT NULL,
    "PaperSize" character varying(30) NOT NULL,
    "Orientation" text NOT NULL,
    "LayoutConfigJson" text NOT NULL,
    "HtmlContent" text NOT NULL,
    "WasAiGenerated" boolean NOT NULL,
    "AiPromptUsed" text NOT NULL,
    "IsSuperAdminMaster" boolean NOT NULL,
    "IsDefault" boolean NOT NULL,
    "IsActive" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    CONSTRAINT "PK_PrintTemplates" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_PrintTemplates_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_PrintTemplates_SchoolId_DocumentType_IsDefault" ON "PrintTemplates" ("SchoolId", "DocumentType", "IsDefault");


CREATE INDEX "IX_LeaveRequests_LeavePolicyId" ON "LeaveRequests" ("LeavePolicyId");

CREATE INDEX "IX_Exams_QuestionPaperUploadedByTeacherId" ON "Exams" ("QuestionPaperUploadedByTeacherId");

CREATE INDEX "IX_HolidayCalendars_SchoolId" ON "HolidayCalendars" ("SchoolId");

CREATE INDEX "IX_LeaveBalances_LeavePolicyId" ON "LeaveBalances" ("LeavePolicyId");

CREATE INDEX "IX_LeaveBalances_SchoolId" ON "LeaveBalances" ("SchoolId");

CREATE INDEX "IX_LeaveTransactions_LeavePolicyId" ON "LeaveTransactions" ("LeavePolicyId");

CREATE INDEX "IX_LeaveTransactions_SchoolId" ON "LeaveTransactions" ("SchoolId");

ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Teachers_QuestionPaperUploadedByTeacherId" FOREIGN KEY ("QuestionPaperUploadedByTeacherId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL;

ALTER TABLE "LeaveRequests" ADD CONSTRAINT "FK_LeaveRequests_LeavePolicies_LeavePolicyId" FOREIGN KEY ("LeavePolicyId") REFERENCES "LeavePolicies" ("Id");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260911165141_AddEnterpriseHRMAndHolidayCalendar', '10.0.8');

COMMIT;

START TRANSACTION;
ALTER TABLE "LeaveRequests" ADD "ForwardNote" text;

ALTER TABLE "LeaveRequests" ADD "ForwardedAt" timestamp with time zone;

ALTER TABLE "LeaveRequests" ADD "ForwardedById" text;

ALTER TABLE "LeaveRequests" ADD "ForwardedByName" text;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260911183418_AddLeaveForwardingWorkflow', '10.0.8');

COMMIT;

