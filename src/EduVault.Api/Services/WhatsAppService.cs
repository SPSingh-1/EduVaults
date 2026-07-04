using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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

                // Default provider is twilio
                string provider = "twilio";
                
                // Fetch school settings if schoolId is provided
                EduVault.Core.Entities.School? school = null;
                if (schoolId.HasValue)
                {
                    school = await _unitOfWork.Schools.GetByIdAsync(schoolId.Value);
                    if (school != null && !string.IsNullOrEmpty(school.WhatsAppProvider))
                    {
                        provider = school.WhatsAppProvider.ToLower();
                    }
                }

                // Clean the phone number (remove "whatsapp:" prefix and ensure international code)
                var rawPhone = toPhoneNumber.Trim();
                if (rawPhone.StartsWith("whatsapp:"))
                {
                    rawPhone = rawPhone.Substring("whatsapp:".Length).Trim();
                }
                if (!rawPhone.StartsWith("+"))
                {
                    // Default to India country code if not specified
                    rawPhone = $"+91{rawPhone}";
                }

                if (provider == "meta")
                {
                    if (school == null || string.IsNullOrEmpty(school.MetaAccessToken) || string.IsNullOrEmpty(school.MetaPhoneNumberId))
                    {
                        Console.WriteLine("[WHATSAPP ERROR] Meta integration selected but credentials (AccessToken or PhoneNumberId) are missing.");
                        return false;
                    }

                    // Meta expects number with country code, without '+' and non-digit characters
                    var metaTo = rawPhone.Replace("+", "").Replace(" ", "").Replace("-", "");
                    var url = $"https://graph.facebook.com/v18.0/{school.MetaPhoneNumberId}/messages";
                    
                    var request = new HttpRequestMessage(HttpMethod.Post, url);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", school.MetaAccessToken);

                    var payload = new
                    {
                        messaging_product = "whatsapp",
                        recipient_type = "individual",
                        to = metaTo,
                        type = "text",
                        text = new { body = messageBody }
                    };

                    var jsonString = JsonSerializer.Serialize(payload);
                    request.Content = new StringContent(jsonString, Encoding.UTF8, "application/json");

                    var response = await _httpClient.SendAsync(request);
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[WHATSAPP SUCCESS] Successfully sent Meta message to {metaTo}");
                        return true;
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[WHATSAPP ERROR] Meta failed sending to {metaTo}. Status: {response.StatusCode}. Response: {responseContent}");
                    return false;
                }
                else if (provider == "custom")
                {
                    if (school == null || string.IsNullOrEmpty(school.CustomProviderUrl))
                    {
                        Console.WriteLine("[WHATSAPP ERROR] Custom provider integration selected but CustomProviderUrl is missing.");
                        return false;
                    }

                    var url = school.CustomProviderUrl;
                    var request = new HttpRequestMessage(HttpMethod.Post, url);
                    
                    if (!string.IsNullOrEmpty(school.CustomProviderApiKey))
                    {
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", school.CustomProviderApiKey);
                    }

                    var payload = new
                    {
                        to = rawPhone,
                        message = messageBody,
                        from = school.CustomProviderFromNumber ?? ""
                    };

                    var jsonString = JsonSerializer.Serialize(payload);
                    request.Content = new StringContent(jsonString, Encoding.UTF8, "application/json");

                    var response = await _httpClient.SendAsync(request);
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[WHATSAPP SUCCESS] Successfully sent Custom API message to {rawPhone}");
                        return true;
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[WHATSAPP ERROR] Custom API failed sending to {rawPhone}. Status: {response.StatusCode}. Response: {responseContent}");
                    return false;
                }
                else
                {
                    // Default / Twilio
                    var accountSid = _configuration["Twilio:AccountSid"];
                    var authToken = _configuration["Twilio:AuthToken"];
                    var fromNumber = _configuration["Twilio:WhatsAppFromNumber"] ?? "whatsapp:+14155238886";

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

                    var twilioTo = $"whatsapp:{rawPhone}";

                    // If credentials are not set, simulate by logging and returning success
                    if (string.IsNullOrEmpty(accountSid) || string.IsNullOrEmpty(authToken))
                    {
                        Console.WriteLine($"[WHATSAPP SIMULATION] Sending Twilio to {twilioTo}: {messageBody}");
                        return true;
                    }

                    var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json";
                    var request = new HttpRequestMessage(HttpMethod.Post, url);
                    
                    var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));
                    request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

                    var postData = new List<KeyValuePair<string, string>>
                    {
                        new KeyValuePair<string, string>("From", fromNumber),
                        new KeyValuePair<string, string>("To", twilioTo),
                        new KeyValuePair<string, string>("Body", messageBody)
                    };

                    request.Content = new FormUrlEncodedContent(postData);

                    var response = await _httpClient.SendAsync(request);
                    if (response.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[WHATSAPP SUCCESS] Successfully sent Twilio message to {twilioTo}");
                        return true;
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[WHATSAPP ERROR] Twilio failed sending to {twilioTo}. Status: {response.StatusCode}. Response: {responseContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP EXCEPTION] Error sending message: {ex.Message}");
                return false;
            }
        }
    }
}
