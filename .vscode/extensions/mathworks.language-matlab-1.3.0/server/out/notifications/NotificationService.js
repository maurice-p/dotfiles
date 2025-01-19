"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const ClientConnection_1 = __importDefault(require("../ClientConnection"));
var Notification;
(function (Notification) {
    // Connection Status Updates
    Notification["MatlabConnectionClientUpdate"] = "matlab/connection/update/client";
    Notification["MatlabConnectionServerUpdate"] = "matlab/connection/update/server";
    // Execution
    Notification["MatlabRequestInstance"] = "matlab/request";
    Notification["MVMEvalRequest"] = "evalRequest";
    Notification["MVMEvalComplete"] = "evalRequest";
    Notification["MVMFevalRequest"] = "fevalRequest";
    Notification["MVMFevalComplete"] = "fevalRequest";
    Notification["MVMText"] = "text";
    Notification["MVMClc"] = "clc";
    Notification["MVMInterruptRequest"] = "interruptRequest";
    Notification["MVMStateChange"] = "mvmStateChange";
    // Errors
    Notification["MatlabLaunchFailed"] = "matlab/launchfailed";
    Notification["MatlabFeatureUnavailable"] = "feature/needsmatlab";
    Notification["MatlabFeatureUnavailableNoMatlab"] = "feature/needsmatlab/nomatlab";
    // MATLAB Version Deprecation
    Notification["MatlabVersionDeprecation"] = "matlab/version/deprecation";
    // Telemetry
    Notification["LogTelemetryData"] = "telemetry/logdata";
    // MATLAB File Sections Updates
    Notification["MatlabSections"] = "matlab/sections";
    // Licensing
    Notification["LicensingServerUrl"] = "licensing/server/url";
    Notification["LicensingData"] = "licensing/data";
    Notification["LicensingDelete"] = "licensing/delete";
    Notification["LicensingError"] = "licensing/error";
})(Notification = exports.Notification || (exports.Notification = {}));
class NotificationService {
    static getInstance() {
        if (NotificationService.instance == null) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    /**
     * Sends a notification to the language client
     *
     * @param name The name of the notification
     * @param params Any parameters to send with the notification
     */
    sendNotification(name, params) {
        void ClientConnection_1.default.getConnection().sendNotification(name, params);
    }
    /**
     * Registers a notification listener for the specified notification name.
     *
     * @param name - The name of the notification to listen for.
     * @param callback - The callback function that will be invoked when the notification is received.
     * @returns A disposable object that can be used to unregister the notification listener.
     */
    registerNotificationListener(name, callback) {
        return ClientConnection_1.default.getConnection().onNotification(name, callback);
    }
}
exports.default = NotificationService.getInstance();
//# sourceMappingURL=NotificationService.js.map