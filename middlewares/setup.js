import {
  FixedWindowRateLimiter,
  FixedWindowRateLimiterByIP,
} from "./WFA.middleware.js";

const rateLimiter = new FixedWindowRateLimiterByIP({
  maxRequestsPerWindow: 5,
  windowDuration: "minute",
});

const setupGlobalMiddlewares = (app) => {
  app.use(rateLimiter.handleMiddleware);
};

export default setupGlobalMiddlewares;
