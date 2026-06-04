using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class CreateClassRequest
    {
        [Required]
        public string Grade { get; set; } = string.Empty; // e.g. 10

        [Required]
        public string Section { get; set; } = string.Empty; // e.g. A

        public string Level { get; set; } = string.Empty; // e.g. Secondary
        public string Room { get; set; } = string.Empty;
        public int Capacity { get; set; } = 30;
    }
}
