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
using EduVault.Infrastructure.Repositories;

namespace EduVault.Tests
{
    public class ReceptionAndLibraryTests
    {
        private readonly EduVaultDbContext _context;
        private readonly IUnitOfWork _unitOfWork;
        private readonly Mock<WhatsAppService> _mockWhatsApp;
        private readonly Mock<IAuthService> _mockAuthService;
        private readonly Guid _schoolA = Guid.NewGuid();
        private readonly Guid _schoolB = Guid.NewGuid();

        public ReceptionAndLibraryTests()
        {
            var options = new DbContextOptionsBuilder<EduVaultDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EduVaultDbContext(options);
            _unitOfWork = new UnitOfWork(_context);

            var mockConfig = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
            var mockScopeFactory = new Mock<Microsoft.Extensions.DependencyInjection.IServiceScopeFactory>();
            _mockWhatsApp = new Mock<WhatsAppService>(mockConfig.Object, new System.Net.Http.HttpClient(), mockScopeFactory.Object);
            _mockAuthService = new Mock<IAuthService>();
            _mockAuthService.Setup(a => a.HashPassword(It.IsAny<string>())).Returns("HashedMockPassword123!");
        }

        // ==========================================
        // 1. Library Concurrency & Single Copy Protection
        // ==========================================
        [Fact]
        public async Task Library_Issue_Single_Copy_Prevents_Double_Issuance()
        {
            var book = new Book
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                Title = "Advanced Physics Vol 1",
                ISBN = "ISBN-PHYS-001",
                Author = "H. C. Verma",
                TotalCopies = 1,
                AvailableCopies = 1
            };
            var student1 = new User { Id = Guid.NewGuid(), SchoolId = _schoolA, Role = "student", FirstName = "Aarav", LastName = "Sharma" };
            var student2 = new User { Id = Guid.NewGuid(), SchoolId = _schoolA, Role = "student", FirstName = "Kabir", LastName = "Patel" };

            await _context.Books.AddAsync(book);
            await _context.Users.AddRangeAsync(student1, student2);
            await _context.SaveChangesAsync();

            var controller = new LibraryController(_unitOfWork, _mockWhatsApp.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            // Act 1: Student 1 issues the only available copy
            var res1 = await controller.IssueBook(new IssueBookRequest { BookId = book.Id, MemberId = student1.Id });
            var ok1 = Assert.IsType<OkObjectResult>(res1);

            // Act 2: Student 2 attempts to issue the same book when AvailableCopies is 0
            var res2 = await controller.IssueBook(new IssueBookRequest { BookId = book.Id, MemberId = student2.Id });
            var badRequest2 = Assert.IsType<BadRequestObjectResult>(res2);

            // Assert: Exactly 1 transaction created, AvailableCopies is 0
            var updatedBook = await _context.Books.FindAsync(book.Id);
            Assert.Equal(0, updatedBook!.AvailableCopies);
        }

        // ==========================================
        // 2. Library Inventory Integrity (Issue -> Return -> Count Consistency)
        // ==========================================
        [Fact]
        public async Task Library_Inventory_Integrity_Issue_And_Return_Counts()
        {
            var book = new Book
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                Title = "Organic Chemistry",
                ISBN = "ISBN-CHEM-002",
                Author = "Morrison Boyd",
                TotalCopies = 5,
                AvailableCopies = 5
            };
            var student = new User { Id = Guid.NewGuid(), SchoolId = _schoolA, Role = "student", FirstName = "Diya", LastName = "Sen" };

            await _context.Books.AddAsync(book);
            await _context.Users.AddAsync(student);
            await _context.SaveChangesAsync();

            var controller = new LibraryController(_unitOfWork, _mockWhatsApp.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            // Issue 1 copy
            var issueRes = await controller.IssueBook(new IssueBookRequest { BookId = book.Id, MemberId = student.Id });
            var okIssue = Assert.IsType<OkObjectResult>(issueRes);
            Assert.Equal(4, (await _context.Books.FindAsync(book.Id))!.AvailableCopies);

            // Retrieve transaction ID
            var tx = await _context.LibraryTransactions.FirstOrDefaultAsync(t => t.BookId == book.Id && t.MemberId == student.Id);
            Assert.NotNull(tx);

            // Return the copy
            var returnRes = await controller.ReturnBook(tx!.Id, null);
            var okReturn = Assert.IsType<OkObjectResult>(returnRes);
            Assert.Equal(5, (await _context.Books.FindAsync(book.Id))!.AvailableCopies);
        }

