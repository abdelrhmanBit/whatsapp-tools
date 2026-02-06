/**
 * Example: Batch Validation with Analytics
 */

const { WhatsAppValidator } = require('@whatsapp-tools/account-validator');
const fs = require('fs');

async function batchExample(conn) {
    // Create validator with all features
    const validator = new WhatsAppValidator(conn, {
        enableAnalytics: true,
        enableMLDetection: true,
        enableCache: true,
        parallelProbes: true
    });

    // List of numbers to validate
    const numbers = [
        '201234567890',
        '201234567891',
        '201234567892',
        '201234567893',
        '201234567894'
    ];

    // Monitor progress
    validator.on('batch_progress', ({ completed, total }) => {
        const percent = ((completed / total) * 100).toFixed(1);
        console.log(`Progress: ${percent}% (${completed}/${total})`);
    });

    // Validate batch
    console.log('Starting batch validation...');
    const results = await validator.validateBatch(numbers, {
        batchSize: 3,
        delayBetweenBatches: 2000
    });

    // Analyze results
    const bannedAccounts = results.filter(r => r.ban.isBanned);
    const activeAccounts = results.filter(r => !r.ban.isBanned);

    console.log(`\nResults:`);
    console.log(`Total: ${results.length}`);
    console.log(`Active: ${activeAccounts.length}`);
    console.log(`Banned: ${bannedAccounts.length}`);

    // Get analytics
    const analytics = validator.getAnalytics();
    console.log(`\nAnalytics:`);
    console.log(`Total validations: ${analytics.summary.totalValidations}`);
    console.log(`Avg response time: ${analytics.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`Ban types:`, analytics.summary.banTypes);

    // Cache stats
    const cacheStats = validator.getCacheStats();
    console.log(`\nCache:`);
    console.log(`Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Size: ${cacheStats.size}/${cacheStats.maxSize}`);

    // Export to CSV
    const csv = validator.exportCSV(results);
    fs.writeFileSync('results.csv', csv);
    console.log('\nResults exported to results.csv');

    // Export to JSON
    const json = JSON.stringify(results, null, 2);
    fs.writeFileSync('results.json', json);
    console.log('Results exported to results.json');
}

module.exports = batchExample;
