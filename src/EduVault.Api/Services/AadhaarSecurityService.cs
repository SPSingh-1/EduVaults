using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace EduVault.Api.Services
{
    public class AadhaarSecurityService
    {
        private readonly byte[] _key;

        public AadhaarSecurityService()
        {
            var rawKey = Environment.GetEnvironmentVariable("AADHAAR_ENCRYPTION_KEY") ?? "EduVaultSecureAadhaarKey202532B!";
            using var sha = SHA256.Create();
            _key = sha.ComputeHash(Encoding.UTF8.GetBytes(rawKey)); // Guaranteed 256 bits
        }

        public string ComputeHash(string rawAadhaar)
        {
            if (string.IsNullOrWhiteSpace(rawAadhaar)) return string.Empty;
            var clean = rawAadhaar.Replace(" ", "").Replace("-", "").Trim();
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(clean));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        public string Mask(string rawAadhaar)
        {
            if (string.IsNullOrWhiteSpace(rawAadhaar)) return string.Empty;
            var clean = rawAadhaar.Replace(" ", "").Replace("-", "").Trim();
            if (clean.Length <= 4) return clean;
            var last4 = clean.Substring(clean.Length - 4);
            return $"XXXX-XXXX-{last4}";
        }

        public string GetLastFour(string rawAadhaar)
        {
            if (string.IsNullOrWhiteSpace(rawAadhaar)) return string.Empty;
            var clean = rawAadhaar.Replace(" ", "").Replace("-", "").Trim();
            if (clean.Length < 4) return clean;
            return clean.Substring(clean.Length - 4);
        }

        public string Encrypt(string rawAadhaar)
        {
            if (string.IsNullOrWhiteSpace(rawAadhaar)) return string.Empty;
            var clean = rawAadhaar.Replace(" ", "").Replace("-", "").Trim();

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.GenerateIV();

            using var ms = new MemoryStream();
            ms.Write(aes.IV, 0, aes.IV.Length); // Prepend IV

            using (var cs = new CryptoStream(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
            using (var sw = new StreamWriter(cs, Encoding.UTF8))
            {
                sw.Write(clean);
            }

            return Convert.ToBase64String(ms.ToArray());
        }

        public string Decrypt(string encryptedBase64)
        {
            if (string.IsNullOrWhiteSpace(encryptedBase64)) return string.Empty;

            try
            {
                var fullBytes = Convert.FromBase64String(encryptedBase64);
                if (fullBytes.Length < 16) return string.Empty;

                var iv = new byte[16];
                Buffer.BlockCopy(fullBytes, 0, iv, 0, 16);

                using var aes = Aes.Create();
                aes.Key = _key;
                aes.IV = iv;

                using var ms = new MemoryStream(fullBytes, 16, fullBytes.Length - 16);
                using var cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Read);
                using var sr = new StreamReader(cs, Encoding.UTF8);
                return sr.ReadToEnd();
            }
            catch
            {
                return string.Empty;
            }
        }
    }
}
