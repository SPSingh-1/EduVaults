using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using EduVault.Api.Controllers;
using EduVault.Api.Services;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;

namespace EduVault.Tests
{
    public class AcademicsControllerTests
    {
        private readonly Mock<IUnitOfWork> _mockUow;
        private readonly Mock<IAuthService> _mockAuth;
        private readonly Mock<IWhatsAppQueue> _mockQueue;
        private readonly EduVaultDbContext _context;
        private readonly AcademicsController _controller;
        private readonly Guid _schoolId = Guid.NewGuid();

        public AcademicsControllerTests()
        {
            _mockUow = new Mock<IUnitOfWork>();
            _mockAuth = new Mock<IAuthService>();
            _mockQueue = new Mock<IWhatsAppQueue>();

            // Setup in-memory DB
            var options = new DbContextOptionsBuilder<EduVaultDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EduVaultDbContext(options);

            // Create controller context with ClaimsPrincipal for schoolId
            var userClaim = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim("schoolId", _schoolId.ToString())
            }, "mock"));

            var mockConfig = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
            var realWhatsApp = new WhatsAppService(mockConfig.Object, new System.Net.Http.HttpClient(), _mockUow.Object);

            _controller = new AcademicsController(
                _mockUow.Object,
                _mockAuth.Object,
                _context,
                realWhatsApp,
                _mockQueue.Object
            );

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = userClaim }
            };
        }

        [Fact]
        public async Task SubmitAttendance_QueuesWhatsAppMessage_ForNewRecord()
        {
            // Arrange
            var studentId = Guid.NewGuid();
            var targetDate = DateTime.UtcNow.Date;

            var school = new School { Id = _schoolId, Name = "Test School" };
            await _context.Schools.AddAsync(school);

            var user = new User { Id = studentId, FirstName = "Aarav", LastName = "Sharma" };
            await _context.Users.AddAsync(user);

            var student = new Student { UserId = studentId, User = user, GuardianPhone = "+919876543210" };
            await _context.Students.AddAsync(student);
            await _context.SaveChangesAsync();

            var request = new SubmitAttendanceRequest
            {
                ClassId = Guid.NewGuid(),
                Date = targetDate,
                Students = new List<StudentAttendanceDto>
                {
                    new StudentAttendanceDto { StudentId = studentId, Status = "Present" }
                }
            };

            // Act
            var result = await _controller.SubmitAttendance(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockQueue.Verify(q => q.QueueMessage(It.Is<WhatsAppQueueItem>(item => 
                item.PhoneNumber == "+919876543210" && 
                item.SchoolId == _schoolId && 
                item.Message.Contains("Present")
            )), Times.Once);
        }

        [Fact]
        public async Task BulkImport_GeneratesUniqueCredentialsAndFiltersDuplicates()
        {
            // Arrange
            var school = new School { Id = _schoolId, Name = "Greenwood High" };
            await _context.Schools.AddAsync(school);

            // Seed an existing student to trigger the duplicate filtration
            var existingUser = new User 
            { 
                Id = Guid.NewGuid(), 
                SchoolId = _schoolId, 
                FirstName = "Aarav", 
                LastName = "Sharma", 
                Email = "aaravsharma.existing@gmail.com" 
            };
            await _context.Users.AddAsync(existingUser);

            var existingStudent = new Student 
            { 
                UserId = existingUser.Id, 
                GuardianPhone = "+919876543210" 
            };
            await _context.Students.AddAsync(existingStudent);
            await _context.SaveChangesAsync();

            var classId = Guid.NewGuid();

            _mockAuth.Setup(a => a.HashPassword(It.IsAny<string>())).Returns("hashed_password");

            var request = new EduVault.Core.DTOs.BulkImportRequest
            {
                Students = new List<EduVault.Core.DTOs.BulkImportStudentDto>
                {
                    // New unique student
                    new EduVault.Core.DTOs.BulkImportStudentDto
                    {
                        FirstName = "Kabir",
                        LastName = "Singh",
                        DateOfBirth = "12-05-2015",
                        ClassId = classId,
                        GuardianName = "Rajesh Singh",
                        GuardianPhone = "+918888888888",
                        GuardianRelationship = "Father"
                    },
                    // Duplicate student (identical to seeded one)
                    new EduVault.Core.DTOs.BulkImportStudentDto
                    {
                        FirstName = "Aarav",
                        LastName = "Sharma",
                        DateOfBirth = "10-10-2014",
                        ClassId = classId,
                        GuardianName = "Suresh Sharma",
                        GuardianPhone = "+919876543210",
                        GuardianRelationship = "Father"
                    }
                }
            };

            // Act
            var result = await _controller.BulkImportStudents(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<EduVault.Core.DTOs.BulkImportResult>(okResult.Value);

            Assert.Equal(1, response.SuccessCount);
            Assert.Single(response.Duplicates);
            Assert.Equal("Aarav", response.Duplicates[0].FirstName);

            // Verify generated credentials for unique student
            var importedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "kabirsingh1205@gmail.com");
            Assert.NotNull(importedUser);
            Assert.Equal("hashed_password", importedUser.PasswordHash);
            _mockAuth.Verify(a => a.HashPassword("gre!2015"), Times.Once); // Greenwood prefix is "gre", birth year is 2015
        }

        [Fact]
        public async Task BulkImportTeachers_ResolvesDuplicateEmailsAndImportsSuccessfully()
        {
            // Arrange
            var school = new School { Id = _schoolId, Name = "Greenwood High" };
            await _context.Schools.AddAsync(school);

            // Seed an existing teacher to trigger duplicate filtration / resolution
            var existingUser = new User 
            { 
                Id = Guid.NewGuid(), 
                SchoolId = _schoolId, 
                FirstName = "Aarav", 
                LastName = "Sharma", 
                Email = "aarav.existing@gmail.com",
                Role = "teacher"
            };
            await _context.Users.AddAsync(existingUser);
            await _context.SaveChangesAsync();

            _mockAuth.Setup(a => a.HashPassword(It.IsAny<string>())).Returns("hashed_teacher_password");

            var request = new EduVault.Core.DTOs.BulkImportTeachersRequest
            {
                Teachers = new List<EduVault.Core.DTOs.BulkImportTeacherDto>
                {
                    // New unique teacher
                    new EduVault.Core.DTOs.BulkImportTeacherDto
                    {
                        FirstName = "Kabir",
                        LastName = "Singh",
                        Email = "kabir.singh@gmail.com",
                        DateOfBirth = "12-05-1985",
                        Department = "Mathematics",
                        OfficeLocation = "Room 101",
                        Qualifications = "M.Sc. Mathematics",
                        Specialization = "Algebra"
                    },
                    // Duplicate teacher (identical email) - should resolve to aarav.existing1@gmail.com
                    new EduVault.Core.DTOs.BulkImportTeacherDto
                    {
                        FirstName = "Aarav",
                        LastName = "Sharma",
                        Email = "aarav.existing@gmail.com",
                        DateOfBirth = "10-10-1990",
                        Department = "Science"
                    }
                }
            };

            // Act
            var result = await _controller.BulkImportTeachers(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<EduVault.Core.DTOs.BulkImportTeachersResult>(okResult.Value);

            Assert.Equal(2, response.SuccessCount);
            Assert.Empty(response.Duplicates);

            // Verify generated credentials for unique teacher
            var importedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "kabir.singh@gmail.com");
            Assert.NotNull(importedUser);
            Assert.Equal("hashed_teacher_password", importedUser.PasswordHash);

            // Verify duplicate email got resolved to suffix 1
            var resolvedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "aarav.existing1@gmail.com");
            Assert.NotNull(resolvedUser);
            Assert.Equal("Aarav", resolvedUser.FirstName);
        }

        [Fact]
        public async Task BulkImportStudents_FailsWhenRowCountExceeds100()
        {
            // Arrange
            var list = new List<EduVault.Core.DTOs.BulkImportStudentDto>();
            for (int i = 0; i < 101; i++)
            {
                list.Add(new EduVault.Core.DTOs.BulkImportStudentDto { FirstName = "Test" });
            }
            var request = new EduVault.Core.DTOs.BulkImportRequest { Students = list };

            // Act
            var result = await _controller.BulkImportStudents(request);

            // Assert
            var badResult = Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task BulkImportStudents_FailsWhenFormulaOrXssInjected()
        {
            // Arrange
            var request = new EduVault.Core.DTOs.BulkImportRequest
            {
                Students = new List<EduVault.Core.DTOs.BulkImportStudentDto>
                {
                    new EduVault.Core.DTOs.BulkImportStudentDto
                    {
                        FirstName = "=SUM(1,2)",
                        LastName = "Singh",
                        DateOfBirth = "12-05-2015",
                        GuardianName = "Rajesh Singh",
                        GuardianPhone = "+918888888888"
                    }
                }
            };

            // Act
            var result = await _controller.BulkImportStudents(request);

            // Assert
            var badResult = Assert.IsType<BadRequestObjectResult>(result);
        }
    }
}
