"use strict";
// Copyright 2023-2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
var Notification;
(function (Notification) {
    // Connection Status Updates
    Notification["MatlabConnectionClientUpdate"] = "matlab/connection/update/client";
    Notification["MatlabConnectionServerUpdate"] = "matlab/connection/update/server";
    // Errors
    Notification["MatlabLaunchFailed"] = "matlab/launchfailed";
    Notification["MatlabFeatureUnavailable"] = "feature/needsmatlab";
    Notification["MatlabFeatureUnavailableNoMatlab"] = "feature/needsmatlab/nomatlab";
    // MATLAB Version Deprecation
    Notification["MatlabVersionDeprecation"] = "matlab/version/deprecation";
    // Execution
    Notification["MatlabRequestInstance"] = "matlab/request";
    Notification["MVMEvalRequest"] = "evalRequest";
    Notification["MVMEvalComplete"] = "evalResponse";
    Notification["MVMFevalRequest"] = "fevalRequest";
    Notification["MVMFevalComplete"] = "fevalResponse";
    Notification["MVMSetBreakpointRequest"] = "setBreakpointRequest";
    Notification["MVMSetBreakpointComplete"] = "setBreakpointResponse";
    Notification["MVMClearBreakpointRequest"] = "clearBreakpointRequest";
    Notification["MVMClearBreakpointComplete"] = "clearBreakpointResponse";
    Notification["MVMText"] = "text";
    Notification["MVMClc"] = "clc";
    Notification["MVMPromptChange"] = "mvmPromptChange";
    Notification["MVMInterruptRequest"] = "interruptRequest";
    Notification["MVMUnpauseRequest"] = "unpauseRequest";
    Notification["MVMStateChange"] = "mvmStateChange";
    Notification["DebuggingStateChange"] = "DebuggingStateChange";
    Notification["DebugAdaptorRequest"] = "DebugAdaptorRequest";
    Notification["DebugAdaptorResponse"] = "DebugAdaptorResponse";
    Notification["DebugAdaptorEvent"] = "DebugAdaptorEvent";
    // Telemetry
    Notification["LogTelemetryData"] = "telemetry/logdata";
    // Sections generated for Section Styling
    Notification["MatlabSections"] = "matlab/sections";
    // Licensing
    Notification["LicensingServerUrl"] = "licensing/server/url";
    Notification["LicensingData"] = "licensing/data";
    Notification["LicensingDelete"] = "licensing/delete";
    Notification["LicensingError"] = "licensing/error";
})(Notification || (Notification = {}));
exports.default = Notification;
//# sourceMappingURL=Notifications.js.map