using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class BulkImportRequest
    {
        [Required]
        public List<BulkImportStudentDto> Students { get; set; } = new List<BulkImportStudentDto>();
    }
}
