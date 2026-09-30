using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduVault.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class QrAdmissionAndFullForm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AadhaarNumber",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AdmissionDate",
                table: "Students",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdmissionNumber",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdmissionSource",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnnualFamilyIncome",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusRoute",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusStop",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChronicIllness",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentMedication",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisabilityCertNo",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisabilityType",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactRelation",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherAadhaar",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherEmail",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherName",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherOccupation",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherPhone",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherQualification",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeeCategory",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasDisability",
                table: "Students",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<float>(
                name: "HeightCm",
                table: "Students",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HostelRequired",
                table: "Students",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "HouseGroup",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HouseNo",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBplFamily",
                table: "Students",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LastExamPercentage",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediumOfInstruction",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MiddleName",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MigrationCertNo",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherName",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherOccupation",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherPhone",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherTongue",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceOfBirth",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousClassStudied",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousSchoolBoard",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReasonForLeaving",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Religion",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiblingInSchool",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SiblingsCount",
                table: "Students",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubCaste",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Village",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "WeightKg",
                table: "Students",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseSharedWhatsApp",
                table: "Schools",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AadhaarEncrypted",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AadhaarHash",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AadhaarLastFour",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnnualFamilyIncome",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApplicationId",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "AdmissionInquiries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BirthCertPath",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BloodGroup",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChildFirstName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChildLastName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChildMiddleName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChronicIllness",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentMedication",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DateOfBirth",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisabilityCertNo",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisabilityType",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactRelation",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherOccupation",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherPhone",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherQualification",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuardianEmail",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasDisability",
                table: "AdmissionInquiries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<float>(
                name: "HeightCm",
                table: "AdmissionInquiries",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HouseNo",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHoneypotFlagged",
                table: "AdmissionInquiries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LastExamPercentage",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherOccupation",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherPhone",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherTongue",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoPath",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceOfBirth",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousBoard",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousClassStudied",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousSchoolName",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousTcDate",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousTcNumber",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReasonForLeaving",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Religion",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "AdmissionInquiries",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StreetOrVillage",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TcDocPath",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "WeightKg",
                table: "AdmissionInquiries",
                type: "real",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AnnualSchoolPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYear = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RawAiResponse = table.Column<string>(type: "text", nullable: true),
                    PromptCustomizations = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnualSchoolPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnnualSchoolPlans_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });


            migrationBuilder.CreateTable(
                name: "SchoolPlanEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthNumber = table.Column<int>(type: "integer", nullable: false),
                    MonthName = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    EventType = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TargetAudience = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsWhatsAppNotified = table.Column<bool>(type: "boolean", nullable: false),
                    WhatsAppNotifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolPlanEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolPlanEvents_AnnualSchoolPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "AnnualSchoolPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SchoolPlanEvents_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdmissionInquiries_ApplicationId",
                table: "AdmissionInquiries",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_AdmissionInquiries_SchoolId_FatherPhone_TargetClass",
                table: "AdmissionInquiries",
                columns: new[] { "SchoolId", "FatherPhone", "TargetClass" });

            migrationBuilder.CreateIndex(
                name: "IX_AnnualSchoolPlans_SchoolId_AcademicYear",
                table: "AnnualSchoolPlans",
                columns: new[] { "SchoolId", "AcademicYear" });

            migrationBuilder.CreateIndex(
                name: "IX_SchoolPlanEvents_PlanId",
                table: "SchoolPlanEvents",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolPlanEvents_SchoolId_StartDate",
                table: "SchoolPlanEvents",
                columns: new[] { "SchoolId", "StartDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SchoolPlanEvents");

            migrationBuilder.DropTable(
                name: "AnnualSchoolPlans");

            migrationBuilder.DropIndex(
                name: "IX_AdmissionInquiries_ApplicationId",
                table: "AdmissionInquiries");

            migrationBuilder.DropIndex(
                name: "IX_AdmissionInquiries_SchoolId_FatherPhone_TargetClass",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "AadhaarNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AdmissionDate",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AdmissionNumber",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AdmissionSource",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "AnnualFamilyIncome",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BusRoute",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "BusStop",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ChronicIllness",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "CurrentMedication",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "DisabilityCertNo",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "DisabilityType",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "District",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "EmergencyContactRelation",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherAadhaar",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherEmail",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherOccupation",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherPhone",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FatherQualification",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "FeeCategory",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HasDisability",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HostelRequired",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HouseGroup",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "HouseNo",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IsBplFamily",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "LastExamPercentage",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MediumOfInstruction",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MiddleName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MigrationCertNo",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherOccupation",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherPhone",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MotherTongue",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Pincode",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PlaceOfBirth",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PreviousClassStudied",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PreviousSchoolBoard",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ReasonForLeaving",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Religion",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "SiblingInSchool",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "SiblingsCount",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "SubCaste",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Village",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "UseSharedWhatsApp",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "AadhaarEncrypted",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "AadhaarHash",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "AadhaarLastFour",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "AnnualFamilyIncome",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ApplicationId",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "BirthCertPath",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "BloodGroup",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ChildFirstName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ChildLastName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ChildMiddleName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ChronicIllness",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "City",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "CurrentMedication",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "DisabilityCertNo",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "DisabilityType",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "District",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "EmergencyContactRelation",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "FatherName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "FatherOccupation",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "FatherPhone",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "FatherQualification",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "GuardianEmail",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "HasDisability",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "HouseNo",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "IsHoneypotFlagged",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "LastExamPercentage",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "MotherName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "MotherOccupation",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "MotherPhone",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "MotherTongue",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PhotoPath",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Pincode",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PlaceOfBirth",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousBoard",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousClassStudied",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousSchoolName",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousTcDate",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousTcNumber",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ReasonForLeaving",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Religion",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "State",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "StreetOrVillage",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "TcDocPath",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "AdmissionInquiries");
        }
    }
}
