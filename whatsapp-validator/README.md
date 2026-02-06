# WhatsApp Account Validator v2.0

Enterprise-grade WhatsApp account validation library with ML-powered ban detection, advanced analytics, and comprehensive compliance checking.

## Features

### Core Capabilities
- **ML-Powered Detection**: Machine learning pattern recognition for accurate ban type identification
- **Multi-Probe Validation**: Parallel or sequential execution of multiple verification methods
- **Intelligent Caching**: LRU cache with configurable TTL for performance optimization
- **Rate Limiting**: Built-in rate limiter to prevent API abuse
- **Batch Processing**: Validate multiple accounts efficiently with automatic batching
- **Analytics Engine**: Comprehensive metrics and trend analysis
- **Plugin System**: Extensible architecture for custom functionality
- **Health Monitoring**: Real-time health status and degradation detection
- **Event System**: EventEmitter-based hooks for all major operations

### Advanced Features
- Automatic retry with exponential backoff
- Fallback mechanisms for unreliable networks
- Error pattern analysis with confidence scoring
- Account age estimation
- Business account detection
- Presence and status checking
- CSV/JSON export capabilities
- Detailed diagnostic information

## Installation

```bash
npm install @whatsapp-tools/account-validator
```

## Quick Start

```javascript
const { WhatsAppValidator } = require('@whatsapp-tools/account-validator');

// Initialize with Baileys connection
const validator = new WhatsAppValidator(conn);

// Simple validation
const result = await validator.validate('201234567890');
console.log(validator.formatSimple(result));
```

## Configuration Options

```javascript
const validator = new WhatsAppValidator(conn, {
  // Probe Configuration
  timeout: 8000,                    // Timeout per probe (ms)
  parallelProbes: true,             // Execute probes in parallel
  enablePresenceCheck: true,        // Check presence status
  enableContactCheck: true,         // Check contact info (if available)
  
  // Retry Configuration
  retryOnFailure: true,             // Enable automatic retry
  maxRetries: 2,                    // Maximum retry attempts
  
  // Cache Configuration
  enableCache: true,                // Enable result caching
  cacheTTL: 3600000,                // Cache TTL in ms (1 hour)
  
  // Rate Limiting
  enableRateLimiting: true,         // Enable rate limiting
  rateLimit: {
    maxRequests: 10,                // Max requests per window
    windowMs: 60000                 // Time window in ms
  },
  
  // Advanced Features
  enableAnalytics: true,            // Enable analytics tracking
  enableMLDetection: true,          // Enable ML pattern detection
  logErrors: false,                 // Log errors to console
  
  // Plugin System
  plugins: []                       // Array of plugin instances
});
```

## API Reference

### Main Methods

#### `validate(phoneNumber, options)`

Validate a single WhatsApp account.

```javascript
const result = await validator.validate('201234567890', {
  skipCache: false  // Optional: skip cache lookup
});
```

**Returns:** `ValidationResult` object

#### `validateBatch(phoneNumbers, options)`

Validate multiple accounts efficiently.

```javascript
const results = await validator.validateBatch(
  ['201234567890', '201234567891', '201234567892'],
  {
    batchSize: 5,              // Accounts per batch
    delayBetweenBatches: 2000  // Delay in ms
  }
);
```

**Returns:** Array of `ValidationResult` objects

### Utility Methods

#### `getAnalytics()`

Get comprehensive analytics report.

```javascript
const analytics = validator.getAnalytics();
console.log(analytics.summary);
console.log(analytics.trends);
console.log(analytics.recommendations);
```

#### `getCacheStats()`

Get cache performance statistics.

```javascript
const stats = validator.getCacheStats();
// { size, hits, misses, hitRate, maxSize }
```

#### `getRateLimitStatus()`

Get current rate limit status.

```javascript
const status = validator.getRateLimitStatus();
// { activeRequests, maxRequests, remaining, resetAt }
```

#### `getHealth()`

Get validator health status.

```javascript
const health = validator.getHealth();
// { status, lastCheck, consecutiveFailures, totalChecks }
```

### Export Methods

#### `exportJSON(result)`

Export result as formatted JSON.

```javascript
const json = validator.exportJSON(result);
```

#### `exportCSV(results)`

Export results as CSV.

```javascript
const csv = validator.exportCSV(results);
```

### Format Methods

#### `formatSimple(result)`

Format result as simple text.

```javascript
console.log(validator.formatSimple(result));
```

#### `formatDetailed(result)`

Format result as detailed report.

```javascript
console.log(validator.formatDetailed(result));
```

## Validation Result Structure

