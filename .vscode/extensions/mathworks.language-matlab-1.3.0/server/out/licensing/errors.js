"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTokenError = exports.EntitlementError = exports.OnlineLicensingError = exports.LicensingError = exports.AppError = void 0;
class AppError extends Error {
    /**
     * A Generic Parent class which inherits the Error class.
     * This class will be inherited by other classes representing specific exceptions.
     *
     * @param message - Error message.
     * @param logs - Logs associated with the error.
     * @param stacktrace - Stacktrace associated with the error.
     */
    constructor(message, logs = null, stacktrace = null) {
        super(message);
        this.logs = logs;
        this.stacktrace = stacktrace;
        this.name = this.constructor.name;
    }
}
exports.AppError = AppError;
/**
 * A Class which inherits the AppError class.
 * This class represents any Licensing Errors (MHLM and NLM Licensing)
 */
class LicensingError extends AppError {
}
exports.LicensingError = LicensingError;
/**
 * A Class which inherits the Licensing class.
 * This class represents any errors specific to MHLM Licensing.
 */
class OnlineLicensingError extends LicensingError {
}
exports.OnlineLicensingError = OnlineLicensingError;
/**
 * A Class which inherits the LicensingError class.
 * This class represents errors with Entitlements in MHLM Licensing.
 */
class EntitlementError extends LicensingError {
}
exports.EntitlementError = EntitlementError;
/**
 * A Class which inherits the AppError class.
 * This class represents token authentication errors.
 */
class InvalidTokenError extends AppError {
}
exports.InvalidTokenError = InvalidTokenError;
//# sourceMappingURL=errors.js.map