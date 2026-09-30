using System;
using System.Text.RegularExpressions;
using System.Globalization;

namespace EduVault.Api.Services
{
    public static class PasswordRuleHelper
    {
        public const string DefaultStudentPattern = "stu@currentyear!";
        public const string DefaultTeacherPattern = "tea@currentyear!";
        public const string DefaultReceptionistPattern = "rec@currentyear!";
        public const string DefaultAccountantPattern = "acc@currentyear!";

        public static string GetDefaultPattern(string role)
        {
            var r = (role ?? "").Trim().ToLowerInvariant();
            return r switch
            {
                "student" => DefaultStudentPattern,
                "teacher" => DefaultTeacherPattern,
                "receptionist" => DefaultReceptionistPattern,
                "accountant" => DefaultAccountantPattern,
                _ => "stu@currentyear!"
            };
        }

        public static string GeneratePassword(
            string? pattern,
            string role,
            string? firstName,
            string? lastName = null,
            string? birthYearOrDob = null,
            string? schoolName = null)
        {
            var normalizedRole = (role ?? "student").Trim().ToLowerInvariant();
            var rawPattern = string.IsNullOrWhiteSpace(pattern) ? GetDefaultPattern(normalizedRole) : pattern.Trim();

            // 1. Current Year
            var currentYear = DateTime.UtcNow.Year.ToString();

            // 2. Birth Year Resolution
            var birthYear = ResolveBirthYear(birthYearOrDob, normalizedRole == "student" ? "2015" : currentYear);

            // 3. School 3
            var cleanSchool = Regex.Replace(schoolName ?? "EduVault", @"[^a-zA-Z0-9]", "").ToLowerInvariant();
            var school3 = cleanSchool.Length >= 3 ? cleanSchool.Substring(0, 3) : cleanSchool.PadRight(3, 'x');

            // 4. First Name cleaning & Name3
            var cleanFirst = Regex.Replace(firstName ?? "", @"[^a-zA-Z0-9]", "").ToLowerInvariant();
            string name3;
            if (string.IsNullOrEmpty(cleanFirst))
            {
                name3 = normalizedRole switch
                {
                    "teacher" => "tea",
                    "receptionist" => "rec",
                    "accountant" => "acc",
                    _ => "stu"
                };
                cleanFirst = name3;
            }
            else if (cleanFirst.Length >= 3)
            {
                name3 = cleanFirst.Substring(0, 3);
            }
            else
            {
                name3 = cleanFirst.PadRight(3, 'x');
            }

            // 5. Last Name cleaning & LastName3
            var cleanLast = Regex.Replace(lastName ?? "", @"[^a-zA-Z0-9]", "").ToLowerInvariant();
            var lastName3 = cleanLast.Length >= 3 ? cleanLast.Substring(0, 3) : (cleanLast.Length > 0 ? cleanLast.PadRight(3, 'x') : "sch");

            // Evaluate pattern substitutions
            var result = rawPattern;

            // Handle token replacements (case-insensitive)
            result = Regex.Replace(result, @"\{name3\}|\{first3\}", name3, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{name\}|\{firstname\}", cleanFirst, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{lastname3\}|\{last3\}", lastName3, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{school3\}", school3, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{currentyear\}|\{year\}", currentYear, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{birthyear\}|\{dobyear\}", birthYear, RegexOptions.IgnoreCase);

            // Handle role token replacements {stu}, {tea}, {rec}, {acc}
            result = Regex.Replace(result, @"\{stu\}|\{tea\}|\{rec\}|\{acc\}|\{role3\}", name3, RegexOptions.IgnoreCase);

            // Also support bare tokens without curly braces if entered by user (e.g. @currentyear, @birthyear)
            result = Regex.Replace(result, @"(?<=[\W_]|^)currentyear(?=[\W_]|$)", currentYear, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"(?<=[\W_]|^)birthyear(?=[\W_]|$)", birthYear, RegexOptions.IgnoreCase);

            // Support default prefix shorthand pattern: e.g. "stu@currentyear!" -> "sha@2026!"
            // If pattern starts with role shorthand (stu, tea, rec, acc) before a delimiter (@, #, !, $, _, .)
            if (normalizedRole == "student" && Regex.IsMatch(result, @"^stu(?=[@#!$_\.\d])", RegexOptions.IgnoreCase))
            {
                result = Regex.Replace(result, @"^stu", name3, RegexOptions.IgnoreCase);
            }
            else if (normalizedRole == "teacher" && Regex.IsMatch(result, @"^tea(?=[@#!$_\.\d])", RegexOptions.IgnoreCase))
            {
                result = Regex.Replace(result, @"^tea", name3, RegexOptions.IgnoreCase);
            }
            else if (normalizedRole == "receptionist" && Regex.IsMatch(result, @"^rec(?=[@#!$_\.\d])", RegexOptions.IgnoreCase))
            {
                result = Regex.Replace(result, @"^rec", name3, RegexOptions.IgnoreCase);
            }
            else if (normalizedRole == "accountant" && Regex.IsMatch(result, @"^acc(?=[@#!$_\.\d])", RegexOptions.IgnoreCase))
            {
                result = Regex.Replace(result, @"^acc", name3, RegexOptions.IgnoreCase);
            }

            // Ensure minimum safe length for login systems (at least 6 chars)
            if (result.Length < 6)
            {
                result = $"{result}!{currentYear}";
            }

            return result;
        }

        private static string ResolveBirthYear(string? dobRaw, string fallback)
        {
            if (string.IsNullOrWhiteSpace(dobRaw)) return fallback;

            var trimmed = dobRaw.Trim();
            // Check if it's already a 4-digit year (1950 - 2030)
            var yearMatch = Regex.Match(trimmed, @"\b(19\d\d|20\d\d)\b");
            if (yearMatch.Success)
            {
                return yearMatch.Value;
            }

            string[] formats = { "dd-MM-yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MMM-yyyy", "d/M/yyyy" };
            if (DateTime.TryParseExact(trimmed, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return parsed.Year.ToString();
            }

            if (DateTime.TryParse(trimmed, out var generalParsed))
            {
                return generalParsed.Year.ToString();
            }

            return fallback;
        }

        public static object GetSamplePreviews(
            string? studentPattern,
            string? teacherPattern,
            string? receptionistPattern,
            string? accountantPattern,
            string? schoolName = "Springfield Academy")
        {
            return new
            {
                student = GeneratePassword(studentPattern, "student", "Shashi", "Kumar", "2015-05-12", schoolName),
                teacher = GeneratePassword(teacherPattern, "teacher", "Rohan", "Sharma", "1988-08-20", schoolName),
                receptionist = GeneratePassword(receptionistPattern, "receptionist", "Priya", "Verma", "1994-03-15", schoolName),
                accountant = GeneratePassword(accountantPattern, "accountant", "Amit", "Patel", "1990-11-28", schoolName)
            };
        }
    }
}
