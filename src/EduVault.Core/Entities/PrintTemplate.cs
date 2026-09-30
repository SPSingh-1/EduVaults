using System;

namespace EduVault.Core.Entities
{
    public class PrintTemplate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        // Null = Super Admin Master Template (available to all schools)
        // Set = School-specific template (only for that school)
        public Guid? SchoolId { get; set; }
        public School? School { get; set; }

        // Document classification
        // Values: FeeReceipt | ReportCard | SalarySlip | AdmitCard | IdCard | TransferCertificate | GatePass | VisitorPass
        public string DocumentType { get; set; } = "FeeReceipt";

        public string TemplateName { get; set; } = "Default Template";
        public string Description { get; set; } = "";

        // Paper format
        // Values: Thermal80mm | A5Portrait | A5Landscape | A4Single | A4TwinCopy | CR80ID
        public string PaperSize { get; set; } = "A4Single";
        public string Orientation { get; set; } = "Portrait"; // Portrait | Landscape

        // Visual Block Studio configuration stored as JSON
        public string LayoutConfigJson { get; set; } = "{}";

        // Final compiled HTML+CSS with merge tags (e.g. {{student.name}}, {{fee.receiptNo}})
        public string HtmlContent { get; set; } = string.Empty;

        // AI generation metadata
        public bool WasAiGenerated { get; set; } = false;
        public string AiPromptUsed { get; set; } = string.Empty;

        // Super Admin Master Template can be pushed to schools
        public bool IsSuperAdminMaster { get; set; } = false;

        // If true, this is the active default for its DocumentType in this school
        public bool IsDefault { get; set; } = false;
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
