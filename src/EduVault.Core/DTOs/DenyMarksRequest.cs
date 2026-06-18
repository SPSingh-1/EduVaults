using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class DenyMarksRequest
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
    }
}
