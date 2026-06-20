using System;

namespace EduVault.Core.Entities
{
    public class SystemEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Icon { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
