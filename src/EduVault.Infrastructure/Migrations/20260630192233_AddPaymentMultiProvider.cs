using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentMultiProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CashlessInstructions",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayPalClientId",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayPalClientSecret",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProvider",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeMerchantId",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeSaltIndex",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhonePeSaltKey",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripePublishableKey",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSecretKey",
                table: "Schools",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CashlessInstructions",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PayPalClientId",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PayPalClientSecret",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PaymentProvider",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PhonePeMerchantId",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PhonePeSaltIndex",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PhonePeSaltKey",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "StripePublishableKey",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "StripeSecretKey",
                table: "Schools");
        }
    }
}
