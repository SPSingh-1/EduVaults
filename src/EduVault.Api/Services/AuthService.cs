using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Api.Configuration;

namespace EduVault.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly JwtOptions _jwtOptions;
        private const int CurrentPbkdf2Iterations = 210000;
        private const int SaltSizeBytes = 16;
        private const int HashSizeBytes = 32;

        public AuthService(IOptions<JwtOptions> jwtOptions)
        {
            _jwtOptions = jwtOptions?.Value ?? throw new ArgumentNullException(nameof(jwtOptions));
            
            if (string.IsNullOrWhiteSpace(_jwtOptions.Secret) || _jwtOptions.Secret.Length < 32)
            {
                throw new InvalidOperationException("Fatal: Centralized JWT Secret is missing or shorter than 32 characters in configuration.");
            }
        }

        public string GenerateToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtOptions.Secret);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Role, user.Role ?? string.Empty),
                new Claim("id", user.Id.ToString()),
                new Claim("email", user.Email ?? string.Empty),
                new Claim("role", user.Role ?? string.Empty),
                new Claim("firstName", user.FirstName ?? string.Empty),
                new Claim("lastName", user.LastName ?? string.Empty),
                new Claim("schoolId", user.SchoolId?.ToString() ?? string.Empty)
            };

            var expirationDays = _jwtOptions.ExpirationDays > 0 ? _jwtOptions.ExpirationDays : 7;

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = _jwtOptions.Issuer,
                Audience = _jwtOptions.Audience,
                Expires = DateTime.UtcNow.AddDays(expirationDays),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password))
                throw new ArgumentException("Password cannot be empty.", nameof(password));

            byte[] salt = new byte[SaltSizeBytes];
            RandomNumberGenerator.Fill(salt);

            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                CurrentPbkdf2Iterations,
                HashAlgorithmName.SHA512,
                HashSizeBytes);

            // Self-describing upgraded format: $v2$<iterations>$<salt_b64>$<hash_b64>
            return $"$v2${CurrentPbkdf2Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
                return false;

            try
            {
                // 1. Check for modern self-describing v2 format ($v2$iterations$salt$hash)
                if (hashedPassword.StartsWith("$v2$"))
                {
                    var parts = hashedPassword.Split('$');
                    if (parts.Length != 5) return false;

                    if (!int.TryParse(parts[2], out int iterations)) return false;
                    byte[] salt = Convert.FromBase64String(parts[3]);
                    byte[] expectedHash = Convert.FromBase64String(parts[4]);

                    byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                        password,
                        salt,
                        iterations,
                        HashAlgorithmName.SHA512,
                        expectedHash.Length);

                    return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
                }

                // 2. Fallback to Legacy 36-byte raw format (16 bytes salt + 20 bytes SHA256 @ 10,000 iter)
                byte[] hashBytes = Convert.FromBase64String(hashedPassword);
                if (hashBytes.Length != 36)
                    return false;

                byte[] legacySalt = new byte[16];
                Array.Copy(hashBytes, 0, legacySalt, 0, 16);

                byte[] computedHash = Rfc2898DeriveBytes.Pbkdf2(
                    password,
                    legacySalt,
                    10000,
                    HashAlgorithmName.SHA256,
                    20);

                byte[] storedHash = new byte[20];
                Array.Copy(hashBytes, 16, storedHash, 0, 20);

                return CryptographicOperations.FixedTimeEquals(storedHash, computedHash);
            }
            catch
            {
                return false;
            }
        }

        public bool NeedsRehash(string hashedPassword)
        {
            if (string.IsNullOrEmpty(hashedPassword)) return true;
            return !hashedPassword.StartsWith("$v2$");
        }
    }
}
