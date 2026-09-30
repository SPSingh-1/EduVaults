CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "KnowledgeBaseCategories" (
        "Id" uuid NOT NULL,
        "Icon" text NOT NULL,
        "Title" text NOT NULL,
        "ArticleCount" integer NOT NULL,
        CONSTRAINT "PK_KnowledgeBaseCategories" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "PlatformPlans" (
        "Id" uuid NOT NULL,
        "TierLabel" text NOT NULL,
        "PlanName" text NOT NULL,
        "ImplementationCost" numeric NOT NULL,
        "StudentCapacity" text NOT NULL,
        "StorageLimit" text NOT NULL,
        "MonthlyPrice" text NOT NULL,
        "IsTopRevenue" boolean NOT NULL,
        CONSTRAINT "PK_PlatformPlans" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "PlatformSettings" (
        "Id" uuid NOT NULL,
        "OrgName" text NOT NULL,
        "LogoUrl" text,
        "PrimaryColor" text,
        "MaintenanceMode" boolean NOT NULL,
        "MaintenanceMessage" text,
        "BackupFrequency" text,
        "BackupTime" text,
        "BackupTarget" text,
        CONSTRAINT "PK_PlatformSettings" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "ReportApprovals" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ClassId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "ExamType" text NOT NULL,
        "IsApproved" boolean NOT NULL,
        "ApprovedAt" timestamp with time zone,
        "ApprovedBy" uuid,
        "RevokedReason" text NOT NULL,
        CONSTRAINT "PK_ReportApprovals" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Schools" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "Address" text NOT NULL,
        "City" text NOT NULL,
        "Website" text NOT NULL,
        "SchoolCode" text NOT NULL,
        "Status" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "LogoUrl" text,
        "EmailDomain" text,
        "ThemeColor" text,
        CONSTRAINT "PK_Schools" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "SupportTickets" (
        "Id" uuid NOT NULL,
        "TicketNumber" text NOT NULL,
        "Title" text NOT NULL,
        "SchoolName" text NOT NULL,
        "Status" text NOT NULL,
        "Priority" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "Details" text NOT NULL,
        "ContactNumber" text NOT NULL,
        "SchoolId" uuid,
        CONSTRAINT "PK_SupportTickets" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "SystemEvents" (
        "Id" uuid NOT NULL,
        "Icon" text NOT NULL,
        "Title" text NOT NULL,
        "Description" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_SystemEvents" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "TimetablePeriods" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "PeriodNumber" integer NOT NULL,
        "StartTime" text NOT NULL,
        "EndTime" text NOT NULL,
        "DurationMinutes" integer NOT NULL,
        CONSTRAINT "PK_TimetablePeriods" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Capacities" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Value" integer NOT NULL,
        CONSTRAINT "PK_Capacities" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Capacities_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Departments" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_Departments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Departments_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "EnrollmentClasses" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_EnrollmentClasses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_EnrollmentClasses_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "ExamTypes" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_ExamTypes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ExamTypes_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Rooms" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_Rooms" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Rooms_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "SchoolPlanConfigurations" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "PlanType" text NOT NULL,
        "ImplementationCost" numeric NOT NULL,
        "StudentCapacity" text NOT NULL,
        "StorageLimit" text NOT NULL,
        "MonthlyPrice" text NOT NULL,
        CONSTRAINT "PK_SchoolPlanConfigurations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SchoolPlanConfigurations_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Sections" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        CONSTRAINT "PK_Sections" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Sections_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Subjects" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Department" text NOT NULL,
        CONSTRAINT "PK_Subjects" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Subjects_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Subscriptions" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "PlanType" text NOT NULL,
        "Amount" numeric NOT NULL,
        "Status" text NOT NULL,
        "StartDate" timestamp with time zone NOT NULL,
        "EndDate" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Subscriptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Subscriptions_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "UpgradeRequests" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "RequestedPlanType" text NOT NULL,
        "Status" text NOT NULL,
        "Requirements" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_UpgradeRequests" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_UpgradeRequests_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid,
        "Email" text NOT NULL,
        "PasswordHash" text NOT NULL,
        "Role" text NOT NULL,
        "FirstName" text NOT NULL,
        "LastName" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Users_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "FeeStructures" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        "Grade" text NOT NULL,
        "Amount" numeric NOT NULL,
        "Frequency" text NOT NULL,
        "Installments" integer NOT NULL,
        "StudentId" uuid,
        "SubmissionTime" text,
        "Breakdown" text,
        CONSTRAINT "PK_FeeStructures" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeeStructures_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_FeeStructures_Users_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Users" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Students" (
        "UserId" uuid NOT NULL,
        "StudentId" text,
        "BloodGroup" text NOT NULL,
        "GuardianName" text NOT NULL,
        "GuardianPhone" text NOT NULL,
        "GuardianRelationship" text NOT NULL,
        "Address" text NOT NULL,
        CONSTRAINT "PK_Students" PRIMARY KEY ("UserId"),
        CONSTRAINT "FK_Students_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Teachers" (
        "UserId" uuid NOT NULL,
        "EmployeeId" text NOT NULL,
        "Department" text NOT NULL,
        "OfficeLocation" text NOT NULL,
        "Qualifications" text NOT NULL,
        "Specialization" text,
        "Salary" numeric NOT NULL,
        CONSTRAINT "PK_Teachers" PRIMARY KEY ("UserId"),
        CONSTRAINT "FK_Teachers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Attendances" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "Status" text NOT NULL,
        "Remarks" text,
        CONSTRAINT "PK_Attendances" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Attendances_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("UserId") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Invoices" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "FeeStructureId" uuid NOT NULL,
        "IssueDate" timestamp with time zone NOT NULL,
        "DueDate" timestamp with time zone NOT NULL,
        "Amount" numeric NOT NULL,
        "Status" text NOT NULL,
        CONSTRAINT "PK_Invoices" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Invoices_FeeStructures_FeeStructureId" FOREIGN KEY ("FeeStructureId") REFERENCES "FeeStructures" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Invoices_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("UserId") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Classes" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Grade" text NOT NULL,
        "Section" text NOT NULL,
        "Level" text NOT NULL,
        "Room" text NOT NULL,
        "Capacity" integer NOT NULL,
        "ClassTeacherId" uuid,
        "AreMarksPublished" boolean NOT NULL,
        "PublishedExamTypes" text NOT NULL,
        CONSTRAINT "PK_Classes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Classes_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Classes_Teachers_ClassTeacherId" FOREIGN KEY ("ClassTeacherId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Transactions" (
        "Id" uuid NOT NULL,
        "InvoiceId" uuid NOT NULL,
        "ReferenceNumber" text NOT NULL,
        "Amount" numeric NOT NULL,
        "PaymentMethod" text NOT NULL,
        "TransactionDate" timestamp with time zone NOT NULL,
        "Status" text NOT NULL,
        CONSTRAINT "PK_Transactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Transactions_Invoices_InvoiceId" FOREIGN KEY ("InvoiceId") REFERENCES "Invoices" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "ClassSubjects" (
        "Id" uuid NOT NULL,
        "ClassId" uuid NOT NULL,
        "SubjectId" uuid NOT NULL,
        "TeacherId" uuid,
        CONSTRAINT "PK_ClassSubjects" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ClassSubjects_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ClassSubjects_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ClassSubjects_Teachers_TeacherId" FOREIGN KEY ("TeacherId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Enrollments" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "ClassId" uuid NOT NULL,
        "AcademicYear" text NOT NULL,
        "Status" text NOT NULL,
        "EnrollDate" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Enrollments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Enrollments_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Enrollments_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("UserId") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "Exams" (
        "Id" uuid NOT NULL,
        "ClassId" uuid NOT NULL,
        "SubjectId" uuid NOT NULL,
        "ExamType" text NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "Time" text,
        "ProctorId" uuid,
        "Status" text NOT NULL,
        CONSTRAINT "PK_Exams" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Exams_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Exams_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Exams_Teachers_ProctorId" FOREIGN KEY ("ProctorId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "TimetableItems" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ClassId" uuid NOT NULL,
        "TeacherId" uuid,
        "SubjectId" uuid,
        "CustomSubjectName" text,
        "PeriodNumber" integer NOT NULL,
        "DayOfWeek" text NOT NULL,
        "Remark" text,
        "OriginalTeacherId" uuid,
        "IsRescheduled" boolean NOT NULL,
        CONSTRAINT "PK_TimetableItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TimetableItems_Classes_ClassId" FOREIGN KEY ("ClassId") REFERENCES "Classes" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TimetableItems_Subjects_SubjectId" FOREIGN KEY ("SubjectId") REFERENCES "Subjects" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TimetableItems_Teachers_TeacherId" FOREIGN KEY ("TeacherId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE TABLE "ExamResults" (
        "Id" uuid NOT NULL,
        "ExamId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "MarksObtained" numeric,
        "TheoryMarks" numeric,
        "PracticalMarks" numeric,
        "Grade" text NOT NULL,
        "Remarks" text NOT NULL,
        "IsSubmitted" boolean NOT NULL,
        CONSTRAINT "PK_ExamResults" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ExamResults_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ExamResults_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("UserId") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Attendances_StudentId" ON "Attendances" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Capacities_SchoolId" ON "Capacities" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Classes_ClassTeacherId" ON "Classes" ("ClassTeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Classes_SchoolId_Grade_Section" ON "Classes" ("SchoolId", "Grade", "Section");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_ClassSubjects_ClassId_SubjectId" ON "ClassSubjects" ("ClassId", "SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_ClassSubjects_SubjectId" ON "ClassSubjects" ("SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_ClassSubjects_TeacherId" ON "ClassSubjects" ("TeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Departments_SchoolId" ON "Departments" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_EnrollmentClasses_SchoolId" ON "EnrollmentClasses" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Enrollments_ClassId" ON "Enrollments" ("ClassId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Enrollments_StudentId_AcademicYear" ON "Enrollments" ("StudentId", "AcademicYear");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_ExamResults_ExamId_StudentId" ON "ExamResults" ("ExamId", "StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_ExamResults_StudentId" ON "ExamResults" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Exams_ClassId" ON "Exams" ("ClassId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Exams_ProctorId" ON "Exams" ("ProctorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Exams_SubjectId" ON "Exams" ("SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_ExamTypes_SchoolId" ON "ExamTypes" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_FeeStructures_SchoolId" ON "FeeStructures" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_FeeStructures_StudentId" ON "FeeStructures" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Invoices_FeeStructureId" ON "Invoices" ("FeeStructureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Invoices_StudentId" ON "Invoices" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_ReportApprovals_ClassId_StudentId_ExamType" ON "ReportApprovals" ("ClassId", "StudentId", "ExamType");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Rooms_SchoolId" ON "Rooms" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_SchoolPlanConfigurations_SchoolId" ON "SchoolPlanConfigurations" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Schools_SchoolCode" ON "Schools" ("SchoolCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Sections_SchoolId" ON "Sections" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Subjects_SchoolId_Code" ON "Subjects" ("SchoolId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Subscriptions_SchoolId" ON "Subscriptions" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_TimetableItems_ClassId" ON "TimetableItems" ("ClassId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_TimetableItems_SubjectId" ON "TimetableItems" ("SubjectId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_TimetableItems_TeacherId" ON "TimetableItems" ("TeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Transactions_InvoiceId" ON "Transactions" ("InvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Transactions_ReferenceNumber" ON "Transactions" ("ReferenceNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_UpgradeRequests_SchoolId" ON "UpgradeRequests" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    CREATE INDEX "IX_Users_SchoolId" ON "Users" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260628085712_AddReportApprovals') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260628085712_AddReportApprovals', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "CustomProviderApiKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "CustomProviderFromNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "CustomProviderUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "MetaAccessToken" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "MetaPhoneNumberId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "MetaWhatsAppFromNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    ALTER TABLE "Schools" ADD "WhatsAppProvider" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630185811_AddWhatsAppMultiProvider') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260630185811_AddWhatsAppMultiProvider', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "CashlessInstructions" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PayPalClientId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PayPalClientSecret" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PaymentProvider" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PhonePeMerchantId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PhonePeSaltIndex" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "PhonePeSaltKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "StripePublishableKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    ALTER TABLE "Schools" ADD "StripeSecretKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260630192233_AddPaymentMultiProvider') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260630192233_AddPaymentMultiProvider', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "CashlessInstructions" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PayPalClientId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PayPalClientSecret" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PaymentProvider" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PhonePeMerchantId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PhonePeSaltIndex" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "PhonePeSaltKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "RazorpayKeyId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "RazorpayKeySecret" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "StripePublishableKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    ALTER TABLE "PlatformSettings" ADD "StripeSecretKey" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260704135804_AddGlobalPaymentCredentials') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260704135804_AddGlobalPaymentCredentials', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260706115259_AddLandingPageContacts') THEN
    ALTER TABLE "PlatformSettings" ADD "ContactAddress" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260706115259_AddLandingPageContacts') THEN
    ALTER TABLE "PlatformSettings" ADD "ContactEmail" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260706115259_AddLandingPageContacts') THEN
    ALTER TABLE "PlatformSettings" ADD "ContactHours" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260706115259_AddLandingPageContacts') THEN
    ALTER TABLE "PlatformSettings" ADD "ContactPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260706115259_AddLandingPageContacts') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260706115259_AddLandingPageContacts', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260707172013_AddStudentDateOfBirth') THEN
    ALTER TABLE "Students" ADD "DateOfBirth" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260707172013_AddStudentDateOfBirth') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260707172013_AddStudentDateOfBirth', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260707174230_AddTeacherDateOfBirth') THEN
    ALTER TABLE "Teachers" ADD "DateOfBirth" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260707174230_AddTeacherDateOfBirth') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260707174230_AddTeacherDateOfBirth', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    ALTER TABLE "Schools" ADD "HasAccountModule" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    ALTER TABLE "Schools" ADD "HasLibraryModule" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "AccountManagers" (
        "UserId" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "EmployeeId" text NOT NULL,
        "Designation" text NOT NULL,
        "JoinedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AccountManagers" PRIMARY KEY ("UserId"),
        CONSTRAINT "FK_AccountManagers_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_AccountManagers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "Books" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ISBN" text NOT NULL,
        "Title" text NOT NULL,
        "Author" text NOT NULL,
        "Publisher" text NOT NULL,
        "Category" text NOT NULL,
        "TotalCopies" integer NOT NULL,
        "AvailableCopies" integer NOT NULL,
        "ShelfLocation" text NOT NULL,
        "AddedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Books" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Books_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "Expenses" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Category" text NOT NULL,
        "Title" text NOT NULL,
        "Amount" numeric NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "VoucherNumber" text,
        "Description" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Expenses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Expenses_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "LeaveQuotas" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "TeacherUserId" uuid NOT NULL,
        "AcademicYear" integer NOT NULL,
        "CasualLeaveAllotted" integer NOT NULL,
        "SickLeaveAllotted" integer NOT NULL,
        "EarnedLeaveAllotted" integer NOT NULL,
        "MaternityLeaveAllotted" integer NOT NULL,
        "CasualLeaveUsed" numeric NOT NULL,
        "SickLeaveUsed" numeric NOT NULL,
        "EarnedLeaveUsed" numeric NOT NULL,
        "MaternityLeaveUsed" numeric NOT NULL,
        CONSTRAINT "PK_LeaveQuotas" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LeaveQuotas_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "LeaveRequests" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "TeacherUserId" uuid NOT NULL,
        "LeaveType" text NOT NULL,
        "DayType" text NOT NULL,
        "HalfDaySession" text,
        "FromDate" timestamp with time zone NOT NULL,
        "ToDate" timestamp with time zone NOT NULL,
        "TotalDays" numeric NOT NULL,
        "Reason" text NOT NULL,
        "Status" text NOT NULL,
        "AppliedAt" timestamp with time zone NOT NULL,
        "RejectionNote" text,
        CONSTRAINT "PK_LeaveRequests" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LeaveRequests_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "LibrarySettings" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "FinePerDay" numeric NOT NULL,
        "MaxIssueDays" integer NOT NULL,
        "MaxBooksPerMember" integer NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_LibrarySettings" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LibrarySettings_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "PageDefinitions" (
        "Id" uuid NOT NULL,
        "PageKey" text NOT NULL,
        "PageName" text NOT NULL,
        "Module" text NOT NULL,
        "Icon" text NOT NULL,
        "Route" text NOT NULL,
        "SortOrder" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_PageDefinitions" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "SalaryRecords" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "TeacherUserId" uuid NOT NULL,
        "Month" integer NOT NULL,
        "Year" integer NOT NULL,
        "GrossSalary" numeric NOT NULL,
        "TotalWorkingDays" integer NOT NULL,
        "PresentDays" numeric NOT NULL,
        "AbsentDays" numeric NOT NULL,
        "HalfDays" numeric NOT NULL,
        "LeaveDaysUsed" numeric NOT NULL,
        "LwpDays" numeric NOT NULL,
        "PerDayRate" numeric NOT NULL,
        "BasicEarned" numeric NOT NULL,
        "RuleBasedAllowances" numeric NOT NULL,
        "RuleBasedDeductions" numeric NOT NULL,
        "ManualAllowances" numeric NOT NULL,
        "ManualDeductions" numeric NOT NULL,
        "LwpDeduction" numeric NOT NULL,
        "NetPay" numeric NOT NULL,
        "Status" text NOT NULL,
        "PaidOn" timestamp with time zone,
        "Remarks" text,
        "GeneratedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_SalaryRecords" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalaryRecords_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "SalaryRules" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Name" text NOT NULL,
        "Type" text NOT NULL,
        "CalculationMode" text NOT NULL,
        "Value" numeric NOT NULL,
        "IsDefault" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_SalaryRules" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalaryRules_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "LibraryTransactions" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "BookId" uuid NOT NULL,
        "MemberId" uuid NOT NULL,
        "MemberType" text NOT NULL,
        "MemberName" text NOT NULL,
        "IssueDate" timestamp with time zone NOT NULL,
        "DueDate" timestamp with time zone NOT NULL,
        "ReturnDate" timestamp with time zone,
        "Status" text NOT NULL,
        "FineAmount" numeric NOT NULL,
        "FinePaid" boolean NOT NULL,
        CONSTRAINT "PK_LibraryTransactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LibraryTransactions_Books_BookId" FOREIGN KEY ("BookId") REFERENCES "Books" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_LibraryTransactions_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE TABLE "SchoolRolePermissions" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "RoleName" text NOT NULL,
        "PageDefinitionId" uuid NOT NULL,
        "CanView" boolean NOT NULL,
        "CanCreate" boolean NOT NULL,
        "CanEdit" boolean NOT NULL,
        "CanDelete" boolean NOT NULL,
        CONSTRAINT "PK_SchoolRolePermissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SchoolRolePermissions_PageDefinitions_PageDefinitionId" FOREIGN KEY ("PageDefinitionId") REFERENCES "PageDefinitions" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SchoolRolePermissions_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_AccountManagers_SchoolId" ON "AccountManagers" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_Books_SchoolId" ON "Books" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_Expenses_SchoolId" ON "Expenses" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE UNIQUE INDEX "IX_LeaveQuotas_SchoolId_TeacherUserId_AcademicYear" ON "LeaveQuotas" ("SchoolId", "TeacherUserId", "AcademicYear");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_LeaveRequests_SchoolId" ON "LeaveRequests" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE UNIQUE INDEX "IX_LibrarySettings_SchoolId" ON "LibrarySettings" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_LibraryTransactions_BookId" ON "LibraryTransactions" ("BookId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_LibraryTransactions_SchoolId" ON "LibraryTransactions" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE UNIQUE INDEX "IX_SalaryRecords_SchoolId_TeacherUserId_Month_Year" ON "SalaryRecords" ("SchoolId", "TeacherUserId", "Month", "Year");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_SalaryRules_SchoolId" ON "SalaryRules" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE INDEX "IX_SchoolRolePermissions_PageDefinitionId" ON "SchoolRolePermissions" ("PageDefinitionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    CREATE UNIQUE INDEX "IX_SchoolRolePermissions_SchoolId_RoleName_PageDefinitionId" ON "SchoolRolePermissions" ("SchoolId", "RoleName", "PageDefinitionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823051805_AddHRMLibraryRBAC') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260823051805_AddHRMLibraryRBAC', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    ALTER TABLE "PageDefinitions" ADD "CreatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    ALTER TABLE "PageDefinitions" ADD "IsCustom" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    ALTER TABLE "PageDefinitions" ADD "TargetRole" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    CREATE TABLE "DashboardWidgetDefinitions" (
        "Id" uuid NOT NULL,
        "WidgetKey" text NOT NULL,
        "DefaultTitle" text NOT NULL,
        "MetricSource" text NOT NULL,
        "DefaultTimeRange" text NOT NULL,
        "ChartType" text NOT NULL,
        "ColorTheme" text NOT NULL,
        "IconName" text NOT NULL,
        "TargetRole" text NOT NULL,
        "IsCustom" boolean NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_DashboardWidgetDefinitions" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    CREATE TABLE "SchoolDashboardWidgets" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "Role" text NOT NULL,
        "WidgetKey" text NOT NULL,
        "CustomTitle" text,
        "TimeRange" text NOT NULL,
        "IsEnabled" boolean NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_SchoolDashboardWidgets" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SchoolDashboardWidgets_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    CREATE UNIQUE INDEX "IX_DashboardWidgetDefinitions_WidgetKey" ON "DashboardWidgetDefinitions" ("WidgetKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    CREATE UNIQUE INDEX "IX_SchoolDashboardWidgets_SchoolId_Role_WidgetKey" ON "SchoolDashboardWidgets" ("SchoolId", "Role", "WidgetKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823062308_AddDashboardWidgetsAndDynamicMenus') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260823062308_AddDashboardWidgetsAndDynamicMenus', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823070126_AddChartTypeToSchoolDashboardWidget') THEN
    ALTER TABLE "SchoolDashboardWidgets" ADD "ChartType" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260823070126_AddChartTypeToSchoolDashboardWidget') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260823070126_AddChartTypeToSchoolDashboardWidget', '10.0.8');
    END IF;
END $EF$;
COMMIT;

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

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "AadhaarNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "AdmissionDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "AdmissionNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "AdmissionSource" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "AnnualFamilyIncome" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "BusRoute" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "BusStop" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Category" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "ChronicIllness" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "City" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "CurrentMedication" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "DisabilityCertNo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "DisabilityType" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "District" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "EmergencyContactName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "EmergencyContactPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "EmergencyContactRelation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherAadhaar" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherEmail" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherOccupation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FatherQualification" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "FeeCategory" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Gender" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "HasDisability" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "HeightCm" real;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "HostelRequired" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "HouseGroup" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "HouseNo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "IsBplFamily" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "LastExamPercentage" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MediumOfInstruction" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MiddleName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MigrationCertNo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MotherName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MotherOccupation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MotherPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "MotherTongue" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Nationality" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "PhotoUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Pincode" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "PlaceOfBirth" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "PreviousClassStudied" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "PreviousSchoolBoard" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "ReasonForLeaving" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Religion" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "SiblingInSchool" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "SiblingsCount" integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "State" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "SubCaste" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "Village" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Students" ADD "WeightKg" real;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "Schools" ADD "UseSharedWhatsApp" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "AadhaarEncrypted" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "AadhaarHash" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "AadhaarLastFour" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "AnnualFamilyIncome" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ApplicationId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ApprovedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ApprovedBy" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "BirthCertPath" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "BloodGroup" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Category" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ChildFirstName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ChildLastName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ChildMiddleName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ChronicIllness" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "City" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "CurrentMedication" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "DateOfBirth" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "DisabilityCertNo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "DisabilityType" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "District" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "EmergencyContactName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "EmergencyContactPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "EmergencyContactRelation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "FatherName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "FatherOccupation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "FatherPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "FatherQualification" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Gender" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "GuardianEmail" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "HasDisability" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "HeightCm" real;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "HouseNo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "IpAddress" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "IsHoneypotFlagged" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "LastExamPercentage" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "MotherName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "MotherOccupation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "MotherPhone" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "MotherTongue" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Nationality" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PhotoPath" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Pincode" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PlaceOfBirth" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PreviousBoard" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PreviousClassStudied" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PreviousSchoolName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PreviousTcDate" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "PreviousTcNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "ReasonForLeaving" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Religion" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "Source" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "State" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "StreetOrVillage" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "TcDocPath" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "UserAgent" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    ALTER TABLE "AdmissionInquiries" ADD "WeightKg" real;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE TABLE "AnnualSchoolPlans" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "AcademicYear" text NOT NULL,
        "Title" text NOT NULL,
        "Status" text NOT NULL,
        "RawAiResponse" text,
        "PromptCustomizations" text,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "CreatedBy" text,
        CONSTRAINT "PK_AnnualSchoolPlans" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AnnualSchoolPlans_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE TABLE "SchoolPlanEvents" (
        "Id" uuid NOT NULL,
        "PlanId" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "MonthNumber" integer NOT NULL,
        "MonthName" text NOT NULL,
        "Title" text NOT NULL,
        "EventType" text NOT NULL,
        "StartDate" timestamp with time zone NOT NULL,
        "EndDate" timestamp with time zone,
        "TargetAudience" text,
        "Description" text,
        "IsWhatsAppNotified" boolean NOT NULL,
        "WhatsAppNotifiedAt" timestamp with time zone,
        CONSTRAINT "PK_SchoolPlanEvents" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SchoolPlanEvents_AnnualSchoolPlans_PlanId" FOREIGN KEY ("PlanId") REFERENCES "AnnualSchoolPlans" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SchoolPlanEvents_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE INDEX "IX_AdmissionInquiries_ApplicationId" ON "AdmissionInquiries" ("ApplicationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE INDEX "IX_AdmissionInquiries_SchoolId_FatherPhone_TargetClass" ON "AdmissionInquiries" ("SchoolId", "FatherPhone", "TargetClass");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE INDEX "IX_AnnualSchoolPlans_SchoolId_AcademicYear" ON "AnnualSchoolPlans" ("SchoolId", "AcademicYear");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE INDEX "IX_SchoolPlanEvents_PlanId" ON "SchoolPlanEvents" ("PlanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    CREATE INDEX "IX_SchoolPlanEvents_SchoolId_StartDate" ON "SchoolPlanEvents" ("SchoolId", "StartDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907170904_QrAdmissionAndFullForm') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260907170904_QrAdmissionAndFullForm', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907181337_AddDataImportLogs') THEN
    CREATE TABLE "DataImportLogs" (
        "Id" uuid NOT NULL,
        "SchoolId" uuid NOT NULL,
        "ImportType" text NOT NULL,
        "SourceName" text NOT NULL,
        "TotalRecords" integer NOT NULL,
        "SuccessCount" integer NOT NULL,
        "ErrorCount" integer NOT NULL,
        "Status" text NOT NULL,
        "ErrorSummary" text,
        "ImportedAt" timestamp with time zone NOT NULL,
        "ImportedBy" text,
        CONSTRAINT "PK_DataImportLogs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_DataImportLogs_Schools_SchoolId" FOREIGN KEY ("SchoolId") REFERENCES "Schools" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907181337_AddDataImportLogs') THEN
    CREATE INDEX "IX_DataImportLogs_SchoolId" ON "DataImportLogs" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260907181337_AddDataImportLogs') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260907181337_AddDataImportLogs', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "BirthCertificateNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "BoardRegistrationNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "CasteCertificateNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "IdentificationMark" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "InitialAdmissionClass" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "LeavingClass" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApprovedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverOneAction" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverOneActionAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverOneId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverOneNote" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverTwoAction" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverTwoActionAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverTwoId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ApproverTwoNote" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "AttachmentUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "CancellationReason" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "CancelledAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "ContactDuringLeave" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "CurrentApprovalLevel" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "EmployeeCode" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "EmployeeId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "EmployeeName" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "FinalApprovedById" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "HandoverNotes" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "HandoverTo" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "LeavePolicyId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "LeaveTypeName" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD "TotalCalendarDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "AccrualFrequency" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "AccrualUnitsPerPeriod" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "AllowHalfDay" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "CarryForwardExpiryMonths" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "ColorHex" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "CreatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "Description" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "GenderEligibility" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "JoiningCutoffDay" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "JoiningRule" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "MaxApplicationsPerYear" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "MaxConsecutiveDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "MaxEncashmentDays" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "MinAttachmentAfterDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "MinimumServiceDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "NoticePeriodDays" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "ProbationEligible" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "SandwichRuleApplied" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "SortOrder" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "StaffTypeEligibilityJson" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeavePolicies" ADD "UpdatedAt" timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperNotes" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUploadedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUploadedByTeacherId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Exams" ADD COLUMN IF NOT EXISTS "QuestionPaperUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
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
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN

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

    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_LeaveRequests_LeavePolicyId" ON "LeaveRequests" ("LeavePolicyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_Exams_QuestionPaperUploadedByTeacherId" ON "Exams" ("QuestionPaperUploadedByTeacherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_HolidayCalendars_SchoolId" ON "HolidayCalendars" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_LeaveBalances_LeavePolicyId" ON "LeaveBalances" ("LeavePolicyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_LeaveBalances_SchoolId" ON "LeaveBalances" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_LeaveTransactions_LeavePolicyId" ON "LeaveTransactions" ("LeavePolicyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    CREATE INDEX "IX_LeaveTransactions_SchoolId" ON "LeaveTransactions" ("SchoolId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Teachers_QuestionPaperUploadedByTeacherId" FOREIGN KEY ("QuestionPaperUploadedByTeacherId") REFERENCES "Teachers" ("UserId") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    ALTER TABLE "LeaveRequests" ADD CONSTRAINT "FK_LeaveRequests_LeavePolicies_LeavePolicyId" FOREIGN KEY ("LeavePolicyId") REFERENCES "LeavePolicies" ("Id");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911165141_AddEnterpriseHRMAndHolidayCalendar') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911165141_AddEnterpriseHRMAndHolidayCalendar', '10.0.8');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911183418_AddLeaveForwardingWorkflow') THEN
    ALTER TABLE "LeaveRequests" ADD "ForwardNote" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911183418_AddLeaveForwardingWorkflow') THEN
    ALTER TABLE "LeaveRequests" ADD "ForwardedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911183418_AddLeaveForwardingWorkflow') THEN
    ALTER TABLE "LeaveRequests" ADD "ForwardedById" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911183418_AddLeaveForwardingWorkflow') THEN
    ALTER TABLE "LeaveRequests" ADD "ForwardedByName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260911183418_AddLeaveForwardingWorkflow') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260911183418_AddLeaveForwardingWorkflow', '10.0.8');
    END IF;
END $EF$;
COMMIT;