```javascript
{
  number: string,              // Phone number
  jid: string,                 // WhatsApp JID
  timestamp: number,           // Validation timestamp
  isRegistered: boolean,       // Registration status
  isActive: boolean,           // Active status
  
  ban: {
    isBanned: boolean,         // Ban status
    type: string,              // 'none' | 'spam' | 'violation' | 'permanent'
    detectionMethods: [],      // Array of detection methods used
    mlConfidence: number       // ML confidence score (0-1)
  },
  
  review: {
    available: boolean,        // Review availability
    type: string,              // 'none' | 'self_appeal' | 'support_required'
    estimatedTime: string      // Estimated review time
  },
  
  account: {
    hasStatus: boolean,        // Has status
    statusText: string,        // Status text
    hasProfilePicture: boolean,// Has profile picture
    isBusinessAccount: boolean,// Is business account
    age: string,               // 'unknown' | 'new' | 'medium' | 'old'
    presenceAvailable: boolean // Presence available
  },
  
  diagnostics: {
    responseTime: number,      // Total response time (ms)
    probsExecuted: number,     // Total probes executed
    probsSuccessful: number,   // Successful probes
    errorDetails: [],          // Error details array
    fallbacksUsed: [],         // Fallbacks used
    probeResults: []           // Individual probe results
  },
  
  recommendations: [],         // Array of recommendations
  summary: string              // Summary text
}
```

## Ban Types

### Spam
- **Detection**: Rate limiting, bulk messaging patterns
- **Review Type**: Self-appeal
- **Estimated Time**: 24-48 hours
- **Action**: Submit appeal through WhatsApp app

### Violation
- **Detection**: Policy violations, forbidden access
- **Review Type**: Contact support
- **Estimated Time**: 3-7 days
- **Action**: Contact WhatsApp support with identity verification

### Permanent
- **Detection**: Account terminated
- **Review Type**: None
- **Estimated Time**: N/A
- **Action**: Use new number with compliance

## Events

The validator extends EventEmitter and emits the following events:

```javascript
validator.on('validation_start', (data) => {
  console.log('Starting validation:', data.phoneNumber);
});

validator.on('validation_complete', (data) => {
  console.log('Completed:', data.result.summary);
});

validator.on('validation_error', (data) => {
  console.error('Error:', data.error);
});

validator.on('cache_hit', (data) => {
  console.log('Cache hit:', data.phoneNumber);
});

validator.on('batch_start', (data) => {
  console.log(`Batch started: ${data.total} accounts`);
});

validator.on('batch_progress', (data) => {
  console.log(`Progress: ${data.completed}/${data.total}`);
});

validator.on('batch_complete', (data) => {
  console.log('Batch completed');
});

validator.on('health_degraded', (health) => {
  console.warn('Health degraded:', health);
});

validator.on('health_critical', (health) => {
  console.error('Health critical:', health);
});

validator.on('plugin_registered', (data) => {
  console.log(`Plugin registered: ${data.name} v${data.version}`);
});

validator.on('plugin_error', (data) => {
  console.error(`Plugin error: ${data.plugin}`, data.error);
});
```

## Plugin System

Create custom plugins to extend functionality:

```javascript
const myPlugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  
  // Called when plugin is registered
  onRegister(validator) {
    console.log('Plugin registered');
  },
  
  // Called after validation
  async post_validation(result) {
    // Custom logic here
    console.log('Validation complete:', result.summary);
  }
};

const validator = new WhatsAppValidator(conn, {
  plugins: [myPlugin]
});

// Or register later
validator.registerPlugin(myPlugin);
```

### Available Hooks
- `onRegister(validator)`: Called when plugin is registered
- `post_validation(result)`: Called after validation completes

## Examples

### Basic Validation

```javascript
const { WhatsAppValidator } = require('@whatsapp-tools/account-validator');

const validator = new WhatsAppValidator(conn);
const result = await validator.validate('201234567890');

if (result.ban.isBanned) {
  console.log(`Account is banned: ${result.ban.type}`);
  console.log(`Review available: ${result.review.available}`);
  
  if (result.review.available) {
    console.log(`Review type: ${result.review.type}`);
    console.log(`Estimated time: ${result.review.estimatedTime}`);
  }
} else {
  console.log('Account is active and healthy');
}
```

### Batch Validation with Analytics

```javascript
const numbers = [
  '201234567890',
  '201234567891',
  '201234567892',
  // ... more numbers
];

const validator = new WhatsAppValidator(conn, {
  enableAnalytics: true,
  parallelProbes: true
});

const results = await validator.validateBatch(numbers, {
  batchSize: 5,
  delayBetweenBatches: 2000
});

// Get analytics
const analytics = validator.getAnalytics();
console.log(`Total validated: ${analytics.summary.totalValidations}`);
console.log(`Banned accounts: ${analytics.summary.bannedAccounts}`);
console.log(`Ban types:`, analytics.summary.banTypes);

// Export to CSV
const csv = validator.exportCSV(results);
require('fs').writeFileSync('results.csv', csv);
```

### With Event Monitoring

```javascript
const validator = new WhatsAppValidator(conn);

// Monitor progress
validator.on('batch_progress', ({ completed, total }) => {
  const percent = ((completed / total) * 100).toFixed(1);
  console.log(`Progress: ${percent}%`);
});

// Monitor health
validator.on('health_degraded', (health) => {
  console.warn(`Health degraded: ${health.consecutiveFailures} failures`);
});

const results = await validator.validateBatch(numbers);
```

### Advanced Configuration

