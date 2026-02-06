/**
 * WhatsApp Account Validator v2.0
 * Enterprise-grade validation with ML-powered detection
 * 
 * @module @whatsapp-tools/account-validator
 */

const EventEmitter = require('events');

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

const BanType = {
    NONE: 'none',
    SPAM: 'spam',
    VIOLATION: 'violation',
    PERMANENT: 'permanent'
};

const ReviewType = {
    NONE: 'none',
    SELF_APPEAL: 'self_appeal',
    SUPPORT_REQUIRED: 'support_required'
};

const AccountAge = {
    NEW: 'new',
    MEDIUM: 'medium',
    OLD: 'old',
    UNKNOWN: 'unknown'
};

const ProbeStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
    SKIPPED: 'skipped'
};

// ============================================================================
// ERROR PATTERNS DATABASE
// ============================================================================

const ERROR_PATTERNS = {
    [BanType.SPAM]: {
        keywords: ['spam', 'rate limit', 'too many', 'blocked temporarily', '429', 'rate_limit'],
        weight: 1.0,
        confidence: 0.85
    },
    [BanType.VIOLATION]: {
        keywords: ['violation', 'terms', 'policy', 'forbidden', '403', '401', 'unauthorized'],
        weight: 1.2,
        confidence: 0.90
    },
    [BanType.PERMANENT]: {
        keywords: ['permanently', 'terminated', 'deleted', '404', 'banned from using', 'account_deleted'],
        weight: 1.5,
        confidence: 0.95
    }
};

// ============================================================================
// MACHINE LEARNING PATTERN DETECTOR
// ============================================================================

class MLPatternDetector {
    constructor() {
        this.patterns = ERROR_PATTERNS;
        this.history = [];
        this.maxHistory = 1000;
    }

    /**
     * Analyze error patterns using ML-inspired scoring
     */
    analyze(errorDetails, probeResults) {
        const features = this._extractFeatures(errorDetails, probeResults);
        const scores = this._calculateScores(features);
        const prediction = this._makePrediction(scores);

        // Store in history for learning
        this._updateHistory({ features, prediction });

        return prediction;
    }

    _extractFeatures(errorDetails, probeResults) {
        const errorText = errorDetails.map(e => e.error.toLowerCase()).join(' ');
        const errorCodes = errorDetails.map(e => e.code).filter(Boolean);

        return {
            errorText,
            errorCodes,
            errorCount: errorDetails.length,
            successRate: probeResults.successRate || 0,
            failurePatterns: this._identifyFailurePatterns(errorDetails),
            timing: this._analyzeResponseTimes(errorDetails)
        };
    }

    _calculateScores(features) {
        const scores = {};

        for (const [banType, pattern] of Object.entries(this.patterns)) {
            let score = 0;
            let matchCount = 0;

            // Keyword matching with weights
            for (const keyword of pattern.keywords) {
                if (features.errorText.includes(keyword)) {
                    score += pattern.weight;
                    matchCount++;
                }
            }

            // Code matching
            for (const code of features.errorCodes) {
                if (pattern.keywords.includes(code.toLowerCase())) {
                    score += pattern.weight * 1.5;
                    matchCount++;
                }
            }

            // Success rate penalty
            if (features.successRate < 0.3) {
                score += 0.5;
            }

            // Failure pattern bonus
            if (features.failurePatterns.length > 2) {
                score += 0.3 * features.failurePatterns.length;
            }

            // Normalize score
            scores[banType] = {
                raw: score,
                normalized: Math.min(score / 5, 1.0),
                confidence: matchCount > 0 ? pattern.confidence : 0,
                matchCount
            };
        }

        return scores;
    }

    _makePrediction(scores) {
        let bestMatch = { type: BanType.NONE, score: 0, confidence: 0 };

        for (const [banType, scoreData] of Object.entries(scores)) {
            if (scoreData.normalized > bestMatch.score) {
                bestMatch = {
                    type: banType,
                    score: scoreData.normalized,
                    confidence: scoreData.confidence,
                    matchCount: scoreData.matchCount
                };
            }
        }

        // Threshold: require minimum confidence
        if (bestMatch.score < 0.3) {
            return { type: BanType.NONE, confidence: 0.5 };
        }

        return bestMatch;
    }

