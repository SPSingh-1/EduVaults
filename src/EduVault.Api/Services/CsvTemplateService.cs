using System;
using System.Text;

namespace EduVault.Api.Services
{
    public class CsvTemplateService
    {
        public (byte[] Content, string FileName) GenerateTemplate(string type)
        {
            var normalized = (type ?? "students").Trim().ToLowerInvariant();
            var sb = new StringBuilder();
            string fileName;

            switch (normalized)
            {
                case "students":
                case "student":
                    fileName = "students_import_template.csv";
                    sb.AppendLine("Admission_No,First_Name,Middle_Name,Last_Name,DOB(YYYY-MM-DD),Gender(Male/Female/Other),Category(GEN/OBC/SC/ST/EWS),Class,Section,Roll_No,Father_Name,Father_Phone,Mother_Name,Mother_Phone,Guardian_Phone,Email,Address,City,State,Pincode,Blood_Group,Aadhaar_No,Previous_School,TC_No,Fee_Category");
                    sb.AppendLine("STU-2026-001,Aarav,,Sharma,2014-05-15,Male,GEN,Class 6,Section A,1,Ramesh Sharma,9876543210,Sunita Sharma,9876543211,9876543210,aarav.sharma@example.com,123 Civil Lines,Delhi,Delhi,110054,B+,123456789012,KV Janakpuri,TC-2025-101,General");
                    sb.AppendLine("STU-2026-002,Priya,Kumari,Verma,2015-08-20,Female,OBC,Class 5,Section B,2,Sunil Verma,9811223344,Meena Verma,9811223345,9811223344,priya.verma@example.com,45 Model Town,Delhi,Delhi,110009,O+,987654321098,Delhi Public School,TC-2025-202,General");
                    break;

                case "teachers":
                case "teacher":
                    fileName = "teachers_import_template.csv";
                    sb.AppendLine("Employee_Code,First_Name,Last_Name,DOB(YYYY-MM-DD),Gender(Male/Female),Phone,Email,Designation,Department,Subjects,Qualification,Date_Of_Joining(YYYY-MM-DD),Base_Salary");
                    sb.AppendLine("EMP-T-101,Rajesh,Gupta,1985-04-12,Male,9876501234,rajesh.gupta@school.edu,Senior Teacher,Mathematics,Algebra;Geometry,M.Sc. B.Ed,2020-07-01,48000");
                    sb.AppendLine("EMP-T-102,Ananya,Iyer,1990-11-25,Female,9876505678,ananya.iyer@school.edu,TGT,Science,Physics;Chemistry,B.Sc. B.Ed,2022-04-15,42000");
                    break;

                case "fees":
                case "fee":
                    fileName = "fees_import_template.csv";
                    sb.AppendLine("Student_Admission_No,Class,Fee_Structure_Name,Amount,Due_Date(YYYY-MM-DD),Paid_Amount,Payment_Method");
                    sb.AppendLine("STU-2026-001,Class 6,Tuition Fee Q1,12500,2026-04-10,12500,Online UPI");
                    sb.AppendLine("STU-2026-002,Class 5,Tuition Fee Q1,11000,2026-04-10,0,Cash");
                    break;

                case "classes":
                case "class":
                    fileName = "classes_import_template.csv";
                    sb.AppendLine("Grade,Section,Level,Room,Capacity,Subjects");
                    sb.AppendLine("Class 6,Section A,Middle School,Room 201,40,Mathematics;Science;English;Hindi;Social Science");
                    sb.AppendLine("Class 7,Section A,Middle School,Room 202,40,Mathematics;Science;English;Hindi;Social Science");
                    break;

                default:
                    fileName = "data_import_template.csv";
                    sb.AppendLine("Code,Name,Category,Value,Notes");
                    sb.AppendLine("SAMPLE-01,Sample Item,General,100,Sample row");
                    break;
            }

            return (Encoding.UTF8.GetBytes(sb.ToString()), fileName);
        }
    }
}
