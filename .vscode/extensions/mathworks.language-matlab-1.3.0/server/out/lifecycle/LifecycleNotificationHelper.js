"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
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
Object.defineProperty(exports, "__esModule", { value: true });
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
class LifecycleNotificationHelper {
    constructor() {
        this.didMatlabLaunchFail = false;
    }
    static getInstance() {
        if (LifecycleNotificationHelper.instance == null) {
            LifecycleNotificationHelper.instance = new LifecycleNotificationHelper();
        }
        return LifecycleNotificationHelper.instance;
    }
    /**
     * Sends notification to the language client of a change in the MATLAB® connection state.
     *
     * @param connectionStatus The connection state
     */
    notifyConnectionStatusChange(connectionStatus) {
        NotificationService_1.default.sendNotification(NotificationService_1.Notification.MatlabConnectionServerUpdate, {
            connectionStatus
        });
    }
    /**
     * Sends notification to the language client to inform user that MATLAB is required for an action.
     */
    notifyMatlabRequirement() {
        // Indicate different messages if MATLAB failed to launch (i.e. could not be found)
        const notification = this.didMatlabLaunchFail ? NotificationService_1.Notification.MatlabFeatureUnavailableNoMatlab : NotificationService_1.Notification.MatlabFeatureUnavailable;
        NotificationService_1.default.sendNotification(notification);
    }
}
exports.default = LifecycleNotificationHelper.getInstance();
//# sourceMappingURL=LifecycleNotificationHelper.js.map