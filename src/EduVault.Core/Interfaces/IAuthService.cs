using EduVault.Core.Entities;

namespace EduVault.Core.Interfaces
{
    public interface IAuthService
    {
        string GenerateToken(User user);
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
    }
}
