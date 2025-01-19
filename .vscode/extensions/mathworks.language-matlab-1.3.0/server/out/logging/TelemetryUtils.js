"use strict";
// Copyright 2023-2024 The MathWorks, Inc.
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
exports.reportTelemetrySettingsChange = exports.reportTelemetryAction = exports.ActionErrorConditions = exports.Actions = void 0;
const NotificationService_1 = __importStar(require("../notifications/NotificationService"));
var EventKeys;
(function (EventKeys) {
    EventKeys["Action"] = "ACTIONS";
    EventKeys["SettingChange"] = "SETTING_CHANGE";
})(EventKeys || (EventKeys = {}));
var Actions;
(function (Actions) {
    Actions["OpenFile"] = "openFile";
    Actions["StartMatlab"] = "startMATLAB";
    Actions["ShutdownMatlab"] = "shutdownMATLAB";
    Actions["MatlabSessionKey"] = "getMATLABSession";
    Actions["FormatDocument"] = "formatDocument";
    Actions["GoToReference"] = "goToReference";
    Actions["GoToDefinition"] = "goToDefinition";
    Actions["DocumentSymbol"] = "documentSymbol";
    Actions["RenameSymbol"] = "renameSymbol";
})(Actions = exports.Actions || (exports.Actions = {}));
var ActionErrorConditions;
(function (ActionErrorConditions) {
    ActionErrorConditions["MatlabUnavailable"] = "MATLAB unavailable";
})(ActionErrorConditions = exports.ActionErrorConditions || (exports.ActionErrorConditions = {}));
/**
 * Reports a telemetry event to the client
 *
 * @param eventKey The event key
 * @param data The event's data
 */
function reportTelemetry(eventKey, data) {
    NotificationService_1.default.sendNotification(NotificationService_1.Notification.LogTelemetryData, {
        eventKey,
        data
    });
}
/**
 * Reports telemetry about a simple action
 *
 * @param actionType The action's type
 * @param data The action's data
 */
function reportTelemetryAction(actionType, data = '') {
    reportTelemetry(EventKeys.Action, {
        action_type: actionType,
        result: data
    });
}
exports.reportTelemetryAction = reportTelemetryAction;
/**
 * Reports telemetry about a settings change
 *
 * @param settingName The setting's name
 * @param newValue The new value
 * @param oldValue The old value
 */
function reportTelemetrySettingsChange(settingName, newValue, oldValue) {
    reportTelemetry(EventKeys.SettingChange, {
        setting_name: settingName,
        new_value: newValue,
        old_value: oldValue
    });
}
exports.reportTelemetrySettingsChange = reportTelemetrySettingsChange;
//# sourceMappingURL=TelemetryUtils.js.map