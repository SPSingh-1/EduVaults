using System;

namespace EduVault.Core.DTOs
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserDto User { get; set; } = new UserDto();
    }

    public class UserDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public Guid? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string LogoUrl { get; set; } = string.Empty;
        public string EmailDomain { get; set; } = string.Empty;
        public string ThemeColor { get; set; } = string.Empty;
    }
}
