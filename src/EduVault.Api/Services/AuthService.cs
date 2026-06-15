using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;

namespace EduVault.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _config;

        public AuthService(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtKey = _config["Jwt:Secret"] ?? "EduVaultSuperSecretJWTKey2025!WithSecureKey32BytesLength";
            var key = Encoding.ASCII.GetBytes(jwtKey);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("id", user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("role", user.Role),
                new Claim("firstName", user.FirstName),
                new Claim("lastName", user.LastName),
                new Claim("schoolId", user.SchoolId?.ToString() ?? string.Empty)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public string HashPassword(string password)
        {
            byte[] salt = new byte[16];
            RandomNumberGenerator.Fill(salt);
            
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10000, HashAlgorithmName.SHA256, 20);

            byte[] hashBytes = new byte[36];
            Array.Copy(salt, 0, hashBytes, 0, 16);
            Array.Copy(hash, 0, hashBytes, 16, 20);

            return Convert.ToBase64String(hashBytes);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hashedPassword))
                return false;

            try
            {
                byte[] hashBytes = Convert.FromBase64String(hashedPassword);
                if (hashBytes.Length != 36)
                    return false;

                byte[] salt = new byte[16];
                Array.Copy(hashBytes, 0, salt, 0, 16);

                byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 10000, HashAlgorithmName.SHA256, 20);

                byte[] storedHash = new byte[20];
                Array.Copy(hashBytes, 16, storedHash, 0, 20);

                return CryptographicOperations.FixedTimeEquals(storedHash, hash);
            }
            catch
            {
                return false;
            }
        }
    }
}
