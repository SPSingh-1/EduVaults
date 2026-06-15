using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class AddRemarkRequest
    {
        [Required]
        public string Remark { get; set; } = string.Empty;
    }
}