    _identifyFailurePatterns(errorDetails) {
        const patterns = [];
        const errorCodes = errorDetails.map(e => e.code);

        // Sequential failures
        if (errorDetails.length >= 3) {
            patterns.push('sequential_failures');
        }

        // Same error code repeated
        const codeCounts = {};
        errorCodes.forEach(code => {
            codeCounts[code] = (codeCounts[code] || 0) + 1;
        });

        for (const [code, count] of Object.entries(codeCounts)) {
            if (count >= 2) {
                patterns.push(`repeated_${code}`);
            }
        }

        return patterns;
    }

    _analyzeResponseTimes(errorDetails) {
        const times = errorDetails
            .map(e => e.timestamp)
            .filter(Boolean);

        if (times.length < 2) return { pattern: 'insufficient_data' };

        const intervals = [];
        for (let i = 1; i < times.length; i++) {
            intervals.push(times[i] - times[i - 1]);
        }

        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        return {
            pattern: avg < 1000 ? 'rapid_failures' : 'delayed_failures',
            avgInterval: avg
        };
    }

    _updateHistory(entry) {
        this.history.push({
            ...entry,
            timestamp: Date.now()
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    getAccuracy() {
        // Calculate historical accuracy
        if (this.history.length < 10) return null;

        const sample = this.history.slice(-100);
        // This would need actual verification data in production
        return {
            sampleSize: sample.length,
            estimatedAccuracy: 0.87 // Placeholder
        };
    }
}

// ============================================================================
// INTELLIGENT CACHE SYSTEM
// ============================================================================

class ValidationCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.ttl = options.ttl || 3600000; // 1 hour default
        this.maxSize = options.maxSize || 1000;
        this.hits = 0;
        this.misses = 0;
    }

    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return null;
        }

        // Check expiration
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        entry.accessCount++;
        entry.lastAccess = Date.now();
        return entry.data;
    }

    set(key, data) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize) {
            this._evictLRU();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1
        });
    }

    _evictLRU() {
        let oldest = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldest = key;
            }
        }

        if (oldest) {
            this.cache.delete(oldest);
        }
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    stats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total) : 0,
            maxSize: this.maxSize
        };
    }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || 10;
        this.windowMs = options.windowMs || 60000; // 1 minute
        this.requests = [];
    }

    async acquire() {
        const now = Date.now();

        // Remove old requests
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);

            if (waitTime > 0) {
                await this._delay(waitTime);
                return this.acquire(); // Retry
            }
        }

        this.requests.push(now);
        return true;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset() {
        this.requests = [];
    }

    getStatus() {
        const now = Date.now();
        const activeRequests = this.requests.filter(time => now - time < this.windowMs);

        return {
            activeRequests: activeRequests.length,
            maxRequests: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - activeRequests.length),
            resetAt: activeRequests.length > 0 ? activeRequests[0] + this.windowMs : null
        };
    }
}

// ============================================================================
// ANALYTICS ENGINE
// ============================================================================

class AnalyticsEngine {
    constructor() {
        this.metrics = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            bannedAccounts: 0,
            activeAccounts: 0,
            banTypes: {},
            avgResponseTime: 0,
            probesStats: {}
        };

