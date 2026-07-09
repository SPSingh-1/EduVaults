using System;
using System.Collections.Generic;

namespace EduVault.Core.DTOs
{
    public class BulkImportResult
    {
        public int SuccessCount { get; set; }
        public List<string> ImportedNames { get; set; } = new List<string>();
        public List<DuplicateStudentDto> Duplicates { get; set; } = new List<DuplicateStudentDto>();
    }

    public class DuplicateStudentDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }
}
