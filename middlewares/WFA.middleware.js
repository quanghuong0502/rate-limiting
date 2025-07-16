import { ClientIpNotFoundError, RateLimitError } from "../errors/index.js";

const TIME_MULTIPLIERS = new Map([
  ["second", 1000],
  ["minute", 1000 * 60],
  ["hour", 1000 * 60 * 60],
  ["day", 1000 * 24 * 60 * 60],
]);

class FixedWindowRateLimiter {
  #maxRequestsPerWindow;
  #windowDurationMs;
  #remainingRequests;
  #windowStartTime;
  constructor({ maxRequestsPerWindow, windowDuration }) {
    this.#maxRequestsPerWindow = maxRequestsPerWindow;
    this.#windowDurationMs = TIME_MULTIPLIERS.get(windowDuration);
    this.#remainingRequests = this.#maxRequestsPerWindow;
    this.#windowStartTime = Date.now();
  }

  #isWindowExpired() {
    const currentTime = Date.now();
    return currentTime - this.#windowStartTime >= this.#windowDurationMs;
  }

  #getRetryAfterMs() {
    const currentTime = Date.now();
    const windowEndTime = this.#windowStartTime + this.#windowDurationMs;
    return Math.max(0, windowEndTime - currentTime);
  }

  handleMiddleware = (_req, res, next) => {
    if (this.#isWindowExpired()) {
      this.#windowStartTime = Date.now();
      this.#remainingRequests = this.#maxRequestsPerWindow;
    }

    if (this.#remainingRequests > 0) {
      this.#remainingRequests -= 1;
      return next();
    }

    res.set({
      "X-RateLimit-Limit": this.#maxRequestsPerWindow,
      "X-RateLimit-Remaining": this.#remainingRequests,
      "X-RateLimit-RetryAfter": this.#getRetryAfterMs(),
    });

    return next(new RateLimitError({}));
  };
}
class FixedWindowRateLimiterByIP {
  #maxRequestsPerWindow;
  #windowDurationMs;
  #clientWindows;
  #cleanTimer;
  constructor({ maxRequestsPerWindow, windowDuration }) {
    this.#maxRequestsPerWindow = maxRequestsPerWindow;
    this.#windowDurationMs = TIME_MULTIPLIERS.get(windowDuration);
    this.#clientWindows = new Map();
    this.#cleanTimer = this.#startCleanupTimer();
  }

  #createWindow() {
    return {
      remainingRequests: this.#maxRequestsPerWindow,
      windowStartTime: Date.now(),
    };
  }

  #isWindowExpired(window) {
    const currentTime = Date.now();
    return currentTime - window.windowStartTime >= this.#windowDurationMs;
  }

  #getRetryAfterMs(window) {
    const currentTime = Date.now();
    const windowEndTime = window.windowStartTime + this.#windowDurationMs;
    return Math.max(0, windowEndTime - currentTime);
  }

  #getClientIP(req) {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null)
    );
  }

  #startCleanupTimer() {
    setInterval(() => {
      for (const [key, value] of this.#clientWindows.entries()) {
        if (this.#isWindowExpired(value)) {
          this.#clientWindows.delete(key);
        }
      }
    }, this.#windowDurationMs);
  }

  #clearCleanupTimer() {
    if (this.#cleanTimer) {
      clearInterval(this.#cleanTimer);
      this.#cleanTimer = null;
    }
  }

  handleMiddleware = (req, res, next) => {
    const clientIP = this.#getClientIP(req);
    if (!clientIP) {
      return next(new ClientIpNotFoundError());
    }

    let window = this.#clientWindows.get(clientIP);
    if (window === undefined || this.#isWindowExpired(window)) {
      window = this.#createWindow();
    }

    if (window.remainingRequests > 0) {
      const remainingRequests = window.remainingRequests - 1;
      this.#clientWindows.set(clientIP, {
        ...window,
        remainingRequests,
      });
      res.set({
        "X-RateLimit-Limit": this.#maxRequestsPerWindow,
        "X-RateLimit-Remaining": remainingRequests,
        "X-RateLimit-RetryAfter": 0,
      });
      return next();
    }

    res.set({
      "X-RateLimit-Limit": this.#maxRequestsPerWindow,
      "X-RateLimit-Remaining": 0,
      "X-RateLimit-RetryAfter": this.#getRetryAfterMs(window),
    });
    return next(new RateLimitError({}));
  };
}

export { FixedWindowRateLimiter, FixedWindowRateLimiterByIP };
