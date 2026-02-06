/**
 * Example: Custom Plugin
 */

const { WhatsAppValidator } = require('@whatsapp-tools/account-validator');

// Define custom plugin
const notificationPlugin = {
    name: 'notification-plugin',
    version: '1.0.0',

    onRegister(validator) {
        console.log('Notification plugin registered');
    },

    async post_validation(result) {
        // Send notification for banned accounts
        if (result.ban.isBanned) {
            console.log(`[ALERT] Account ${result.number} is ${result.ban.type}`);

            // You could send email, SMS, webhook, etc.
            // await sendEmail({ ... });
            // await sendWebhook({ ... });
        }
    }
};

// Logging plugin
const loggingPlugin = {
    name: 'logging-plugin',
    version: '1.0.0',

    async post_validation(result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            number: result.number,
            banned: result.ban.isBanned,
            type: result.ban.type,
            responseTime: result.diagnostics.responseTime
        };

        console.log('[LOG]', JSON.stringify(logEntry));

        // Save to database, file, etc.
    }
};

async function pluginExample(conn) {
    // Create validator with plugins
    const validator = new WhatsAppValidator(conn, {
        plugins: [notificationPlugin, loggingPlugin]
    });

    // Register additional plugin later
    const metricsPlugin = {
        name: 'metrics-plugin',
        version: '1.0.0',

        async post_validation(result) {
            // Track custom metrics
            console.log(`[METRICS] Validation completed in ${result.diagnostics.responseTime}ms`);
        }
    };

    validator.registerPlugin(metricsPlugin);

    // Listen to plugin events
    validator.on('plugin_registered', ({ name, version }) => {
        console.log(`Plugin loaded: ${name} v${version}`);
    });

    validator.on('plugin_error', ({ plugin, hook, error }) => {
        console.error(`Plugin ${plugin} failed at ${hook}:`, error);
    });

    // Validate
    const result = await validator.validate('201234567890');

    console.log('\nResult:', result.summary);
}

module.exports = pluginExample;
