"use strict";
// Copyright 2024 The MathWorks, Inc.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfMatlabDeprecated = void 0;
const Logger_1 = __importDefault(require("../logging/Logger"));
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
const ORIGINAL_MIN_RELEASE = 'R2021a';
const CURRENT_MIN_RELEASE = 'R2021a';
const FUTURE_MIN_RELEASE = 'R2021b';
var DeprecationType;
(function (DeprecationType) {
    DeprecationType[DeprecationType["NEVER_SUPPORTED"] = 1] = "NEVER_SUPPORTED";
    DeprecationType[DeprecationType["DEPRECATED"] = 2] = "DEPRECATED";
    DeprecationType[DeprecationType["TO_BE_DEPRECATED"] = 3] = "TO_BE_DEPRECATED";
})(DeprecationType || (DeprecationType = {}));
/**
 * Checks if the given MATLAB release is unsupported, has been deprecated, or is planned
 * for deprecation in a future release. If it falls under one of these categories, a
 * notification is sent to the client, which may display a message to the user.
 *
 * @param matlabRelease The MATLAB release (e.g. "R2021a") which is being checked
 */
function checkIfMatlabDeprecated(matlabRelease) {
    let deprecationType;
    if (matlabRelease < ORIGINAL_MIN_RELEASE) {
        // The launched MATLAB version has never been supported
        deprecationType = DeprecationType.NEVER_SUPPORTED;
        Logger_1.default.error(`MATLAB ${matlabRelease} is not supported`);
    }
    else if (matlabRelease >= ORIGINAL_MIN_RELEASE && matlabRelease < CURRENT_MIN_RELEASE) {
        // The launched MATLAB version is no longer supported
        deprecationType = DeprecationType.DEPRECATED;
        Logger_1.default.error(`MATLAB ${matlabRelease} is no longer supported`);
    }
    else if (matlabRelease >= CURRENT_MIN_RELEASE && matlabRelease < FUTURE_MIN_RELEASE) {
        // Support for the launched MATLAB version will end in an upcoming release
        deprecationType = DeprecationType.TO_BE_DEPRECATED;
        Logger_1.default.warn(`Support for MATLAB ${matlabRelease} will end in a future update`);
    }
    else {
        // Support for the launched MATLAB version is not yet planned to end
        return;
    }
    let message = {
        deprecationType: deprecationType,
        deprecationInfo: {
            matlabVersion: matlabRelease,
            minVersion: CURRENT_MIN_RELEASE,
            futureMinVersion: FUTURE_MIN_RELEASE
        }
    };
    NotificationService_1.default.sendNotification(NotificationService_1.Notification.MatlabVersionDeprecation, message);
}
exports.checkIfMatlabDeprecated = checkIfMatlabDeprecated;
//# sourceMappingURL=DeprecationUtils.js.map