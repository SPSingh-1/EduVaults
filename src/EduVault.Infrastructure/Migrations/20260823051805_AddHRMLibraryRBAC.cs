using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHRMLibraryRBAC : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasAccountModule",
                table: "Schools",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasLibraryModule",
                table: "Schools",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AccountManagers",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<string>(type: "text", nullable: false),
                    Designation = table.Column<string>(type: "text", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountManagers", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_AccountManagers_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AccountManagers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Books",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    ISBN = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Author = table.Column<string>(type: "text", nullable: false),
                    Publisher = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    TotalCopies = table.Column<int>(type: "integer", nullable: false),
                    AvailableCopies = table.Column<int>(type: "integer", nullable: false),
                    ShelfLocation = table.Column<string>(type: "text", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Books", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Books_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VoucherNumber = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Expenses_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaveQuotas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYear = table.Column<int>(type: "integer", nullable: false),
                    CasualLeaveAllotted = table.Column<int>(type: "integer", nullable: false),
                    SickLeaveAllotted = table.Column<int>(type: "integer", nullable: false),
                    EarnedLeaveAllotted = table.Column<int>(type: "integer", nullable: false),
                    MaternityLeaveAllotted = table.Column<int>(type: "integer", nullable: false),
                    CasualLeaveUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    SickLeaveUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    EarnedLeaveUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    MaternityLeaveUsed = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveQuotas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveQuotas_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveType = table.Column<string>(type: "text", nullable: false),
                    DayType = table.Column<string>(type: "text", nullable: false),
                    HalfDaySession = table.Column<string>(type: "text", nullable: true),
                    FromDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ToDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalDays = table.Column<decimal>(type: "numeric", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RejectionNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveRequests_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LibrarySettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    FinePerDay = table.Column<decimal>(type: "numeric", nullable: false),
                    MaxIssueDays = table.Column<int>(type: "integer", nullable: false),
                    MaxBooksPerMember = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibrarySettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibrarySettings_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PageDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageKey = table.Column<string>(type: "text", nullable: false),
                    PageName = table.Column<string>(type: "text", nullable: false),
                    Module = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    Route = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SalaryRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    GrossSalary = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalWorkingDays = table.Column<int>(type: "integer", nullable: false),
                    PresentDays = table.Column<decimal>(type: "numeric", nullable: false),
                    AbsentDays = table.Column<decimal>(type: "numeric", nullable: false),
                    HalfDays = table.Column<decimal>(type: "numeric", nullable: false),
                    LeaveDaysUsed = table.Column<decimal>(type: "numeric", nullable: false),
                    LwpDays = table.Column<decimal>(type: "numeric", nullable: false),
                    PerDayRate = table.Column<decimal>(type: "numeric", nullable: false),
                    BasicEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    RuleBasedAllowances = table.Column<decimal>(type: "numeric", nullable: false),
                    RuleBasedDeductions = table.Column<decimal>(type: "numeric", nullable: false),
                    ManualAllowances = table.Column<decimal>(type: "numeric", nullable: false),
                    ManualDeductions = table.Column<decimal>(type: "numeric", nullable: false),
                    LwpDeduction = table.Column<decimal>(type: "numeric", nullable: false),
                    NetPay = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PaidOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryRecords_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalaryRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    CalculationMode = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<decimal>(type: "numeric", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryRules_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LibraryTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberType = table.Column<string>(type: "text", nullable: false),
                    MemberName = table.Column<string>(type: "text", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    FineAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    FinePaid = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryTransactions_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LibraryTransactions_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SchoolRolePermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleName = table.Column<string>(type: "text", nullable: false),
                    PageDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CanView = table.Column<bool>(type: "boolean", nullable: false),
                    CanCreate = table.Column<bool>(type: "boolean", nullable: false),
                    CanEdit = table.Column<bool>(type: "boolean", nullable: false),
                    CanDelete = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolRolePermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolRolePermissions_PageDefinitions_PageDefinitionId",
                        column: x => x.PageDefinitionId,
                        principalTable: "PageDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SchoolRolePermissions_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountManagers_SchoolId",
                table: "AccountManagers",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Books_SchoolId",
                table: "Books",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_SchoolId",
                table: "Expenses",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveQuotas_SchoolId_TeacherUserId_AcademicYear",
                table: "LeaveQuotas",
                columns: new[] { "SchoolId", "TeacherUserId", "AcademicYear" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_SchoolId",
                table: "LeaveRequests",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_LibrarySettings_SchoolId",
                table: "LibrarySettings",
                column: "SchoolId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LibraryTransactions_BookId",
                table: "LibraryTransactions",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_LibraryTransactions_SchoolId",
                table: "LibraryTransactions",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryRecords_SchoolId_TeacherUserId_Month_Year",
                table: "SalaryRecords",
                columns: new[] { "SchoolId", "TeacherUserId", "Month", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalaryRules_SchoolId",
                table: "SalaryRules",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolRolePermissions_PageDefinitionId",
                table: "SchoolRolePermissions",
                column: "PageDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolRolePermissions_SchoolId_RoleName_PageDefinitionId",
                table: "SchoolRolePermissions",
                columns: new[] { "SchoolId", "RoleName", "PageDefinitionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountManagers");

            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "LeaveQuotas");

            migrationBuilder.DropTable(
                name: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "LibrarySettings");

            migrationBuilder.DropTable(
                name: "LibraryTransactions");

            migrationBuilder.DropTable(
                name: "SalaryRecords");

            migrationBuilder.DropTable(
                name: "SalaryRules");

            migrationBuilder.DropTable(
                name: "SchoolRolePermissions");

            migrationBuilder.DropTable(
                name: "Books");

            migrationBuilder.DropTable(
                name: "PageDefinitions");

            migrationBuilder.DropColumn(
                name: "HasAccountModule",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "HasLibraryModule",
                table: "Schools");
        }
    }
}
