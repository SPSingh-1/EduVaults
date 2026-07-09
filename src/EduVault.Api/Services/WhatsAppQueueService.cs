using System;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EduVault.Api.Services
{
    public class WhatsAppQueueItem
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public Guid SchoolId { get; set; }
    }

    public interface IWhatsAppQueue
    {
        void QueueMessage(WhatsAppQueueItem item);
        ValueTask<WhatsAppQueueItem> DequeueAsync(CancellationToken cancellationToken);
    }

    public class WhatsAppQueue : IWhatsAppQueue
    {
        private readonly Channel<WhatsAppQueueItem> _channel;

        public WhatsAppQueue()
        {
            var options = new BoundedChannelOptions(1000)
            {
                FullMode = BoundedChannelFullMode.Wait
            };
            _channel = Channel.CreateBounded<WhatsAppQueueItem>(options);
        }

        public void QueueMessage(WhatsAppQueueItem item)
        {
            if (item == null) throw new ArgumentNullException(nameof(item));
            _channel.Writer.TryWrite(item);
        }

        public ValueTask<WhatsAppQueueItem> DequeueAsync(CancellationToken cancellationToken)
        {
            return _channel.Reader.ReadAsync(cancellationToken);
        }
    }

    public class WhatsAppQueueWorker : BackgroundService
    {
        private readonly IWhatsAppQueue _queue;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WhatsAppQueueWorker> _logger;

        public WhatsAppQueueWorker(IWhatsAppQueue queue, IServiceProvider serviceProvider, ILogger<WhatsAppQueueWorker> logger)
        {
            _queue = queue;
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WhatsApp Background Queue Worker starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var item = await _queue.DequeueAsync(stoppingToken);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var whatsAppService = scope.ServiceProvider.GetRequiredService<WhatsAppService>();
                        _logger.LogInformation("Processing WhatsApp queue item for {Phone} (School: {SchoolId})", item.PhoneNumber, item.SchoolId);
                        
                        await whatsAppService.SendMessageAsync(item.PhoneNumber, item.Message, item.SchoolId);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing WhatsApp queue background message.");
                }
            }

            _logger.LogInformation("WhatsApp Background Queue Worker stopped.");
        }
    }
}
