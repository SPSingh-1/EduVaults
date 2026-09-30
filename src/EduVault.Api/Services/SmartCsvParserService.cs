using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace EduVault.Api.Services
{
    public class CsvPreviewResult
    {
        public List<string> OriginalHeaders { get; set; } = new();
        public Dictionary<string, string> ColumnMappings { get; set; } = new(); // Original Header -> Target Field
        public List<Dictionary<string, string>> Rows { get; set; } = new();
        public int TotalRows { get; set; }
        public int ValidRowCount { get; set; }
        public int InvalidRowCount { get; set; }
        public List<string> ValidationErrors { get; set; } = new();
    }

    public class SmartCsvParserService
    {
        // Synonyms dictionary for heuristic AI column matching
        private static readonly Dictionary<string, string[]> StudentSynonyms = new(StringComparer.OrdinalIgnoreCase)
        {
            { "AdmissionNo", new[] { "admission_no", "admission no", "adm no", "admission number", "enrollment", "reg no", "vidyarthi kramank", "sr no", "adm_no" } },
            { "FirstName", new[] { "first_name", "first name", "firstname", "student name", "name", "naam", "vidyarthi naam", "child name", "candidate name" } },
            { "MiddleName", new[] { "middle_name", "middle name", "middlename" } },
            { "LastName", new[] { "last_name", "last name", "lastname", "surname", "kulnaam" } },
            { "DateOfBirth", new[] { "dob", "date of birth", "date_of_birth", "janam tithi", "birth date", "birthdate" } },
            { "Gender", new[] { "gender", "sex", "linga", "ling" } },
            { "Category", new[] { "category", "caste", "jaati", "social category", "varg" } },
            { "Class", new[] { "class", "grade", "std", "standard", "kaksha" } },
            { "Section", new[] { "section", "sec", "vibhag", "part" } },
            { "RollNumber", new[] { "roll_no", "roll no", "roll", "roll number", "kramank" } },
            { "FatherName", new[] { "father_name", "father name", "father", "pita", "pita ji", "parent name", "guardian name" } },
            { "FatherPhone", new[] { "father_phone", "father phone", "phone", "mobile", "contact", "mob", "doorbhash", "primary phone" } },
            { "MotherName", new[] { "mother_name", "mother name", "mother", "mata", "mata ji" } },
            { "MotherPhone", new[] { "mother_phone", "mother phone" } },
            { "GuardianPhone", new[] { "guardian_phone", "guardian phone", "whatsapp", "whatsapp number", "wa_phone" } },
            { "Email", new[] { "email", "student email", "parent email", "mail" } },
            { "Address", new[] { "address", "pata", "residential address", "house no", "street" } },
            { "City", new[] { "city", "shahar", "town" } },
            { "State", new[] { "state", "rajya", "prant" } },
            { "Pincode", new[] { "pincode", "pin", "postal code", "zip", "zipcode" } },
            { "BloodGroup", new[] { "blood_group", "blood group", "blood", "rakt samuh" } },
            { "AadhaarNumber", new[] { "aadhaar_no", "aadhaar", "aadhar", "aadhaar number", "uid", "uidai" } },
            { "PreviousSchool", new[] { "previous_school", "prev school", "last school", "purv vidyalaya" } },
            { "FeeCategory", new[] { "fee_category", "fee category", "fee type", "concession" } }
        };

        private static readonly Dictionary<string, string[]> TeacherSynonyms = new(StringComparer.OrdinalIgnoreCase)
        {
            { "EmployeeCode", new[] { "employee_code", "emp_id", "emp code", "code", "staff id", "adhyapak id" } },
            { "FirstName", new[] { "first_name", "first name", "firstname", "teacher name", "name", "naam" } },
            { "LastName", new[] { "last_name", "last name", "lastname", "surname" } },
            { "DateOfBirth", new[] { "dob", "date of birth", "date_of_birth", "birthdate" } },
            { "Gender", new[] { "gender", "sex", "linga" } },
            { "Phone", new[] { "phone", "mobile", "mob", "contact", "phone number" } },
            { "Email", new[] { "email", "email address", "mail" } },
            { "Designation", new[] { "designation", "post", "title", "role", "pad" } },
            { "Department", new[] { "department", "dept", "vibhag" } },
            { "Subjects", new[] { "subjects", "subject", "vishay" } },
            { "Qualification", new[] { "qualification", "degree", "education" } },
            { "DateOfJoining", new[] { "date_of_joining", "doj", "joining date", "joining" } },
            { "BaseSalary", new[] { "base_salary", "salary", "basic pay", "vetan" } }
        };

        private static readonly Dictionary<string, string[]> FeeSynonyms = new(StringComparer.OrdinalIgnoreCase)
        {
            { "AdmissionNo", new[] { "student_admission_no", "admission_no", "adm no", "student id", "roll", "reg no" } },
            { "Class", new[] { "class", "grade", "std" } },
            { "FeeStructureName", new[] { "fee_structure_name", "fee type", "fee title", "fee_name", "title" } },
            { "Amount", new[] { "amount", "total amount", "fee amount", "rashi" } },
            { "DueDate", new[] { "due_date", "due date", "expiry", "last date" } },
            { "PaidAmount", new[] { "paid_amount", "paid", "amount paid", "jama rashi" } },
            { "PaymentMethod", new[] { "payment_method", "mode", "payment mode", "method" } }
        };

        private static readonly Dictionary<string, string[]> ClassSynonyms = new(StringComparer.OrdinalIgnoreCase)
        {
            { "Grade", new[] { "grade", "class", "kaksha", "std", "standard" } },
            { "Section", new[] { "section", "sec", "vibhag" } },
            { "Level", new[] { "level", "school level", "category" } },
            { "Room", new[] { "room", "room no", "classroom" } },
            { "Capacity", new[] { "capacity", "seats", "max students" } },
            { "Subjects", new[] { "subjects", "subject list", "vishay" } }
        };

        public CsvPreviewResult ParseAndMapCsv(Stream csvStream, string entityType = "students")
        {
            var rawLines = ReadLinesFromStream(csvStream);
            var result = new CsvPreviewResult();

            if (!rawLines.Any())
            {
                result.ValidationErrors.Add("The uploaded file is empty.");
                return result;
            }

            var headerLine = rawLines.First();
            var headers = ParseCsvRow(headerLine);
            result.OriginalHeaders = headers;

            var targetSynonyms = GetSynonymMap(entityType);

            // Heuristic matching
            foreach (var header in headers)
            {
                var cleanH = header.Trim().ToLowerInvariant().Replace("_", " ").Replace("-", " ");
                string? matchedTarget = null;

                foreach (var (targetField, synonyms) in targetSynonyms)
                {
                    if (cleanH.Equals(targetField, StringComparison.OrdinalIgnoreCase))
                    {
                        matchedTarget = targetField;
                        break;
                    }

                    if (synonyms.Any(s => s.Equals(cleanH, StringComparison.OrdinalIgnoreCase) ||
                                          cleanH.Contains(s) ||
                                          s.Contains(cleanH)))
                    {
                        matchedTarget = targetField;
                        break;
                    }
                }

                if (matchedTarget != null)
                {
                    result.ColumnMappings[header] = matchedTarget;
                }
            }

            // Parse data rows
            var dataLines = rawLines.Skip(1).Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
            result.TotalRows = dataLines.Count;

            int rowIdx = 1;
            foreach (var line in dataLines)
            {
                rowIdx++;
                var cells = ParseCsvRow(line);
                var rowDict = new Dictionary<string, string>();

                for (int i = 0; i < headers.Count; i++)
                {
                    var val = i < cells.Count ? cells[i].Trim() : "";
                    rowDict[headers[i]] = val;
                }

                // Basic entity-specific sanity validation
                bool isValid = ValidateRow(rowDict, result.ColumnMappings, entityType, rowIdx, result.ValidationErrors);
                if (isValid)
                {
                    result.ValidRowCount++;
                }
                else
                {
                    result.InvalidRowCount++;
                }

                result.Rows.Add(rowDict);
            }

            return result;
        }

        private static bool ValidateRow(
            Dictionary<string, string> rowDict,
            Dictionary<string, string> mappings,
            string entityType,
            int rowIdx,
            List<string> errors)
        {
            // Reverse lookup mapped values
            string GetMappedVal(string targetField)
            {
                var originalCol = mappings.FirstOrDefault(m => m.Value.Equals(targetField, StringComparison.OrdinalIgnoreCase)).Key;
                if (originalCol != null && rowDict.TryGetValue(originalCol, out var val))
                {
                    return val;
                }
                return "";
            }

            if (entityType.Equals("students", StringComparison.OrdinalIgnoreCase))
            {
                var name = GetMappedVal("FirstName");
                if (string.IsNullOrWhiteSpace(name))
                {
                    errors.Add($"Row {rowIdx}: Missing Student First Name.");
                    return false;
                }

                var phone = GetMappedVal("FatherPhone");
                if (string.IsNullOrWhiteSpace(phone))
                {
                    phone = GetMappedVal("GuardianPhone");
                }

                if (!string.IsNullOrWhiteSpace(phone))
                {
                    var cleanPhone = phone.Replace(" ", "").Replace("-", "");
                    if (cleanPhone.Length < 10)
                    {
                        errors.Add($"Row {rowIdx}: Contact phone '{phone}' is shorter than 10 digits.");
                    }
                }
            }
            else if (entityType.Equals("teachers", StringComparison.OrdinalIgnoreCase))
            {
                var name = GetMappedVal("FirstName");
                if (string.IsNullOrWhiteSpace(name))
                {
                    errors.Add($"Row {rowIdx}: Missing Teacher Name.");
                    return false;
                }
            }

            return true;
        }

        private static Dictionary<string, string[]> GetSynonymMap(string entityType)
        {
            var normalized = (entityType ?? "students").Trim().ToLowerInvariant();
            return normalized switch
            {
                "teachers" or "teacher" => TeacherSynonyms,
                "fees" or "fee" => FeeSynonyms,
                "classes" or "class" => ClassSynonyms,
                _ => StudentSynonyms
            };
        }

        private static List<string> ReadLinesFromStream(Stream stream)
        {
            var lines = new List<string>();
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                lines.Add(line);
            }
            return lines;
        }

        public static List<string> ParseCsvRow(string line)
        {
            var result = new List<string>();
            if (string.IsNullOrEmpty(line)) return result;

            var inQuotes = false;
            var curVal = new StringBuilder();

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        curVal.Append('"');
                        i++; // Skip escaped quote
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    result.Add(curVal.ToString());
                    curVal.Clear();
                }
                else
                {
                    curVal.Append(c);
                }
            }

            result.Add(curVal.ToString());
            return result;
        }
    }
}
