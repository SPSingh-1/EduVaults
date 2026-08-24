using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardWidgetsAndDynamicMenus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PageDefinitions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<bool>(
                name: "IsCustom",
                table: "PageDefinitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TargetRole",
                table: "PageDefinitions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "DashboardWidgetDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WidgetKey = table.Column<string>(type: "text", nullable: false),
                    DefaultTitle = table.Column<string>(type: "text", nullable: false),
                    MetricSource = table.Column<string>(type: "text", nullable: false),
                    DefaultTimeRange = table.Column<string>(type: "text", nullable: false),
                    ChartType = table.Column<string>(type: "text", nullable: false),
                    ColorTheme = table.Column<string>(type: "text", nullable: false),
                    IconName = table.Column<string>(type: "text", nullable: false),
                    TargetRole = table.Column<string>(type: "text", nullable: false),
                    IsCustom = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DashboardWidgetDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchoolDashboardWidgets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    WidgetKey = table.Column<string>(type: "text", nullable: false),
                    CustomTitle = table.Column<string>(type: "text", nullable: true),
                    TimeRange = table.Column<string>(type: "text", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolDashboardWidgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolDashboardWidgets_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgetDefinitions_WidgetKey",
                table: "DashboardWidgetDefinitions",
                column: "WidgetKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchoolDashboardWidgets_SchoolId_Role_WidgetKey",
                table: "SchoolDashboardWidgets",
                columns: new[] { "SchoolId", "Role", "WidgetKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DashboardWidgetDefinitions");

            migrationBuilder.DropTable(
                name: "SchoolDashboardWidgets");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PageDefinitions");

            migrationBuilder.DropColumn(
                name: "IsCustom",
                table: "PageDefinitions");

            migrationBuilder.DropColumn(
                name: "TargetRole",
                table: "PageDefinitions");
        }
    }
}
