"use strict";
// Copyright 2024 The MathWorks, Inc.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSignInSettingEnabled = exports.removeLicensingListeners = exports.setupLicensingListeners = exports.getMinimalLicensingInfo = exports.LICENSING_SETTING_NAME = void 0;
const vscode = require("vscode");
const BrowserUtils_1 = require("./BrowserUtils");
const Notifications_1 = require("../Notifications");
let minimalLicensingInfo = '';
let licensingUrlNotificationListener;
let licensingDataNotificationListener;
let licensingErrorNotificationListener;
let isInitialized = false;
exports.LICENSING_SETTING_NAME = 'signIn';
/**
 * Gets the minimal licensing information as a string.
 * @returns {string} The minimal licensing information.
 */
function getMinimalLicensingInfo() {
    return minimalLicensingInfo;
}
exports.getMinimalLicensingInfo = getMinimalLicensingInfo;
/**
 * Sets up the licensing notification listeners for the extension.
 *
 * @param client - The language client instance.
 */
function setupLicensingListeners(client) {
    if (!isInitialized) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        licensingUrlNotificationListener = client.onNotification(Notifications_1.default.LicensingServerUrl, (url) => __awaiter(this, void 0, void 0, function* () {
            const result = yield vscode.window.showInformationMessage('Sign in required to open MATLAB. Click OK to open your system browser and sign in.', 'OK');
            if (result === 'OK') {
                void (0, BrowserUtils_1.openUrlInExternalBrowser)(url);
            }
        }));
        licensingDataNotificationListener = client.onNotification(Notifications_1.default.LicensingData, (data) => {
            minimalLicensingInfo = data;
        });
        licensingErrorNotificationListener = client.onNotification(Notifications_1.default.LicensingError, (data) => handleLicensingError(data));
        isInitialized = true;
    }
}
exports.setupLicensingListeners = setupLicensingListeners;
/**
 * Removes the licensing notification listeners for the extension.
 */
function removeLicensingListeners() {
    if (isInitialized) {
        licensingUrlNotificationListener === null || licensingUrlNotificationListener === void 0 ? void 0 : licensingUrlNotificationListener.dispose();
        licensingUrlNotificationListener = undefined;
        licensingDataNotificationListener === null || licensingDataNotificationListener === void 0 ? void 0 : licensingDataNotificationListener.dispose();
        licensingDataNotificationListener = undefined;
        licensingErrorNotificationListener === null || licensingErrorNotificationListener === void 0 ? void 0 : licensingErrorNotificationListener.dispose();
        licensingErrorNotificationListener = undefined;
        isInitialized = false;
    }
}
exports.removeLicensingListeners = removeLicensingListeners;
/**
 * Handles the licensing error notification by displaying an information message.
 *
 * @param data - The error message data.
 */
function handleLicensingError(data) {
    void vscode.window.showErrorMessage(`Licensing failed with error: ${data}`);
}
/**
 * Returns true if the SignIn setting is enabled.
 */
function isSignInSettingEnabled() {
    return vscode.workspace.getConfiguration('MATLAB').get(exports.LICENSING_SETTING_NAME);
}
exports.isSignInSettingEnabled = isSignInSettingEnabled;
//# sourceMappingURL=LicensingUtils.js.map