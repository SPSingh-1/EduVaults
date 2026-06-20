using System;

namespace EduVault.Core.Entities
{
    public class KnowledgeBaseCategory
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Icon { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int ArticleCount { get; set; }
    }
}
