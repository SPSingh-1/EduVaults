using System;

namespace EduVault.Core.DTOs
{
    public class ClassResponse
    {
        public Guid Id { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int Enrolled { get; set; }
        public int Pct { get; set; }
        public string? Teacher { get; set; }
        public string? Email { get; set; }
    }
}