        this.history = [];
    }

    record(result) {
        this.metrics.totalValidations++;

        if (result.isRegistered) {
            this.metrics.successfulValidations++;

            if (result.ban.isBanned) {
                this.metrics.bannedAccounts++;
                this.metrics.banTypes[result.ban.type] = (this.metrics.banTypes[result.ban.type] || 0) + 1;
            } else {
                this.metrics.activeAccounts++;
            }
        } else {
            this.metrics.failedValidations++;
        }

        // Update avg response time
        const n = this.metrics.totalValidations;
        this.metrics.avgResponseTime =
            ((this.metrics.avgResponseTime * (n - 1)) + result.diagnostics.responseTime) / n;

        // Track probe stats
        for (const method of result.ban.detectionMethods) {
            this.metrics.probesStats[method] = (this.metrics.probesStats[method] || 0) + 1;
        }

        this.history.push({
            timestamp: Date.now(),
            result: this._summarize(result)
        });

        // Keep last 1000 records
        if (this.history.length > 1000) {
            this.history.shift();
        }
    }

    _summarize(result) {
        return {
            isBanned: result.ban.isBanned,
            banType: result.ban.type,
            responseTime: result.diagnostics.responseTime,
            successRate: result.diagnostics.probsSuccessful / result.diagnostics.probsExecuted
        };
    }

    getReport() {
        return {
            summary: this.metrics,
            trends: this._analyzeTrends(),
            recommendations: this._generateRecommendations()
        };
    }

    _analyzeTrends() {
        if (this.history.length < 10) {
            return { status: 'insufficient_data' };
        }

        const recent = this.history.slice(-50);
        const bannedRate = recent.filter(h => h.result.isBanned).length / recent.length;
        const avgResponseTime = recent.reduce((sum, h) => sum + h.result.responseTime, 0) / recent.length;

        return {
            recentBanRate: bannedRate,
            avgResponseTime,
            trend: bannedRate > 0.3 ? 'high_ban_rate' : 'normal'
        };
    }

    _generateRecommendations() {
        const recommendations = [];
        const trends = this._analyzeTrends();

        if (trends.recentBanRate > 0.5) {
            recommendations.push('High ban rate detected - Consider reviewing account selection criteria');
        }

        if (trends.avgResponseTime > 10000) {
            recommendations.push('Slow response times - Consider optimizing network or reducing timeout values');
        }

        if (this.metrics.failedValidations / this.metrics.totalValidations > 0.3) {
            recommendations.push('High failure rate - Check connection stability');
        }

        return recommendations;
    }

    reset() {
        this.metrics = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            bannedAccounts: 0,
            activeAccounts: 0,
            banTypes: {},
            avgResponseTime: 0,
            probesStats: {}
        };
        this.history = [];
    }
}

// ============================================================================
// MAIN VALIDATOR CLASS
// ============================================================================

class WhatsAppValidator extends EventEmitter {
    constructor(connection, options = {}) {
        super();

        this.conn = connection;
        this.config = {
            timeout: options.timeout || 8000,
            parallelProbes: options.parallelProbes !== false,
            enablePresenceCheck: options.enablePresenceCheck !== false,
            enableContactCheck: options.enableContactCheck !== false,
            retryOnFailure: options.retryOnFailure !== false,
            maxRetries: options.maxRetries || 2,
            enableCache: options.enableCache !== false,
            cacheTTL: options.cacheTTL || 3600000,
            enableRateLimiting: options.enableRateLimiting !== false,
            rateLimit: options.rateLimit || { maxRequests: 10, windowMs: 60000 },
            enableAnalytics: options.enableAnalytics !== false,
            enableMLDetection: options.enableMLDetection !== false,
            logErrors: options.logErrors || false,
            plugins: options.plugins || [],
            ...options
        };

        // Initialize subsystems
        this.cache = this.config.enableCache ? new ValidationCache({
            ttl: this.config.cacheTTL,
            maxSize: 1000
        }) : null;

        this.rateLimiter = this.config.enableRateLimiting ? new RateLimiter(this.config.rateLimit) : null;

        this.analytics = this.config.enableAnalytics ? new AnalyticsEngine() : null;

        this.mlDetector = this.config.enableMLDetection ? new MLPatternDetector() : null;

        // Plugin system
        this.plugins = new Map();
        this._loadPlugins();

        // Health monitoring
        this.health = {
            status: 'healthy',
            lastCheck: Date.now(),
            consecutiveFailures: 0,
            totalChecks: 0
        };
    }

    /**
     * Main validation method
     */
    async validate(phoneNumber, options = {}) {
        const startTime = Date.now();

        // Rate limiting
        if (this.rateLimiter) {
            await this.rateLimiter.acquire();
        }

        // Check cache
        const cacheKey = `validate:${phoneNumber}`;
        if (this.cache && !options.skipCache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.emit('cache_hit', { phoneNumber });
                return cached;
            }
        }

        this.emit('validation_start', { phoneNumber });

        const jid = this._normalizeJID(phoneNumber);
        const result = this._createResultObject(phoneNumber, jid);

