using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveForwardingWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ForwardNote",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ForwardedAt",
                table: "LeaveRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ForwardedById",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ForwardedByName",
                table: "LeaveRequests",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ForwardNote",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ForwardedAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ForwardedById",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ForwardedByName",
                table: "LeaveRequests");
        }
    }
}
