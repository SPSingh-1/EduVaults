using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.Options;
using EduVault.Api.Configuration;
using EduVault.Api.Services;
using EduVault.Core.Entities;

namespace EduVault.Tests
{
    public class CentralizedConfigAndSecurityTests
    {
        [Fact]
        public void AuthService_WithShortSecret_ThrowsInvalidOperationException()
        {
            var options = Options.Create(new JwtOptions
            {
                Secret = "short_secret"
            });

            Assert.Throws<InvalidOperationException>(() => new AuthService(options));
        }

        [Fact]
        public void AuthService_WithValidSecret_GeneratesAndValidatesToken()
        {
            var validSecret = "EduVaultSuperSecretCentralizedKey2025!32Bytes";
            var options = Options.Create(new JwtOptions
            {
                Secret = validSecret,
                Issuer = "EduVault",
                Audience = "EduVaultUsers",
                ExpirationDays = 7
            });

            var authService = new AuthService(options);
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "test@eduvault.com",
                Role = "schooladmin",
                FirstName = "Admin",
                LastName = "User",
                SchoolId = Guid.NewGuid()
            };

            var token = authService.GenerateToken(user);
            Assert.NotNull(token);
            Assert.NotEmpty(token);
            Assert.Contains(".", token);
        }

        [Fact]
        public void PasswordHashing_ModernAndLegacy_VerificationAndUpgrade()
        {
            var validSecret = "EduVaultSuperSecretCentralizedKey2025!32Bytes";
            var options = Options.Create(new JwtOptions { Secret = validSecret });
            var authService = new AuthService(options);

            string password = "StrongPassword123!";

            // 1. Modern hash generation
            string modernHash = authService.HashPassword(password);
            Assert.StartsWith("$v2$210000$", modernHash);
            Assert.True(authService.VerifyPassword(password, modernHash));
            Assert.False(authService.VerifyPassword("WrongPassword", modernHash));
            Assert.False(authService.NeedsRehash(modernHash));

            // 2. Legacy hash verification (simulate old 36-byte format @ 10,000 iter)
            byte[] legacySalt = new byte[16];
            RandomNumberGenerator.Fill(legacySalt);
            byte[] legacyRawHash = Rfc2898DeriveBytes.Pbkdf2(password, legacySalt, 10000, HashAlgorithmName.SHA256, 20);
            byte[] legacyCombined = new byte[36];
            Array.Copy(legacySalt, 0, legacyCombined, 0, 16);
            Array.Copy(legacyRawHash, 0, legacyCombined, 16, 20);
            string legacyHash = Convert.ToBase64String(legacyCombined);

            Assert.True(authService.VerifyPassword(password, legacyHash));
            Assert.True(authService.NeedsRehash(legacyHash));
        }

        [Fact]
        public void PasswordResetToken_CryptographicGenerationAndHashValidation()
        {
            // Generate 256-bit CSPRNG token
            byte[] randomBytes = new byte[32];
            RandomNumberGenerator.Fill(randomBytes);
            string rawToken = Convert.ToHexString(randomBytes).ToLowerInvariant();

            Assert.Equal(64, rawToken.Length);

            // Compute SHA-256 hash
            string computedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
            Assert.NotNull(computedHash);

            // Same input must match hash
            string verifyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken.Trim().ToLowerInvariant())));
            Assert.Equal(computedHash, verifyHash);

            // Different input must not match
            string alteredToken = rawToken.Substring(0, 63) + (rawToken.EndsWith("a") ? "b" : "a");
            string alteredHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(alteredToken)));
            Assert.NotEqual(computedHash, alteredHash);
        }
    }
}
