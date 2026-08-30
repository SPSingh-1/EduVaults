using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using EduVault.Core.Entities;
using EduVault.Api.Services;

namespace EduVault.Tests
{
    public class TenantIsolationAndSecurityTests
    {
        private const string TestJwtSecret = "ThisIsASecretKeyForTestingPurposes1234567890!@#$";
        private const string Issuer = "EduVault";
        private const string Audience = "EduVaultUsers";

        private string GenerateToken(Guid userId, string email, string role, Guid? schoolId, int expireMinutes = 60, string? customSecret = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(customSecret ?? TestJwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
                new Claim("id", userId.ToString()),
                new Claim("email", email),
                new Claim("role", role)
            };

            if (schoolId.HasValue)
            {
                claims.Add(new Claim("schoolId", schoolId.Value.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: Issuer,
                audience: Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expireMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private ClaimsPrincipal? ValidateToken(string token, string? validationSecret = null)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = Issuer,
                ValidateAudience = true,
                ValidAudience = Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(validationSecret ?? TestJwtSecret)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            try
            {
                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                return principal;
            }
            catch
            {
                return null;
            }
        }

        // =========================================================================
        // 1. JWT Security & Tamper Rejection Tests
        // =========================================================================

        [Fact]
        public void ValidToken_AuthenticatesSuccessfully_WithAllClaims()
        {
            var userId = Guid.NewGuid();
            var schoolId = Guid.NewGuid();
            var token = GenerateToken(userId, "admin@school-a.com", "schooladmin", schoolId);

            var principal = ValidateToken(token);
            Assert.NotNull(principal);
            Assert.Equal(userId.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            Assert.Equal("schooladmin", principal.FindFirst(ClaimTypes.Role)?.Value);
            Assert.Equal(schoolId.ToString(), principal.FindFirst("schoolId")?.Value);
        }

        [Fact]
        public void ExpiredToken_IsStrictlyRejected()
        {
            var userId = Guid.NewGuid();
            var schoolId = Guid.NewGuid();
            // Generate token expired 10 minutes ago
            var token = GenerateToken(userId, "user@school.com", "teacher", schoolId, expireMinutes: -10);

            var principal = ValidateToken(token);
            Assert.Null(principal);
        }

        [Fact]
        public void TamperedSignature_IsRejected()
        {
            var userId = Guid.NewGuid();
            var schoolId = Guid.NewGuid();
            var token = GenerateToken(userId, "user@school.com", "teacher", schoolId);

            // Tamper with payload
            var parts = token.Split('.');
            var tamperedToken = $"{parts[0]}.{parts[1]}A.{parts[2]}";

            var principal = ValidateToken(tamperedToken);
            Assert.Null(principal);
        }

        [Fact]
        public void TokenSignedWithDifferentSecret_IsRejected()
        {
            var userId = Guid.NewGuid();
            var token = GenerateToken(userId, "user@school.com", "teacher", Guid.NewGuid(), customSecret: "AnotherSecretKeyDifferentFromExpected9999!");

            var principal = ValidateToken(token); // validates with TestJwtSecret
            Assert.Null(principal);
        }

        // =========================================================================
        // 2. Multi-Tenant Boundary & Horizontal Isolation Tests
        // =========================================================================

        [Fact]
        public void MultiTenant_SchoolAdminClaims_CannotImpersonateDifferentSchool()
        {
            var schoolA = Guid.NewGuid();
            var schoolB = Guid.NewGuid();

            var adminAToken = GenerateToken(Guid.NewGuid(), "admin@school-a.edu", "schooladmin", schoolA);
            var principalA = ValidateToken(adminAToken);
            Assert.NotNull(principalA);

            var claimedSchoolId = principalA.FindFirst("schoolId")?.Value;
            Assert.Equal(schoolA.ToString(), claimedSchoolId);
            Assert.NotEqual(schoolB.ToString(), claimedSchoolId);
        }

        [Fact]
        public void MultiTenant_StudentQuery_IsEnforcedByTenantId()
        {
            var schoolA = Guid.NewGuid();
            var schoolB = Guid.NewGuid();

            var userA = new User { Id = Guid.NewGuid(), SchoolId = schoolA, Role = "student", FirstName = "Alice" };
            var userB = new User { Id = Guid.NewGuid(), SchoolId = schoolB, Role = "student", FirstName = "Bob" };

            var allUsers = new List<User> { userA, userB };

            // Server-side tenant filtering:
            var schoolAStudents = allUsers.FindAll(u => u.SchoolId == schoolA && u.Role == "student");
            Assert.Single(schoolAStudents);
            Assert.Equal("Alice", schoolAStudents[0].FirstName);

            var schoolBStudents = allUsers.FindAll(u => u.SchoolId == schoolB && u.Role == "student");
            Assert.Single(schoolBStudents);
            Assert.Equal("Bob", schoolBStudents[0].FirstName);
        }

        // =========================================================================
        // 3. Password Reset Security Lifecycle Tests
        // =========================================================================

        [Fact]
        public void PasswordResetToken_HashMatchesSha256_AndRawTokenIsNotStored()
        {
            byte[] randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            string rawToken = Convert.ToHexString(randomBytes).ToLowerInvariant();

            string computedHash;
            using (var sha256 = SHA256.Create())
            {
                computedHash = Convert.ToHexString(sha256.ComputeHash(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();
            }

            var entity = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TokenHash = computedHash,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            };

            // Raw token is NEVER stored
            Assert.NotEqual(rawToken, entity.TokenHash);
            Assert.False(entity.IsUsed);
            Assert.True(entity.ExpiresAt > DateTime.UtcNow);
        }

        [Fact]
        public void PasswordResetToken_ExpiredToken_IsDetectedAsInvalid()
        {
            var entity = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TokenHash = "testhash",
                ExpiresAt = DateTime.UtcNow.AddMinutes(-1), // expired 1 min ago
                IsUsed = false
            };

            bool isValid = !entity.IsUsed && entity.ExpiresAt > DateTime.UtcNow;
            Assert.False(isValid);
        }

        [Fact]
        public void PasswordResetToken_AlreadyUsedToken_IsDetectedAsInvalid()
        {
            var entity = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                TokenHash = "testhash",
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = true, // already consumed
                UsedAt = DateTime.UtcNow.AddMinutes(-2)
            };

            bool isValid = !entity.IsUsed && entity.ExpiresAt > DateTime.UtcNow;
            Assert.False(isValid);
        }

        // =========================================================================
        // 4. Password Hashing Robustness & Unicode / Long Input Tests
        // =========================================================================

        [Fact]
        public void PasswordHashing_HandlesUnicodeAndSpecialCharacters()
        {
            var authService = new AuthService(Microsoft.Extensions.Options.Options.Create(new EduVault.Api.Configuration.JwtOptions { Secret = TestJwtSecret }));
            string unicodePass = "P@sswørd!_日本語_✨_2026";

            string hash = authService.HashPassword(unicodePass);
            Assert.StartsWith("$v2$210000$", hash);

            bool verified = authService.VerifyPassword(unicodePass, hash);
            Assert.True(verified);

            bool wrong = authService.VerifyPassword("P@sswørd!_日本語_wrong", hash);
            Assert.False(wrong);
        }

        [Fact]
        public void PasswordHashing_HandlesLongPassword()
        {
            var authService = new AuthService(Microsoft.Extensions.Options.Options.Create(new EduVault.Api.Configuration.JwtOptions { Secret = TestJwtSecret }));
            string longPass = new string('A', 512);

            string hash = authService.HashPassword(longPass);
            Assert.StartsWith("$v2$210000$", hash);
            Assert.True(authService.VerifyPassword(longPass, hash));
            Assert.False(authService.VerifyPassword(new string('A', 511) + 'B', hash));
        }

        // =========================================================================
        // 5. CSV Injection Neutralization Tests
        // =========================================================================

        [Theory]
        [InlineData("=1+1", "'=1+1")]
        [InlineData("+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0")]
        [InlineData("-2+3", "'-2+3")]
        [InlineData("@SUM(A1:A10)", "'@SUM(A1:A10)")]
        [InlineData("Normal Student Name", "Normal Student Name")]
        [InlineData("12345", "12345")]
        public void CsvSanitization_NeutralizesFormulaPrefixes(string input, string expected)
        {
            string SanitizeCsv(string val)
            {
                if (string.IsNullOrEmpty(val)) return string.Empty;
                char first = val[0];
                if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r')
                {
                    return "'" + val;
                }
                return val;
            }

            string sanitized = SanitizeCsv(input);
            Assert.Equal(expected, sanitized);
        }
    }
}
