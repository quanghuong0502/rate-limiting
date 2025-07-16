const ERROR_MESSAGES = {
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  CLIENT_IP_NOT_FOUND: "Client IP not found",
  INTERNAL_SERVER_ERROR: "Internal error",
};

const ERROR_STATUS = {
  TOO_MANY_REQUESTS: 429,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
};

class AppError extends Error {
  constructor({ message, status, code }) {
    super(message);
    this.status = status;
    this.code = code ?? status;
  }

  getError() {
    const excludedProperties = ["stack", "name"];
    return Object.getOwnPropertyNames(this).reduce((error, name) => {
      return excludedProperties.includes(name)
        ? error
        : { ...error, [name]: this[name] };
    }, {});
  }
}

class InternalServerError extends AppError {
  constructor({
    message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    status = ERROR_STATUS.INTERNAL_SERVER_ERROR,
    code,
  }) {
    super({ message, status, code });
  }
}

class RateLimitError extends AppError {
  constructor({
    message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    status = ERROR_STATUS.TOO_MANY_REQUESTS,
    code,
  }) {
    super({ message, status, code });
  }
}

class ClientIpNotFoundError extends AppError {
  constructor({
    message = ERROR_MESSAGES.CLIENT_IP_NOT_FOUND,
    status = ERROR_STATUS.BAD_REQUEST,
    code,
  }) {
    super({ message, status, code });
  }
}

export { RateLimitError, ClientIpNotFoundError, InternalServerError };
