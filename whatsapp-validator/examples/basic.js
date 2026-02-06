/**
 * Example: Basic Validation
 */

const { WhatsAppValidator } = require('@whatsapp-tools/account-validator');

async function basicExample(conn) {
    // Create validator
    const validator = new WhatsAppValidator(conn);

    // Validate single account
    const result = await validator.validate('201234567890');

    // Check result
    if (result.ban.isBanned) {
        console.log(`Account is banned: ${result.ban.type}`);
        console.log(`Review available: ${result.review.available}`);
        console.log(`Estimated time: ${result.review.estimatedTime}`);
    } else {
        console.log('Account is active and healthy');
    }

    // Print detailed report
    console.log(validator.formatDetailed(result));
}

module.exports = basicExample;