```javascript
const validator = new WhatsAppValidator(conn, {
  // Optimize for speed
  parallelProbes: true,
  timeout: 5000,
  maxRetries: 1,
  
  // Enable all features
  enableCache: true,
  enableAnalytics: true,
  enableMLDetection: true,
  enableRateLimiting: true,
  
  // Custom rate limit
  rateLimit: {
    maxRequests: 20,
    windowMs: 60000
  },
  
  // Logging
  logErrors: true
});

// Event-driven validation
validator.on('validation_complete', ({ result }) => {
  if (result.ban.isBanned) {
    // Send notification, log to database, etc.
  }
});

const result = await validator.validate('201234567890');
```

### Using ML Detection

```javascript
const validator = new WhatsAppValidator(conn, {
  enableMLDetection: true
});

const result = await validator.validate('201234567890');

if (result.ban.isBanned) {
  console.log(`Ban type: ${result.ban.type}`);
  console.log(`ML Confidence: ${(result.ban.mlConfidence * 100).toFixed(1)}%`);
  console.log(`Detection methods: ${result.ban.detectionMethods.join(', ')}`);
}
```

## Best Practices

### 1. Rate Limiting
Always enable rate limiting in production to avoid throttling:

```javascript
const validator = new WhatsAppValidator(conn, {
  enableRateLimiting: true,
  rateLimit: {
    maxRequests: 10,
    windowMs: 60000
  }
});
```

### 2. Caching
Enable caching for frequently checked numbers:

```javascript
const validator = new WhatsAppValidator(conn, {
  enableCache: true,
  cacheTTL: 3600000  // 1 hour
});
```

### 3. Error Handling
Always handle errors gracefully:

```javascript
try {
  const result = await validator.validate(number);
} catch (error) {
  console.error('Validation failed:', error);
  // Implement fallback logic
}
```

### 4. Batch Processing
Use batch validation for multiple accounts:

```javascript
// Good: Batch with delays
const results = await validator.validateBatch(numbers, {
  batchSize: 5,
  delayBetweenBatches: 2000
});

// Avoid: Rapid sequential validation
for (const num of numbers) {
  await validator.validate(num);  // May cause rate limiting
}
```

### 5. Health Monitoring
Monitor validator health in production:

```javascript
validator.on('health_degraded', (health) => {
  // Send alert, reduce load, etc.
  console.warn('Validator health degraded');
});

setInterval(() => {
  const health = validator.getHealth();
  if (health.status !== 'healthy') {
    // Take action
  }
}, 60000);
```

### 6. Analytics
Track metrics for insights:

```javascript
setInterval(() => {
  const analytics = validator.getAnalytics();
  
  if (analytics.trends.recentBanRate > 0.5) {
    console.warn('High ban rate detected');
  }
  
  console.log('Cache hit rate:', validator.getCacheStats().hitRate);
}, 300000);  // Every 5 minutes
```

## Performance Tips

1. **Use parallel probes** for faster validation
2. **Enable caching** to reduce redundant checks
3. **Adjust timeouts** based on network conditions
4. **Batch process** multiple accounts
5. **Monitor rate limits** to avoid throttling
6. **Use appropriate batch sizes** (5-10 recommended)

## Troubleshooting

### High Failure Rate
```javascript
const health = validator.getHealth();
if (health.consecutiveFailures > 5) {
  // Check connection
  // Verify credentials
  // Increase timeout
}
```

### Slow Response Times
```javascript
const analytics = validator.getAnalytics();
if (analytics.trends.avgResponseTime > 10000) {
  // Reduce timeout
  // Use parallel probes
  // Check network
}
```

### Rate Limiting Issues
```javascript
const status = validator.getRateLimitStatus();
console.log(`Remaining requests: ${status.remaining}`);
console.log(`Reset at: ${new Date(status.resetAt)}`);
```

## Advanced Topics

### Custom Plugins

```javascript
const notificationPlugin = {
  name: 'notification-plugin',
  version: '1.0.0',
  
  async post_validation(result) {
    if (result.ban.isBanned) {
      // Send notification
      await sendEmail({
        subject: 'Account Banned',
        body: `Account ${result.number} is ${result.ban.type}`
      });
    }
  }
};
```

### Extending Validation

```javascript
class CustomValidator extends WhatsAppValidator {
  async validate(phoneNumber, options) {
    // Pre-validation logic
    const result = await super.validate(phoneNumber, options);
    
    // Post-validation logic
    if (result.ban.isBanned) {
      await this.logToDatabase(result);
    }
    
    return result;
  }
}
```

## Support

- **Issues**: https://github.com/whatsapp-tools/account-validator/issues
- **Discussions**: https://github.com/whatsapp-tools/account-validator/discussions
- **Documentation**: https://whatsapp-tools.github.io/account-validator

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for guidelines.

## Changelog

### v2.0.0
- ML-powered pattern detection
- Advanced analytics engine
- Intelligent caching system
- Rate limiting
- Batch processing
- Plugin system
- Health monitoring
- Event-driven architecture
- Export capabilities

### v1.0.0
- Initial release
- Basic validation
- Multi-probe testing
- Retry logic
- Simple formatting
