using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using EduVault.Core.Interfaces;

namespace EduVault.Api.Services
{
    public class WhatsAppService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly IUnitOfWork _unitOfWork;

        public WhatsAppService(IConfiguration configuration, HttpClient httpClient, IUnitOfWork unitOfWork)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _unitOfWork = unitOfWork;
        }

        public async Task<bool> SendMessageAsync(string toPhoneNumber, string messageBody, Guid? schoolId = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(toPhoneNumber))
                {
                    return false;
                }

                // Default settings from appsettings
                var accountSid = _configuration["Twilio:AccountSid"];
                var authToken = _configuration["Twilio:AuthToken"];
                var fromNumber = _configuration["Twilio:WhatsAppFromNumber"] ?? "whatsapp:+14155238886";

                // Override with school-specific credentials if they exist
                if (schoolId.HasValue)
                {
                    var school = await _unitOfWork.Schools.GetByIdAsync(schoolId.Value);
                    if (school != null)
                    {
                        if (!string.IsNullOrEmpty(school.TwilioAccountSid))
                        {
                            accountSid = school.TwilioAccountSid;
                        }
                        if (!string.IsNullOrEmpty(school.TwilioAuthToken))
                        {
                            authToken = school.TwilioAuthToken;
                        }
                        if (!string.IsNullOrEmpty(school.TwilioWhatsAppFromNumber))
                        {
                            fromNumber = school.TwilioWhatsAppFromNumber;
                        }
                    }
                }

                // Format number to international if needed
                var formattedTo = toPhoneNumber.Trim();
                if (!formattedTo.StartsWith("+"))
                {
                    // Default to India country code if not specified
                    formattedTo = $"+91{formattedTo}";
                }
                
                if (!formattedTo.StartsWith("whatsapp:"))
                {
                    formattedTo = $"whatsapp:{formattedTo}";
                }

                // If credentials are not set, simulate by logging and returning success
                if (string.IsNullOrEmpty(accountSid) || string.IsNullOrEmpty(authToken))
                {
                    Console.WriteLine($"[WHATSAPP SIMULATION] Sending to {formattedTo}: {messageBody} (Using default configuration / simulation mode)");
                    return true;
                }

                var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";
                var request = new HttpRequestMessage(HttpMethod.Post, url);
                
                var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

                var postData = new List<KeyValuePair<string, string>>
                {
                    new KeyValuePair<string, string>("From", fromNumber),
                    new KeyValuePair<string, string>("To", formattedTo),
                    new KeyValuePair<string, string>("Body", messageBody)
                };

                request.Content = new FormUrlEncodedContent(postData);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[WHATSAPP SUCCESS] Successfully sent message to {formattedTo} using Twilio Account {accountSid}");
                    return true;
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[WHATSAPP ERROR] Failed sending to {formattedTo}. Status: {response.StatusCode}. Response: {responseContent}");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP EXCEPTION] Error sending message: {ex.Message}");
                return false;
            }
        }
    }
}
