using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGlobalPaymentCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CashlessInstructions",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayPalClientId",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayPalClientSecret",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProvider",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeMerchantId",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeSaltIndex",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeSaltKey",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RazorpayKeyId",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RazorpayKeySecret",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripePublishableKey",
                table: "PlatformSettings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSecretKey",
                table: "PlatformSettings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CashlessInstructions",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PayPalClientId",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PayPalClientSecret",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PaymentProvider",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PhonePeMerchantId",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PhonePeSaltIndex",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "PhonePeSaltKey",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "RazorpayKeyId",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "RazorpayKeySecret",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "StripePublishableKey",
                table: "PlatformSettings");

            migrationBuilder.DropColumn(
                name: "StripeSecretKey",
                table: "PlatformSettings");
        }
    }
}
