using System;

namespace EduVault.Core.Entities
{
    public class ClassSubject
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid? TeacherId { get; set; }

        // Navigation properties
        public virtual Class? Class { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Teacher? Teacher { get; set; }
    }
}
