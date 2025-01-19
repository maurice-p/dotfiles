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
const vscode_languageserver_1 = require("vscode-languageserver");
const LifecycleNotificationHelper_1 = __importDefault(require("../../lifecycle/LifecycleNotificationHelper"));
const TelemetryUtils_1 = require("../../logging/TelemetryUtils");
const TextDocumentUtils = __importStar(require("../../utils/TextDocumentUtils"));
/**
 * Handles requests for format-related features.
 * Currently, this handles formatting the entire document. In the future, this may be expanded to
 * include formatting a range witin the documemt.
 */
class FormatSupportProvider {
    constructor(matlabLifecycleManager) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.REQUEST_CHANNEL = '/matlabls/formatDocument/request';
        this.RESPONSE_CHANNEL = '/matlabls/formatDocument/response';
    }
    /**
     * Handles a request for document formatting.
     *
     * @param params Parameters from the onDocumentFormatting request
     * @param documentManager The text document manager
     * @param connection The language server connection
     * @returns An array of text edits required for the formatting operation, or null if the operation cannot be performed
     */
    handleDocumentFormatRequest(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const docToFormat = documentManager.get(params.textDocument.uri);
            if (docToFormat == null) {
                return null;
            }
            return yield this.formatDocument(docToFormat, params.options);
        });
    }
    /**
     * Determines the edits required to format the given document.
     *
     * @param doc The document being formatted
     * @param options The formatting options
     * @returns An array of text edits required to format the document
     */
    formatDocument(doc, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // For format, we try to instantiate MATLAB® if it is not already running
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection(true);
            // If MATLAB is not available, no-op
            if (matlabConnection == null) {
                LifecycleNotificationHelper_1.default.notifyMatlabRequirement();
                (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.FormatDocument, TelemetryUtils_1.ActionErrorConditions.MatlabUnavailable);
                return [];
            }
            return yield new Promise(resolve => {
                const channelId = matlabConnection.getChannelId();
                const channel = `${this.RESPONSE_CHANNEL}/${channelId}`;
                const responseSub = matlabConnection.subscribe(channel, message => {
                    matlabConnection.unsubscribe(responseSub);
                    const newCode = message.data;
                    const endRange = TextDocumentUtils.getRangeUntilLineEnd(doc, doc.lineCount - 1, 0);
                    const edit = vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), endRange.end), newCode);
                    (0, TelemetryUtils_1.reportTelemetryAction)(TelemetryUtils_1.Actions.FormatDocument);
                    resolve([edit]);
                });
                matlabConnection.publish(this.REQUEST_CHANNEL, {
                    data: doc.getText(),
                    insertSpaces: options.insertSpaces,
                    tabSize: options.tabSize,
                    channelId
                });
            });
        });
    }
}
exports.default = FormatSupportProvider;
//# sourceMappingURL=FormatSupportProvider.js.map