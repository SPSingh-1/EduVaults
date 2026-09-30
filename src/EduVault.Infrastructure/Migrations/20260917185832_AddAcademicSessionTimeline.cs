using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicSessionTimeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentAcademicSession",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextAcademicSession",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PromotionOpensDate",
                table: "Schools",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionEndDate",
                table: "Schools",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionStartDate",
                table: "Schools",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentAcademicSession",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "NextAcademicSession",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PromotionOpensDate",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "SessionEndDate",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "SessionStartDate",
                table: "Schools");
        }
    }
}
