"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptState = exports.Capability = void 0;
var Capability;
(function (Capability) {
    Capability["InteractiveCommandLine"] = "InteractiveCommandLine";
    Capability["Swing"] = "Swing";
    Capability["ComplexSwing"] = "ComplexSwing";
    Capability["LocalClient"] = "LocalClient";
    Capability["WebWindow"] = "WebWindow";
    Capability["ModalDialogs"] = "ModalDialogs";
    Capability["Debugging"] = "Debugging";
})(Capability = exports.Capability || (exports.Capability = {}));
var PromptState;
(function (PromptState) {
    PromptState["INITIALIZING"] = "INITIALIZING";
    PromptState["READY"] = "READY";
    PromptState["BUSY"] = "BUSY";
    PromptState["DEBUG"] = "DEBUG";
    PromptState["INPUT"] = "INPUT";
    PromptState["PAUSE"] = "PAUSE";
    PromptState["MORE"] = "MORE";
    PromptState["COMPLETING_BLOCK"] = "COMPLETING_BLOCK";
})(PromptState = exports.PromptState || (exports.PromptState = {}));
//# sourceMappingURL=MVMInterface.js.map