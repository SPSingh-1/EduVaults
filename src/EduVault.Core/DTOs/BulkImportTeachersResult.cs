using System;
using System.Collections.Generic;

namespace EduVault.Core.DTOs
{
    public class BulkImportTeachersResult
    {
        public int SuccessCount { get; set; }
        public List<string> ImportedNames { get; set; } = new List<string>();
        public List<DuplicateTeacherDto> Duplicates { get; set; } = new List<DuplicateTeacherDto>();
    }

    public class DuplicateTeacherDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }
}
