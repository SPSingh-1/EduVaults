using System;

namespace EduVault.Api.Services
{
    public static class ClassNormalizationHelper
    {
        public static string NormalizeGrade(string? grade)
        {
            if (string.IsNullOrWhiteSpace(grade)) return "1";
            var g = grade.Trim();
            while (g.StartsWith("Class Class ", StringComparison.OrdinalIgnoreCase))
            {
                g = g.Substring(12).Trim();
            }
            while (g.StartsWith("Class ", StringComparison.OrdinalIgnoreCase))
            {
                g = g.Substring(6).Trim();
            }
            while (g.StartsWith("Grade Grade ", StringComparison.OrdinalIgnoreCase))
            {
                g = g.Substring(12).Trim();
            }
            while (g.StartsWith("Grade ", StringComparison.OrdinalIgnoreCase))
            {
                g = g.Substring(6).Trim();
            }
            return string.IsNullOrWhiteSpace(g) ? "1" : g;
        }

        public static string NormalizeSection(string? section)
        {
            if (string.IsNullOrWhiteSpace(section)) return "A";
            var s = section.Trim();
            while (s.StartsWith("Section Section ", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring(16).Trim();
            }
            while (s.StartsWith("Section ", StringComparison.OrdinalIgnoreCase))
            {
                s = s.Substring(8).Trim();
            }
            return string.IsNullOrWhiteSpace(s) ? "A" : s;
        }

        public static string FormatClassDisplay(string? grade, string? section)
        {
            var normG = NormalizeGrade(grade);
            var normS = NormalizeSection(section);
            var lower = normG.ToLowerInvariant();
            string displayGrade;
            if (lower.StartsWith("play") || lower.StartsWith("nur") || lower.StartsWith("lkg") || lower.StartsWith("ukg") || lower.StartsWith("kg"))
            {
                displayGrade = normG;
            }
            else
            {
                displayGrade = $"Class {normG}";
            }
            return string.IsNullOrWhiteSpace(normS) ? displayGrade : $"{displayGrade} - Section {normS}";
        }
        public static int GetGradeSortOrder(string? grade)
        {
            if (string.IsNullOrWhiteSpace(grade)) return 999;
            var norm = NormalizeGrade(grade).Trim().ToLowerInvariant();
            if (norm.Contains("play") || norm == "pg") return 1;
            if (norm.Contains("nur") || norm == "nursery") return 2;
            if (norm.Contains("lkg") || norm.Contains("lower kg") || norm.Contains("jr") || norm.Contains("junior")) return 3;
            if (norm.Contains("ukg") || norm.Contains("upper kg") || norm.Contains("sr") || norm.Contains("senior")) return 4;
            if (norm.Contains("kg") || norm.Contains("kindergarten")) return 5;
            
            var digits = System.Text.RegularExpressions.Regex.Match(norm, @"\d+");
            if (digits.Success && int.TryParse(digits.Value, out int n))
            {
                return 10 + n;
            }
            return 100;
        }
    }
}
