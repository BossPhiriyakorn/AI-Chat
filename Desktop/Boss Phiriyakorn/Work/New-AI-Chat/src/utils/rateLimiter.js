const logger = require('./logger');

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  // Rate limit configuration
  static RATE_LIMITS = {
    // Per user limits
    user: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute per user
    },
    // Global limits
    global: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute globally
    }
  };

  startCleanup() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  cleanup() {
    const now = Date.now();
    const userWindow = RateLimiter.RATE_LIMITS.user.windowMs;
    const globalWindow = RateLimiter.RATE_LIMITS.global.windowMs;

    // Clean up user requests
    for (const [userId, userData] of this.requests.entries()) {
      if (userData.type === 'user') {
        userData.requests = userData.requests.filter(time => now - time < userWindow);
        if (userData.requests.length === 0) {
          this.requests.delete(userId);
        }
      }
    }

    // Clean up global requests
    const globalData = this.requests.get('global');
    if (globalData && globalData.type === 'global') {
      globalData.requests = globalData.requests.filter(time => now - time < globalWindow);
      if (globalData.requests.length === 0) {
        this.requests.delete('global');
      }
    }

    logger.debug('Rate limiter cleanup completed');
  }

  isAllowed(userId) {
    const now = Date.now();
    const userLimit = RateLimiter.RATE_LIMITS.user;
    const globalLimit = RateLimiter.RATE_LIMITS.global;

    // Check global rate limit
    if (!this.checkGlobalLimit(now, globalLimit)) {
      logger.warn('Global rate limit exceeded');
      return {
        allowed: false,
        reason: 'global_rate_limit_exceeded',
        retryAfter: this.getRetryAfter('global', now, globalLimit.windowMs)
      };
    }

    // Check user rate limit
    if (!this.checkUserLimit(userId, now, userLimit)) {
      logger.warn(`User rate limit exceeded for user: ${userId}`);
      return {
        allowed: false,
        reason: 'user_rate_limit_exceeded',
        retryAfter: this.getRetryAfter(userId, now, userLimit.windowMs)
      };
    }

    // Record the request
    this.recordRequest(userId, now);
    this.recordRequest('global', now);

    return {
      allowed: true,
      reason: 'allowed'
    };
  }

  checkGlobalLimit(now, limit) {
    const globalData = this.requests.get('global');
    if (!globalData) {
      return true;
    }

    const recentRequests = globalData.requests.filter(time => now - time < limit.windowMs);
    return recentRequests.length < limit.maxRequests;
  }

  checkUserLimit(userId, now, limit) {
    const userData = this.requests.get(userId);
    if (!userData) {
      return true;
    }

    const recentRequests = userData.requests.filter(time => now - time < limit.windowMs);
    return recentRequests.length < limit.maxRequests;
  }

  recordRequest(identifier, now) {
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, {
        type: identifier === 'global' ? 'global' : 'user',
        requests: []
      });
    }

    const data = this.requests.get(identifier);
    data.requests.push(now);
  }

  getRetryAfter(identifier, now, windowMs) {
    const data = this.requests.get(identifier);
    if (!data || data.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...data.requests);
    const retryAfter = (oldestRequest + windowMs) - now;
    return Math.max(0, retryAfter);
  }

  getStats() {
    const now = Date.now();
    const userWindow = RateLimiter.RATE_LIMITS.user.windowMs;
    const globalWindow = RateLimiter.RATE_LIMITS.global.windowMs;

    const stats = {
      global: {
        current: 0,
        limit: RateLimiter.RATE_LIMITS.global.maxRequests,
        windowMs: globalWindow
      },
      users: new Map(),
      totalUsers: 0
    };

    // Count global requests
    const globalData = this.requests.get('global');
    if (globalData) {
      stats.global.current = globalData.requests.filter(time => now - time < globalWindow).length;
    }

    // Count user requests
    for (const [userId, userData] of this.requests.entries()) {
      if (userData.type === 'user') {
        const recentRequests = userData.requests.filter(time => now - time < userWindow);
        stats.users.set(userId, {
          current: recentRequests.length,
          limit: RateLimiter.RATE_LIMITS.user.maxRequests,
          windowMs: userWindow
        });
        stats.totalUsers++;
      }
    }

    return stats;
  }

  reset() {
    this.requests.clear();
    logger.info('Rate limiter reset');
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Graceful shutdown
process.on('SIGINT', () => {
  rateLimiter.stopCleanup();
});

process.on('SIGTERM', () => {
  rateLimiter.stopCleanup();
});

module.exports = rateLimiter;
