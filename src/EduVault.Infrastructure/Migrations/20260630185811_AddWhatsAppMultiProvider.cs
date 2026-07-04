using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppMultiProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomProviderApiKey",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomProviderFromNumber",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomProviderUrl",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaAccessToken",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaPhoneNumberId",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaWhatsAppFromNumber",
                table: "Schools",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppProvider",
                table: "Schools",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomProviderApiKey",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "CustomProviderFromNumber",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "CustomProviderUrl",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "MetaAccessToken",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "MetaPhoneNumberId",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "MetaWhatsAppFromNumber",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "WhatsAppProvider",
                table: "Schools");
        }
    }
}
