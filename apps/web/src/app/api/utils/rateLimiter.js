// Simple in-memory rate limiter for API endpoints
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = 60000; // Clean up every minute
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  // Check if request is allowed based on IP and endpoint
  isAllowed(identifier, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const key = identifier;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => 
      now - timestamp < windowMs
    );
    
    // Update the requests array
    this.requests.set(key, validRequests);
    
    // Check if limit exceeded
    if (validRequests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return {
      allowed: true,
      remaining: limit - validRequests.length,
      resetTime: now + windowMs
    };
  }
  
  // Clean up old entries
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => 
        now - timestamp < maxAge
      );
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Helper function to get client identifier
export function getClientIdentifier(request) {
  // Try to get real IP from headers (for production behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection info
  return 'unknown';
}

// Rate limiting middleware
export function withRateLimit(handler, options = {}) {
  const {
    limit = 100,
    windowMs = 60000,
    skipSuccessfulGET = false,
    message = 'Too many requests'
  } = options;
  
  return async function(request, context) {
    try {
      const identifier = getClientIdentifier(request);
      const endpoint = new URL(request.url).pathname;
      const rateLimitKey = `${identifier}:${endpoint}`;
      
      const result = rateLimiter.isAllowed(rateLimitKey, limit, windowMs);
      
      if (!result.allowed) {
        return Response.json({
          success: false,
          error: message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }, { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
          }
        });
      }
      
      // Call the original handler
      const response = await handler(request, context);
      
      // Add rate limit headers to successful responses
      if (response.ok || !skipSuccessfulGET) {
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      }
      
      return response;
      
    } catch (error) {
      console.error('Rate limiter error:', error);
      // If rate limiter fails, allow the request to proceed
      return handler(request, context);
    }
  };
}

// Specific rate limiters for different endpoint types
export const withStrictRateLimit = (handler) => withRateLimit(handler, {
  limit: 10,
  windowMs: 60000,
  message: 'Too many requests. Please wait before trying again.'
});

export const withAPIRateLimit = (handler) => withRateLimit(handler, {
  limit: 60,
  windowMs: 60000,
  message: 'API rate limit exceeded'
});

export const withDataRateLimit = (handler) => withRateLimit(handler, {
  limit: 30,
  windowMs: 60000,
  skipSuccessfulGET: true,
  message: 'Too many data requests'
});

export default rateLimiter;