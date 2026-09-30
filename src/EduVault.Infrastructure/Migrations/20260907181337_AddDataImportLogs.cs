using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDataImportLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DataImportLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImportType = table.Column<string>(type: "text", nullable: false),
                    SourceName = table.Column<string>(type: "text", nullable: false),
                    TotalRecords = table.Column<int>(type: "integer", nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    ErrorCount = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ErrorSummary = table.Column<string>(type: "text", nullable: true),
                    ImportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ImportedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataImportLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DataImportLogs_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DataImportLogs_SchoolId",
                table: "DataImportLogs",
                column: "SchoolId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DataImportLogs");
        }
    }
}
