using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EduVault.Infrastructure.Data
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<EduVaultDbContext>
    {
        public EduVaultDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<EduVaultDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Database=eduvault;Username=postgres;Password=postgres");

            return new EduVaultDbContext(optionsBuilder.Options);
        }
    }
}
