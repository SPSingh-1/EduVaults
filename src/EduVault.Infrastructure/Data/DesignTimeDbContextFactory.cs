using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EduVault.Infrastructure.Data
{
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<EduVaultDbContext>
    {
        public EduVaultDbContext CreateDbContext(string[] args)
        {
            // Search for .env in current and parent directories
            var current = Directory.GetCurrentDirectory();
            string? connStr = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                              ?? Environment.GetEnvironmentVariable("DATABASE_URL");

            if (string.IsNullOrEmpty(connStr))
            {
                var dir = new DirectoryInfo(current);
                while (dir != null)
                {
                    var envPath = Path.Combine(dir.FullName, ".env");
                    if (File.Exists(envPath))
                    {
                        foreach (var line in File.ReadAllLines(envPath))
                        {
                            var trimmed = line.Trim();
                            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;
                            var parts = trimmed.Split('=', 2);
                            if (parts.Length == 2)
                            {
                                var k = parts[0].Trim();
                                var v = parts[1].Trim().Trim('"', '\'');
                                if (k == "ConnectionStrings__DefaultConnection" || k == "DATABASE_URL")
                                {
                                    connStr = v;
                                    break;
                                }
                            }
                        }
                        if (!string.IsNullOrEmpty(connStr)) break;
                    }
                    dir = dir.Parent;
                }
            }

            if (string.IsNullOrEmpty(connStr))
            {
                connStr = "Host=localhost;Database=eduvault;Username=postgres;Password=postgres";
            }

            var optionsBuilder = new DbContextOptionsBuilder<EduVaultDbContext>();
            optionsBuilder.UseNpgsql(connStr, b => b.MigrationsAssembly("EduVault.Infrastructure"));

            return new EduVaultDbContext(optionsBuilder.Options);
        }
    }
}
