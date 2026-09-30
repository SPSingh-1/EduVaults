using System;
using System.IO;
using System.Text;
using Xunit;
using EduVault.Api.Services;

namespace EduVault.Tests
{
    public class SmartDataImportTests
    {
        [Fact]
        public void CsvTemplateService_Generates_Valid_Student_And_Teacher_Templates()
        {
            var service = new CsvTemplateService();

            var (studentBytes, studentFile) = service.GenerateTemplate("students");
            var studentContent = Encoding.UTF8.GetString(studentBytes);
            Assert.Equal("students_import_template.csv", studentFile);
            Assert.Contains("Admission_No", studentContent);
            Assert.Contains("First_Name", studentContent);
            Assert.Contains("DOB", studentContent);

            var (teacherBytes, teacherFile) = service.GenerateTemplate("teachers");
            var teacherContent = Encoding.UTF8.GetString(teacherBytes);
            Assert.Equal("teachers_import_template.csv", teacherFile);
            Assert.Contains("Employee_Code", teacherContent);
            Assert.Contains("Designation", teacherContent);
        }

        [Fact]
        public void SmartCsvParserService_Accurately_Maps_Hindi_And_UDISE_Columns()
        {
            var parser = new SmartCsvParserService();

            var csvData = @"Vidyarthi Naam,Kaksha,Kramank,Janam Tithi,Doorbhash,Pata
Rohan Verma,Class 6,12,2014-06-10,9876543210,12 Civil Lines Delhi
Ananya Sen,Class 6,13,2014-09-18,9811223344,44 Mall Road";

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csvData));
            var result = parser.ParseAndMapCsv(stream, "students");

            Assert.Equal(2, result.TotalRows);
            Assert.Equal(2, result.ValidRowCount);
            Assert.Equal(0, result.InvalidRowCount);

            // Verify AI/Heuristic Synonyms Matched
            Assert.True(result.ColumnMappings.ContainsKey("Vidyarthi Naam"));
            Assert.Equal("FirstName", result.ColumnMappings["Vidyarthi Naam"]);

            Assert.True(result.ColumnMappings.ContainsKey("Kaksha"));
            Assert.Equal("Class", result.ColumnMappings["Kaksha"]);

            Assert.True(result.ColumnMappings.ContainsKey("Janam Tithi"));
            Assert.Equal("DateOfBirth", result.ColumnMappings["Janam Tithi"]);

            Assert.True(result.ColumnMappings.ContainsKey("Doorbhash"));
            Assert.Equal("FatherPhone", result.ColumnMappings["Doorbhash"]);
        }

        [Fact]
        public void SmartCsvParserService_Handles_Quoted_Commas_Correctly()
        {
            var line = "\"Sharma, Rahul\",Class 10,\"Flat 4B, Rajpur Road, Civil Lines\",9876543210";
            var cells = SmartCsvParserService.ParseCsvRow(line);

            Assert.Equal(4, cells.Count);
            Assert.Equal("Sharma, Rahul", cells[0]);
            Assert.Equal("Class 10", cells[1]);
            Assert.Equal("Flat 4B, Rajpur Road, Civil Lines", cells[2]);
            Assert.Equal("9876543210", cells[3]);
        }

        [Fact]
        public void AiPlannerService_Heuristic_Engine_Generates_12_Month_Calendar()
        {
            var events = AiPlannerService.GenerateHeuristicCalendar("2026-27", "CBSE");

            Assert.NotNull(events);
            Assert.True(events.Count >= 20, "Should generate comprehensive events across the academic session");

            // Must span April through March
            Assert.Contains(events, e => e.MonthName == "April");
            Assert.Contains(events, e => e.MonthName == "September" && e.EventType == "Exam");
            Assert.Contains(events, e => e.MonthName == "November" && e.EventType == "Sports");
            Assert.Contains(events, e => e.MonthName == "March" && e.EventType == "Exam");
        }
    }
}
