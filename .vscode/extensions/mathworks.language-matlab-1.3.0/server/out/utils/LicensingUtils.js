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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInstallPathSettingChanged = exports.handleSignInChanged = exports.removeLicensingNotificationListenersAndUpdateClient = exports.setupLicensingNotificationListenersAndUpdateClient = exports.marshalErrorInfo = exports.marshalLicensingInfo = exports.findAllEntitlements = void 0;
const types_1 = require("../licensing/types");
const licensing_1 = __importDefault(require("../licensing"));
const config_1 = require("../licensing/config");
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
const Logger_1 = __importDefault(require("../logging/Logger"));
const server_1 = require("../licensing/server");
/**
 * Recursively finds all occurrences of the "entitlement" key in the given object and its nested objects.
 *
 * @param obj - The object to search.
 * @returns {Entitlement[][]} An array of arrays containing the entitlement values found.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function findAllEntitlements(obj) {
    const result = [];
    const keyToFind = 'entitlement';
    function recursiveSearch(obj) {
        if (obj === null || obj === undefined || typeof obj !== 'object') {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(obj, keyToFind)) {
            const entitlementValue = obj[keyToFind];
            if (Array.isArray(entitlementValue)) {
                result.push(entitlementValue);
            }
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                recursiveSearch(obj[key]);
            }
        }
    }
    recursiveSearch(obj);
    return result;
}
exports.findAllEntitlements = findAllEntitlements;
/**
 * Marshals the licensing data into a standardized format based on the license type.
 *
 * @param data - The licensing data to be marshaled.
 * @returns {Object} The marshaled licensing information.
 */
function marshalLicensingInfo(data) {
    if ((data == null) || !('type' in data)) {
        return {};
    }
    if (data.type === types_1.MHLMLicenseType) {
        return {
            type: types_1.MHLMLicenseType,
            emailAddress: data.email_addr,
            entitlements: data.entitlements,
            entitlementId: data.entitlement_id
        };
    }
    else if (data.type === types_1.NLMLicenseType) {
        return {
            type: types_1.NLMLicenseType,
            connectionString: data.conn_str
        };
    }
    else if (data.type === types_1.ExistingLicenseType) {
        return {
            type: types_1.ExistingLicenseType
        };
    }
    else {
        return {};
    }
}
exports.marshalLicensingInfo = marshalLicensingInfo;
/**
 * Marshals the error information into a standardized format.
 *
 * @param error - The error object to be marshaled.
 * @returns The marshaled error information, or null if no error is provided.
 */
function marshalErrorInfo(error) {
    if (error == null)
        return null;
    return {
        message: error.message,
        logs: error.logs,
        type: error.constructor.name
    };
}
exports.marshalErrorInfo = marshalErrorInfo;
let licensingDeleteNotificationListener = null;
let licensingServerUrlNotificationListener = null;
let mLM;
/**
 * Sets up notification listeners required for licensing and updates languageserver client
 *
 */
function setupLicensingNotificationListenersAndUpdateClient(matlabLifecycleManager) {
    return __awaiter(this, void 0, void 0, function* () {
        const licensing = new licensing_1.default();
        mLM = matlabLifecycleManager;
        if (licensingDeleteNotificationListener == null) {
            licensingDeleteNotificationListener = NotificationService_1.default.registerNotificationListener(NotificationService_1.Notification.LicensingDelete, 
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            () => __awaiter(this, void 0, void 0, function* () {
                Logger_1.default.log('Received notification to delete licensing from the extension');
                yield licensing.unsetLicensing();
                // Update language client 
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
            }));
        }
        if (licensingServerUrlNotificationListener == null) {
            licensingServerUrlNotificationListener = NotificationService_1.default.registerNotificationListener(NotificationService_1.Notification.LicensingServerUrl, () => __awaiter(this, void 0, void 0, function* () {
                const url = yield (0, server_1.startLicensingServer)(config_1.staticFolderPath, mLM);
                Logger_1.default.log(`Received Notification requesting for licensing server url: ${url}`);
                // Update language client
                NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingServerUrl, url);
            }));
        }
        NotificationService_1.default.sendNotification(NotificationService_1.Notification.LicensingData, licensing.getMinimalLicensingInfo());
    });
}
exports.setupLicensingNotificationListenersAndUpdateClient = setupLicensingNotificationListenersAndUpdateClient;
/**
 * Removes notification listeners required for licensing and updates languageserver client
 *
 */
function removeLicensingNotificationListenersAndUpdateClient() {
    if (licensingDeleteNotificationListener != null) {
        licensingDeleteNotificationListener.dispose();
        licensingDeleteNotificationListener = null;
    }
    if (licensingServerUrlNotificationListener != null) {
        licensingServerUrlNotificationListener.dispose();
        licensingServerUrlNotificationListener = null;
    }
}
exports.removeLicensingNotificationListenersAndUpdateClient = removeLicensingNotificationListenersAndUpdateClient;
/**
 * Handles the changes to the "signIn" setting in the configuration.
 *
 * @param configuration - The configuration object.
 * @returns {Promise<void>} A Promise that resolves when the handling is complete.
 */
function handleSignInChanged(configuration) {
    return __awaiter(this, void 0, void 0, function* () {
        if (configuration.signIn) {
            yield setupLicensingNotificationListenersAndUpdateClient(mLM);
        }
        else {
            removeLicensingNotificationListenersAndUpdateClient();
        }
    });
}
exports.handleSignInChanged = handleSignInChanged;
/**
 * Handles the changes to the "installPath" setting in the configuration.
 *
 * @param configuration - The configuration object.
 */
function handleInstallPathSettingChanged(configuration) {
    (0, config_1.setInstallPath)(configuration.installPath);
    const licensing = new licensing_1.default();
    // Entitlements are based on the MATLAB version
    // As installPath is changed, we need to update the entitlements using the 
    // new MATLAB version.
    if (licensing.isMHLMLicensing()) {
        licensing.updateAndPersistLicensing().then(isSuccessful => {
            if (isSuccessful) {
                Logger_1.default.log("Successfully updated entitlements using the new MATLAB version");
            }
            else {
                Logger_1.default.log("Failed to update entitlements using the new MATLAB version");
            }
        });
    }
}
exports.handleInstallPathSettingChanged = handleInstallPathSettingChanged;
//# sourceMappingURL=LicensingUtils.js.map