        try {
            // Execute validation pipeline
            await this._executePipeline(jid, result, options);

            // Store in cache
            if (this.cache) {
                this.cache.set(cacheKey, result);
            }

            // Record analytics
            if (this.analytics) {
                this.analytics.record(result);
            }

            // Update health
            this._updateHealth(true);

            this.emit('validation_complete', { phoneNumber, result });

            return result;

        } catch (error) {
            this._updateHealth(false);
            this.emit('validation_error', { phoneNumber, error });

            result.summary = 'Critical validation error';
            result.diagnostics.errorDetails.push({
                stage: 'critical',
                error: error.message,
                code: 'FATAL'
            });

            return result;
        }
    }

    /**
     * Batch validation
     */
    async validateBatch(phoneNumbers, options = {}) {
        const batchSize = options.batchSize || 5;
        const delayBetweenBatches = options.delayBetweenBatches || 2000;
        const results = [];

        this.emit('batch_start', { total: phoneNumbers.length });

        for (let i = 0; i < phoneNumbers.length; i += batchSize) {
            const batch = phoneNumbers.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(num => this.validate(num, options))
            );

            results.push(...batchResults);

            this.emit('batch_progress', {
                completed: Math.min(i + batchSize, phoneNumbers.length),
                total: phoneNumbers.length
            });

            // Delay between batches
            if (i + batchSize < phoneNumbers.length) {
                await this._delay(delayBetweenBatches);
            }
        }

        this.emit('batch_complete', { results });

        return results;
    }

    /**
     * Execute validation pipeline
     */
    async _executePipeline(jid, result, options) {
        // Stage 1: Registration
        await this._checkRegistration(jid, result);

        if (!result.isRegistered) {
            result.ban.isBanned = true;
            result.ban.type = BanType.PERMANENT;
            result.summary = 'Not registered or permanently banned';
            this._finalizeResult(result, Date.now());
            return;
        }

        // Stage 2: Advanced probes
        await this._executeProbes(jid, result);

        // Stage 3: Pattern analysis (ML-powered if enabled)
        if (this.mlDetector) {
            const mlPrediction = this.mlDetector.analyze(
                result.diagnostics.errorDetails,
                {
                    successRate: result.diagnostics.probsSuccessful / result.diagnostics.probsExecuted
                }
            );

            if (mlPrediction.type !== BanType.NONE) {
                result.ban.isBanned = true;
                result.ban.type = mlPrediction.type;
                result.ban.mlConfidence = mlPrediction.confidence;
                result.ban.detectionMethods.push('ml_pattern_detection');
            }
        } else {
            this._analyzePatterns(result);
        }

        // Stage 4: Review analysis
        this._analyzeReviewOptions(result);

        // Stage 5: Plugin hooks
        await this._runPluginHooks('post_validation', result);

        // Stage 6: Finalize
        this._finalizeResult(result, Date.now());
    }

    _createResultObject(phoneNumber, jid) {
        return {
            number: phoneNumber,
            jid,
            timestamp: Date.now(),
            isRegistered: false,
            isActive: false,

            ban: {
                isBanned: false,
                type: BanType.NONE,
                detectionMethods: [],
                mlConfidence: null
            },

            review: {
                available: false,
                type: ReviewType.NONE,
                estimatedTime: null
            },

            account: {
                hasStatus: false,
                statusText: null,
                hasProfilePicture: false,
                isBusinessAccount: false,
                age: AccountAge.UNKNOWN,
                presenceAvailable: false
            },

            diagnostics: {
                responseTime: null,
                probsExecuted: 0,
                probsSuccessful: 0,
                errorDetails: [],
                fallbacksUsed: [],
                probeResults: []
            },

            recommendations: [],
            summary: ''
        };
    }

    // [Previous methods: _checkRegistration, _executeProbes, etc. remain the same]
    // I'll include the essential ones below

    async _checkRegistration(jid, result) {
        try {
            const check = await this._executeWithTimeout(
                () => this.conn.onWhatsApp(jid),
                this.config.timeout
            );

            result.isRegistered = check && check.length > 0 && check[0].exists;
            result.isActive = result.isRegistered;

            if (result.isRegistered) {
                result.ban.detectionMethods.push('registration_verified');
                result.diagnostics.probsExecuted++;
                result.diagnostics.probsSuccessful++;
            }
        } catch (error) {
            this._recordError('registration', error, result);
        }
    }

    async _executeProbes(jid, result) {
        const probes = this._buildProbeList(jid);

        if (this.config.parallelProbes) {
            await Promise.allSettled(
                probes.map(probe => this._executeProbe(probe, result))
            );
        } else {
            for (const probe of probes) {
                await this._executeProbe(probe, result);
            }
        }
    }

    _buildProbeList(jid) {
        const probes = [
            { name: 'status', priority: 1, fn: () => this.conn.fetchStatus(jid), timeout: this.config.timeout },
            { name: 'profile_picture', priority: 2, fn: () => this.conn.profilePictureUrl(jid, 'image'), timeout: this.config.timeout },
            { name: 'business_profile', priority: 3, fn: () => this.conn.getBusinessProfile(jid), timeout: this.config.timeout }
        ];

        if (this.config.enablePresenceCheck) {
            probes.push({
                name: 'presence',
                priority: 4,
                fn: () => this.conn.presenceSubscribe(jid),
                timeout: this.config.timeout + 3000
            });
        }

        return probes.sort((a, b) => a.priority - b.priority);
    }

    async _executeProbe(probe, result) {
        result.diagnostics.probsExecuted++;
        const probeStart = Date.now();

        try {
            const probeResult = await this._executeWithTimeout(probe.fn, probe.timeout);
            this._processProbeResult(probe.name, probeResult, result);
            result.diagnostics.probsSuccessful++;

            result.diagnostics.probeResults.push({
                name: probe.name,
                status: ProbeStatus.SUCCESS,
                duration: Date.now() - probeStart
            });

        } catch (error) {
            this._recordError(probe.name, error, result);

            result.diagnostics.probeResults.push({
                name: probe.name,
                status: this._isFatalError(error) ? ProbeStatus.FAILED : ProbeStatus.TIMEOUT,
                duration: Date.now() - probeStart,
                error: error.message
            });

            // Retry logic
            if (this.config.retryOnFailure && !this._isFatalError(error)) {
                for (let retry = 0; retry < this.config.maxRetries; retry++) {
                    result.diagnostics.fallbacksUsed.push(`${probe.name}_retry_${retry + 1}`);
                    await this._delay(1000 * (retry + 1));

                    try {
                        const retryResult = await this._executeWithTimeout(probe.fn, probe.timeout);
                        this._processProbeResult(probe.name, retryResult, result);
                        result.diagnostics.probsSuccessful++;
                        break;
                    } catch (retryError) {
                        if (retry === this.config.maxRetries - 1) {
                            this._recordError(`${probe.name}_final_retry`, retryError, result);
                        }
                    }
                }
            }
        }
    }

    _processProbeResult(probeName, probeResult, result) {
        switch (probeName) {
            case 'status':
                if (probeResult?.status) {
                    result.account.hasStatus = true;
                    result.account.statusText = probeResult.status;
                    result.ban.detectionMethods.push('status_accessible');

                    if (probeResult.setAt) {
                        const ageInDays = (Date.now() - (probeResult.setAt * 1000)) / (1000 * 60 * 60 * 24);
                        result.account.age = ageInDays < 30 ? AccountAge.NEW :
                            ageInDays < 180 ? AccountAge.MEDIUM : AccountAge.OLD;
                    }
                }
                break;

            case 'profile_picture':
                if (probeResult) {
                    result.account.hasProfilePicture = true;
                    result.ban.detectionMethods.push('profile_picture_accessible');
                }
                break;

            case 'business_profile':
                if (probeResult) {
                    result.account.isBusinessAccount = true;
                    result.ban.detectionMethods.push('business_account_verified');
                }
                break;

            case 'presence':
                if (probeResult) {
                    result.account.presenceAvailable = true;
                    result.ban.detectionMethods.push('presence_available');
                }
                break;
        }
    }

    _analyzePatterns(result) {
        const errorText = result.diagnostics.errorDetails
            .map(e => e.error.toLowerCase())
            .join(' ');

        for (const [banType, pattern] of Object.entries(ERROR_PATTERNS)) {
            const matchCount = pattern.keywords.filter(kw =>
                errorText.includes(kw.toLowerCase())
            ).length;

            if (matchCount > 0) {
                result.ban.isBanned = true;
                result.ban.type = banType;
                result.ban.detectionMethods.push(`pattern_match_${banType}`);
                break;
            }
        }

        if (result.diagnostics.probsSuccessful === 0 && result.isRegistered) {
            result.ban.isBanned = true;
            if (result.ban.type === BanType.NONE) {
                result.ban.type = BanType.VIOLATION;
                result.ban.detectionMethods.push('zero_successful_probes');
            }
        }
    }

    _analyzeReviewOptions(result) {
        if (!result.ban.isBanned) {
            result.recommendations.push('Account is functioning normally');
            result.recommendations.push('Maintain natural usage patterns');
            return;
        }

        const reviewConfig = {
            [BanType.SPAM]: {
                available: true,
                type: ReviewType.SELF_APPEAL,
                time: '24-48 hours',
                steps: [
                    'Submit self-appeal through WhatsApp app',
                    'Avoid bulk messaging for one week',
                    'Review WhatsApp business policies'
                ]
            },
            [BanType.VIOLATION]: {
                available: true,
                type: ReviewType.SUPPORT_REQUIRED,
                time: '3-7 days',
                steps: [
                    'Contact WhatsApp support directly',
                    'Prepare identity verification',
                    'Review terms of service violations'
                ]
            },
            [BanType.PERMANENT]: {
                available: false,
                type: ReviewType.NONE,
                time: null,
                steps: [
                    'Ban is permanent - Consider new number',
                    'Ensure compliance before new account'
                ]
            }
        };

        const config = reviewConfig[result.ban.type];
        if (config) {
            result.review.available = config.available;
            result.review.type = config.type;
            result.review.estimatedTime = config.time;
            result.recommendations.push(...config.steps);
        }
    }

    _finalizeResult(result, startTime) {
        result.diagnostics.responseTime = Date.now() - startTime;

        const summaries = {
            [BanType.NONE]: 'Active and verified',
            [BanType.SPAM]: 'Spam restrictions detected',
            [BanType.VIOLATION]: 'Policy violation detected',
            [BanType.PERMANENT]: 'Permanent ban confirmed'
        };

        result.summary = result.isRegistered ?
            summaries[result.ban.type] :
            'Not registered or permanently banned';
    }

    _recordError(stage, error, result) {
        result.diagnostics.errorDetails.push({
            stage,
            error: error.message || error.toString(),
            code: this._extractErrorCode(error),
            timestamp: Date.now()
        });
    }

    _extractErrorCode(error) {
        const errorStr = error.toString();
        const codes = ['403', '401', '404', '429', '500'];
        for (const code of codes) {
            if (errorStr.includes(code)) return code;
        }
        if (errorStr.toLowerCase().includes('timeout')) return 'TIMEOUT';
        if (errorStr.toLowerCase().includes('forbidden')) return '403';
        return 'UNKNOWN';
    }

    _isFatalError(error) {
        const fatalPatterns = ['404', 'permanently', 'deleted', 'terminated'];
        const errorStr = error.toString().toLowerCase();
        return fatalPatterns.some(p => errorStr.includes(p));
    }

    async _executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timeout')), timeout)
            )
        ]);
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _normalizeJID(phoneNumber) {
        return phoneNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }

    _updateHealth(success) {
        this.health.totalChecks++;

        if (success) {
            this.health.consecutiveFailures = 0;
            this.health.status = 'healthy';
        } else {
            this.health.consecutiveFailures++;
            if (this.health.consecutiveFailures >= 5) {
                this.health.status = 'degraded';
                this.emit('health_degraded', this.health);
            }
            if (this.health.consecutiveFailures >= 10) {
                this.health.status = 'unhealthy';
                this.emit('health_critical', this.health);
            }
        }

        this.health.lastCheck = Date.now();
    }

    // ========== PLUGIN SYSTEM ==========

    _loadPlugins() {
        for (const plugin of this.config.plugins) {
            this.registerPlugin(plugin);
        }
    }

    registerPlugin(plugin) {
        if (!plugin.name || !plugin.version) {
            throw new Error('Plugin must have name and version');
        }

        this.plugins.set(plugin.name, plugin);

        if (plugin.onRegister) {
            plugin.onRegister(this);
        }

        this.emit('plugin_registered', { name: plugin.name, version: plugin.version });
    }

    async _runPluginHooks(hookName, ...args) {
        for (const [name, plugin] of this.plugins) {
            if (plugin[hookName]) {
                try {
                    await plugin[hookName](...args);
                } catch (error) {
                    this.emit('plugin_error', { plugin: name, hook: hookName, error });
                }
            }
        }
    }

    // ========== EXPORT METHODS ==========

    exportJSON(result) {
        return JSON.stringify(result, null, 2);
    }

    exportCSV(results) {
        if (!Array.isArray(results)) results = [results];

        const headers = ['Number', 'Registered', 'Banned', 'Ban Type', 'Review Available', 'Summary'];
        const rows = results.map(r => [
            r.number,
            r.isRegistered,
            r.ban.isBanned,
            r.ban.type,
            r.review.available,
            r.summary
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // ========== FORMAT METHODS ==========

    formatSimple(result) {
        const lines = [];

        lines.push('WhatsApp Account Validation');
        lines.push('');
        lines.push(`Number: +${result.number}`);
        lines.push(`Status: ${result.isActive ? 'Active' : 'Inactive'}`);
        lines.push(`Registered: ${result.isRegistered ? 'Yes' : 'No'}`);
        lines.push('');

        if (result.ban.isBanned) {
            lines.push(`Ban Type: ${result.ban.type}`);
            lines.push(`Review Available: ${result.review.available ? 'Yes' : 'No'}`);
            if (result.review.estimatedTime) {
                lines.push(`Review Time: ${result.review.estimatedTime}`);
            }
        } else {
            lines.push('No restrictions detected');
        }

        if (result.recommendations.length > 0) {
            lines.push('');
            lines.push('Recommendations:');
            result.recommendations.forEach((rec, i) => {
                lines.push(`${i + 1}. ${rec}`);
            });
        }

        return lines.join('\n');
    }

    formatDetailed(result) {
        const lines = [];

        lines.push('='.repeat(60));
        lines.push('WhatsApp Account Validation Report');
        lines.push('='.repeat(60));
        lines.push('');

        lines.push('[Account Information]');
        lines.push(`Number: +${result.number}`);
        lines.push(`Status: ${result.isActive ? 'Active' : 'Inactive'}`);
        lines.push(`Registered: ${result.isRegistered ? 'Yes' : 'No'}`);
        lines.push(`Type: ${result.account.isBusinessAccount ? 'Business' : 'Personal'}`);
        if (result.account.age !== AccountAge.UNKNOWN) {
            lines.push(`Age: ${result.account.age}`);
        }
        lines.push('');

        lines.push('[Ban Analysis]');
        lines.push(`Banned: ${result.ban.isBanned ? 'Yes' : 'No'}`);
        if (result.ban.isBanned) {
            lines.push(`Type: ${result.ban.type}`);
            lines.push(`Detection Methods: ${result.ban.detectionMethods.join(', ')}`);
            if (result.ban.mlConfidence) {
                lines.push(`ML Confidence: ${(result.ban.mlConfidence * 100).toFixed(1)}%`);
            }
        }
        lines.push('');

        if (result.ban.isBanned) {
            lines.push('[Review Information]');
            lines.push(`Available: ${result.review.available ? 'Yes' : 'No'}`);
            lines.push(`Type: ${result.review.type}`);
            if (result.review.estimatedTime) {
                lines.push(`Estimated Time: ${result.review.estimatedTime}`);
            }
            lines.push('');
        }

        lines.push('[Diagnostics]');
        lines.push(`Response Time: ${result.diagnostics.responseTime}ms`);
        lines.push(`Probes Executed: ${result.diagnostics.probsExecuted}`);
        lines.push(`Probes Successful: ${result.diagnostics.probsSuccessful}`);
        lines.push(`Success Rate: ${((result.diagnostics.probsSuccessful / result.diagnostics.probsExecuted) * 100).toFixed(1)}%`);

        if (result.diagnostics.fallbacksUsed.length > 0) {
            lines.push(`Fallbacks Used: ${result.diagnostics.fallbacksUsed.length}`);
        }
        lines.push('');

        if (result.recommendations.length > 0) {
            lines.push('[Recommendations]');
            result.recommendations.forEach((rec, i) => {
                lines.push(`${i + 1}. ${rec}`);
            });
            lines.push('');
        }

        lines.push('='.repeat(60));
        lines.push(`Summary: ${result.summary}`);
        lines.push('='.repeat(60));

        return lines.join('\n');
    }

    // ========== UTILITY METHODS ==========

    getAnalytics() {
        return this.analytics ? this.analytics.getReport() : null;
    }

    getCacheStats() {
        return this.cache ? this.cache.stats() : null;
    }

    getRateLimitStatus() {
        return this.rateLimiter ? this.rateLimiter.getStatus() : null;
    }

    getHealth() {
        return this.health;
    }

    clearCache() {
        if (this.cache) {
            this.cache.clear();
        }
    }

    resetAnalytics() {
        if (this.analytics) {
            this.analytics.reset();
        }
    }
}


module.exports = {
    WhatsAppValidator,
    BanType,
    ReviewType,
    AccountAge,
    ProbeStatus,
    ValidationCache,
    RateLimiter,
    AnalyticsEngine,
    MLPatternDetector
};
