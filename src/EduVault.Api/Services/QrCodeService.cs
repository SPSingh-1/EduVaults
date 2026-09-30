using System;
using QRCoder;

namespace EduVault.Api.Services
{
    public class QrCodeService
    {
        public byte[] GeneratePng(string payload, int pixelsPerModule = 10)
        {
            if (string.IsNullOrWhiteSpace(payload))
            {
                throw new ArgumentException("Payload cannot be empty", nameof(payload));
            }

            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
            var qrCode = new PngByteQRCode(qrData);
            return qrCode.GetGraphic(pixelsPerModule);
        }
    }
}