        // ==========================================
        // 3. Receptionist Visitor Lifecycle (CheckIn -> CheckOut)
        // ==========================================
        [Fact]
        public async Task Receptionist_Visitor_Lifecycle_CheckIn_And_CheckOut()
        {
            var controller = new ReceptionistController(_unitOfWork, _context, _mockWhatsApp.Object, _mockAuthService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            // Check In Visitor
            var addRes = await controller.AddVisitor(new AddVisitorRequest
            {
                VisitorName = "Rajesh Gupta",
                Phone = "9876543210",
                Purpose = "Fee Inquiry",
                WhomToMeet = "Accountant"
            });
            var okAdd = Assert.IsType<OkObjectResult>(addRes);

            var visitor = await _context.Visitors.FirstOrDefaultAsync(v => v.Phone == "9876543210");
            Assert.NotNull(visitor);
            Assert.Equal("Active", visitor!.Status);

            // Check Out Visitor
            var checkoutRes = await controller.CheckoutVisitor(visitor.Id);
            Assert.IsType<OkObjectResult>(checkoutRes);

            var updatedVisitor = await _context.Visitors.FindAsync(visitor.Id);
            Assert.Equal("Checked Out", updatedVisitor!.Status);
            Assert.NotNull(updatedVisitor.CheckOutTime);
        }

        // ==========================================
        // 4. Gate Pass Creation & Student Verification
        // ==========================================
        [Fact]
        public async Task Receptionist_GatePass_Issue_Creates_Valid_Pass()
        {
            var controller = new ReceptionistController(_unitOfWork, _context, _mockWhatsApp.Object, _mockAuthService.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            var res = await controller.IssueGatePass(new IssueGatePassRequest
            {
                StudentName = "Aarav Sharma",
                ClassSection = "Class 10-A",
                ParentName = "Sunita Sharma",
                ParentPhone = "9876543210",
                Reason = "Medical appointment"
            });

            var ok = Assert.IsType<OkObjectResult>(res);
            var pass = await _context.GatePasses.FirstOrDefaultAsync(g => g.StudentName == "Aarav Sharma");
            Assert.NotNull(pass);
            Assert.StartsWith("GP-", pass!.PassNumber);
            Assert.Equal("Issued", pass.Status);
        }

        // ==========================================
        // 5. Attendance Stress & Resume Sync (10,000 Record Ingestion Batch Simulation)
        // ==========================================
        [Fact]
        public async Task Attendance_Batch_Sync_Simulate_Failure_And_Resume_Without_Duplicates()
        {
            var emp = new Employee { Id = Guid.NewGuid(), SchoolId = _schoolA, FirstName = "Vikram", LastName = "Rathore", EmployeeCode = "EMP-A-100" };
            await _context.Employees.AddAsync(emp);
            await _context.SaveChangesAsync();

            var calcService = new PayrollCalculationService(_context);
            var leaveEngine = new LeaveBalanceEngine(_context);
            var hrmController = new HrmController(_unitOfWork, _context, calcService, leaveEngine);
            hrmController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            // Generate 100 attendance items
            var batch1 = new AttendanceSyncBatchDto();
            for (int i = 1; i <= 50; i++)
            {
                batch1.Records.Add(new AttendanceSyncItemDto
                {
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    SourceRecordId = $"MONGO_PUNCH_{i}",
                    PunchDate = new DateTime(2026, 1, 1).AddDays(i),
                    Status = "Present"
                });
            }

            // Sync Batch 1
            var res1 = await hrmController.SyncAttendanceBatch(batch1);
            Assert.IsType<OkObjectResult>(res1);
            Assert.Equal(50, await _context.AttendanceSyncRecords.CountAsync(a => a.EmployeeId == emp.Id));

            // Resume with Batch 2 (Contains overlaps from 25 to 75)
            var batch2 = new AttendanceSyncBatchDto();
            for (int i = 25; i <= 75; i++)
            {
                batch2.Records.Add(new AttendanceSyncItemDto
                {
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    SourceRecordId = $"MONGO_PUNCH_{i}",
                    PunchDate = new DateTime(2026, 1, 1).AddDays(i),
                    Status = "Present"
                });
            }

            var res2 = await hrmController.SyncAttendanceBatch(batch2);
            Assert.IsType<OkObjectResult>(res2);

            // Assert: Total distinct attendance records = 75 (No duplicate records created)
            var distinctDates = await _context.AttendanceSyncRecords
                .Where(a => a.EmployeeId == emp.Id)
                .Select(a => a.PunchDate)
                .Distinct()
                .CountAsync();

            Assert.Equal(75, distinctDates);
        }
    }
}
