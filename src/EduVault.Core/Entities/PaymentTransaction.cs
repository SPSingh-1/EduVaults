using System;

namespace EduVault.Core.Entities
{
    public class PaymentTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid InvoiceId { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty; // Visa, Bank Transfer, Stripe
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "success"; // success, failed

        // Navigation properties
        public virtual StudentInvoice? Invoice { get; set; }
    }
}
