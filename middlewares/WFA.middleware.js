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

  handleMiddleware = (_req, _res, next) => {
    if (this.#isWindowExpired()) {
      this.#windowStartTime = Date.now();
      this.#remainingRequests = this.#maxRequestsPerWindow;
    }

    if (this.#remainingRequests > 0) {
      this.#remainingRequests -= 1;
      return next();
    }

    return next(
      new RateLimitError({
        retryAfter: this.#getRetryAfterMs(),
      })
    );
  };
}

class FixedWindowRateLimiterByIP {
  #maxRequestsPerWindow;
  #windowDurationMs;
  #clientWindows;
  constructor({ maxRequestsPerWindow, windowDuration }) {
    this.#maxRequestsPerWindow = maxRequestsPerWindow;
    this.#windowDurationMs = TIME_MULTIPLIERS.get(windowDuration);
    this.#clientWindows = new Map();
  }

  #createWindow(ip) {
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

  handleMiddleware = (req, _res, next) => {
    const clientIP = this.#getClientIP(req);
    if (!clientIP) {
      return next(new ClientIpNotFoundError());
    }

    let window = this.#clientWindows.get(clientIP);
    if (window === undefined || this.#isWindowExpired(window)) {
      window = this.#createWindow(clientIP);
    }

    if (window.remainingRequests > 0) {
      this.#clientWindows.set(clientIP, {
        ...window,
        remainingRequests: window.remainingRequests - 1,
      });
      return next();
    }

    return next(
      new RateLimitError({
        retryAfter: this.#getRetryAfterMs(window),
      })
    );
  };
}

export { FixedWindowRateLimiter, FixedWindowRateLimiterByIP };
