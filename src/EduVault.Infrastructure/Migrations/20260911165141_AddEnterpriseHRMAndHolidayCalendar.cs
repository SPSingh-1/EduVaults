using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEnterpriseHRMAndHolidayCalendar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"BirthCertificateNumber\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"BoardRegistrationNumber\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"CasteCertificateNumber\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"IdentificationMark\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"InitialAdmissionClass\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Students\" ADD COLUMN IF NOT EXISTS \"LeavingClass\" text;");

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "LeaveRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverOneAction",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApproverOneActionAt",
                table: "LeaveRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverOneId",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverOneNote",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverTwoAction",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApproverTwoActionAt",
                table: "LeaveRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverTwoId",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproverTwoNote",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "LeaveRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactDuringLeave",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentApprovalLevel",
                table: "LeaveRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeCode",
                table: "LeaveRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "EmployeeId",
                table: "LeaveRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeName",
                table: "LeaveRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FinalApprovedById",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverNotes",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverTo",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LeavePolicyId",
                table: "LeaveRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LeaveTypeName",
                table: "LeaveRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "TotalCalendarDays",
                table: "LeaveRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AccrualFrequency",
                table: "LeavePolicies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "AccrualUnitsPerPeriod",
                table: "LeavePolicies",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "AllowHalfDay",
                table: "LeavePolicies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CarryForwardExpiryMonths",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ColorHex",
                table: "LeavePolicies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "LeavePolicies",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "LeavePolicies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GenderEligibility",
                table: "LeavePolicies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "JoiningCutoffDay",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "JoiningRule",
                table: "LeavePolicies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "MaxApplicationsPerYear",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxConsecutiveDays",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxEncashmentDays",
                table: "LeavePolicies",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "MinAttachmentAfterDays",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinimumServiceDays",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "NoticePeriodDays",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "ProbationEligible",
                table: "LeavePolicies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SandwichRuleApplied",
                table: "LeavePolicies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "LeavePolicies",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "StaffTypeEligibilityJson",
                table: "LeavePolicies",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "LeavePolicies",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.Sql("ALTER TABLE \"Exams\" ADD COLUMN IF NOT EXISTS \"QuestionPaperNotes\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Exams\" ADD COLUMN IF NOT EXISTS \"QuestionPaperUploadedAt\" timestamp with time zone;");
            migrationBuilder.Sql("ALTER TABLE \"Exams\" ADD COLUMN IF NOT EXISTS \"QuestionPaperUploadedByTeacherId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"Exams\" ADD COLUMN IF NOT EXISTS \"QuestionPaperUrl\" text;");

            migrationBuilder.CreateTable(
                name: "HolidayCalendars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HolidayType = table.Column<string>(type: "text", nullable: false),
                    IsOptional = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsRecurringYearly = table.Column<bool>(type: "boolean", nullable: false),
                    AcademicYear = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HolidayCalendars", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HolidayCalendars_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaveBalances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeavePolicyId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveTypeCode = table.Column<string>(type: "text", nullable: false),
                    AcademicYear = table.Column<int>(type: "integer", nullable: false),
                    OpeningBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAccrued = table.Column<decimal>(type: "numeric", nullable: false),
                    CarryForward = table.Column<decimal>(type: "numeric", nullable: false),
                    ManualCredits = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAvailable = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    PendingUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    RemainingBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    LastCalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveBalances_LeavePolicies_LeavePolicyId",
                        column: x => x.LeavePolicyId,
                        principalTable: "LeavePolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LeaveBalances_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaveTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeavePolicyId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveTypeCode = table.Column<string>(type: "text", nullable: false),
                    TransactionType = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    BalanceBefore = table.Column<decimal>(type: "numeric", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric", nullable: false),
                    LeaveRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    ProcessedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    AcademicYear = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveTransactions_LeavePolicies_LeavePolicyId",
                        column: x => x.LeavePolicyId,
                        principalTable: "LeavePolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LeaveTransactions_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""PrintTemplates"" (
    ""Id"" uuid NOT NULL,
    ""SchoolId"" uuid,
    ""DocumentType"" character varying(50) NOT NULL,
    ""TemplateName"" text NOT NULL,
    ""Description"" text NOT NULL,
    ""PaperSize"" character varying(30) NOT NULL,
    ""Orientation"" text NOT NULL,
    ""LayoutConfigJson"" text NOT NULL,
    ""HtmlContent"" text NOT NULL,
    ""WasAiGenerated"" boolean NOT NULL,
    ""AiPromptUsed"" text NOT NULL,
    ""IsSuperAdminMaster"" boolean NOT NULL,
    ""IsDefault"" boolean NOT NULL,
    ""IsActive"" boolean NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""UpdatedAt"" timestamp with time zone,
    CONSTRAINT ""PK_PrintTemplates"" PRIMARY KEY (""Id""),
    CONSTRAINT ""FK_PrintTemplates_Schools_SchoolId"" FOREIGN KEY (""SchoolId"") REFERENCES ""Schools"" (""Id"") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ""IX_PrintTemplates_SchoolId_DocumentType_IsDefault"" ON ""PrintTemplates"" (""SchoolId"", ""DocumentType"", ""IsDefault"");
");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_LeavePolicyId",
                table: "LeaveRequests",
                column: "LeavePolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_QuestionPaperUploadedByTeacherId",
                table: "Exams",
                column: "QuestionPaperUploadedByTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_HolidayCalendars_SchoolId",
                table: "HolidayCalendars",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveBalances_LeavePolicyId",
                table: "LeaveBalances",
                column: "LeavePolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveBalances_SchoolId",
                table: "LeaveBalances",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveTransactions_LeavePolicyId",
                table: "LeaveTransactions",
                column: "LeavePolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveTransactions_SchoolId",
                table: "LeaveTransactions",
                column: "SchoolId");



            migrationBuilder.AddForeignKey(
                name: "FK_Exams_Teachers_QuestionPaperUploadedByTeacherId",
                table: "Exams",
                column: "QuestionPaperUploadedByTeacherId",
                principalTable: "Teachers",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRequests_LeavePolicies_LeavePolicyId",
                table: "LeaveRequests",
                column: "LeavePolicyId",
                principalTable: "LeavePolicies",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Exams_Teachers_QuestionPaperUploadedByTeacherId",
                table: "Exams");

            migrationBuilder.DropForeignKey(
                name: "FK_LeaveRequests_LeavePolicies_LeavePolicyId",
                table: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "HolidayCalendars");

            migrationBuilder.DropTable(
                name: "LeaveBalances");

            migrationBuilder.DropTable(
                name: "LeaveTransactions");

            migrationBuilder.DropTable(
                name: "PrintTemplates");

            migrationBuilder.DropIndex(
                name: "IX_LeaveRequests_LeavePolicyId",
                table: "LeaveRequests");

            migrationBuilder.DropIndex(
                name: "IX_Exams_QuestionPaperUploadedByTeacherId",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "BirthCertificateNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BoardRegistrationNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CasteCertificateNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IdentificationMark",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "InitialAdmissionClass",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "LeavingClass",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverOneAction",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverOneActionAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverOneId",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverOneNote",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverTwoAction",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverTwoActionAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverTwoId",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ApproverTwoNote",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ContactDuringLeave",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "CurrentApprovalLevel",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "EmployeeCode",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "EmployeeName",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "FinalApprovedById",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "HandoverNotes",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "HandoverTo",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "LeavePolicyId",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "LeaveTypeName",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "TotalCalendarDays",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AccrualFrequency",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "AccrualUnitsPerPeriod",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "AllowHalfDay",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "CarryForwardExpiryMonths",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "ColorHex",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "GenderEligibility",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "JoiningCutoffDay",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "JoiningRule",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "MaxApplicationsPerYear",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "MaxConsecutiveDays",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "MaxEncashmentDays",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "MinAttachmentAfterDays",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "MinimumServiceDays",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "NoticePeriodDays",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "ProbationEligible",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "SandwichRuleApplied",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "StaffTypeEligibilityJson",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "LeavePolicies");

            migrationBuilder.DropColumn(
                name: "QuestionPaperNotes",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "QuestionPaperUploadedAt",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "QuestionPaperUploadedByTeacherId",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "QuestionPaperUrl",
                table: "Exams");
        }
    }
}
