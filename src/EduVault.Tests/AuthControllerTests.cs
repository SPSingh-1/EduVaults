using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using EduVault.Api.Controllers;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;

namespace EduVault.Tests
{
    public class AuthControllerTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IAuthService> _mockAuth;
        private readonly Mock<IConfiguration> _mockConfig;
        private readonly Mock<System.Net.Http.IHttpClientFactory> _mockHttpFactory;
        private readonly Mock<IMemoryCache> _mockCache;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _mockUow = new Mock<IUnitOfWork>();
            _mockAuth = new Mock<IAuthService>();
            _mockConfig = new Mock<IConfiguration>();
            _mockHttpFactory = new Mock<System.Net.Http.IHttpClientFactory>();
            _mockCache = new Mock<IMemoryCache>();

            _controller = new AuthController(
                _mockUow.Object,
                _mockAuth.Object,
                _mockConfig.Object,
                _mockHttpFactory.Object,
                _mockCache.Object
            );
        }

        [Fact]
        public async Task GetPublicStats_ReturnsCachedData_IfPresent()
        {
            // Arrange
            object? cachedData = new { totalSchools = 5, totalStudents = 100 };
            _mockCache
                .Setup(c => c.TryGetValue(It.IsAny<object>(), out cachedData))
                .Returns(true);

            // Act
            var result = await _controller.GetPublicStats();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(cachedData, okResult.Value);
            _mockUow.Verify(u => u.Schools.GetAllAsync(), Times.Never);
        }

        [Fact]
        public async Task GetPublicStats_QueriesDatabase_IfCacheEmpty()
        {
            // Arrange
            object? cachedData = null;
            _mockCache
                .Setup(c => c.TryGetValue(It.IsAny<object>(), out cachedData))
                .Returns(false);

            var entryMock = new Mock<ICacheEntry>();
            _mockCache
                .Setup(c => c.CreateEntry(It.IsAny<object>()))
                .Returns(entryMock.Object);

            var schools = new List<School> { new School { Status = "Active" } };
            var students = new List<User> { new User { Role = "student" } };

            _mockUow.Setup(u => u.Schools.GetAllAsync()).ReturnsAsync(schools);
            _mockUow.Setup(u => u.Users.FindAsync(It.IsAny<Expression<Func<User, bool>>>())).ReturnsAsync(students);

            // Act
            var result = await _controller.GetPublicStats();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
            _mockUow.Verify(u => u.Schools.GetAllAsync(), Times.Once);
        }

        [Fact]
        public async Task GetPublicSettings_ReturnsCachedData_IfPresent()
        {
            // Arrange
            object? cachedData = new { OrgName = "Test Org" };
            _mockCache
                .Setup(c => c.TryGetValue(It.IsAny<object>(), out cachedData))
                .Returns(true);

            // Act
            var result = await _controller.GetPublicSettings();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(cachedData, okResult.Value);
            _mockUow.Verify(u => u.PlatformSettings.GetAllAsync(), Times.Never);
        }

        [Fact]
        public async Task SubmitInquiry_ReturnsBadRequest_IfModelStateInvalid()
        {
            // Arrange
            _controller.ModelState.AddModelError("Email", "Invalid Email Address");
            var request = new SubmitInquiryRequest { Name = "A", Email = "bad", Message = "Short" };

            // Act
            var result = await _controller.SubmitInquiry(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task SubmitInquiry_ReturnsOk_IfRequestIsValid()
        {
            // Arrange
            var request = new SubmitInquiryRequest { Name = "John", Email = "john@example.com", Message = "Valid Message Details" };
            _mockUow.Setup(u => u.SupportTickets.AddAsync(It.IsAny<SupportTicket>())).Returns(Task.CompletedTask);

            // Act
            var result = await _controller.SubmitInquiry(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockUow.Verify(u => u.SupportTickets.AddAsync(It.IsAny<SupportTicket>()), Times.Once);
            _mockUow.Verify(u => u.CompleteAsync(), Times.Once);
        }
    }
}
