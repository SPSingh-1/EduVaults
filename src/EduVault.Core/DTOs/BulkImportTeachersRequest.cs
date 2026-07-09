using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class BulkImportTeachersRequest
    {
        [Required]
        public List<BulkImportTeacherDto> Teachers { get; set; } = new List<BulkImportTeacherDto>();
    }
}
