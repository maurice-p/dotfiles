"use strict";
// Copyright 2022 - 2024 The MathWorks, Inc.
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
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
// Maps the completion type, as returned by MATLAB®, to the corresponding CompletionItemKind
const MatlabCompletionToKind = {
    literal: vscode_languageserver_1.CompletionItemKind.Text,
    unknown: vscode_languageserver_1.CompletionItemKind.Function,
    pathItem: vscode_languageserver_1.CompletionItemKind.File,
    mFile: vscode_languageserver_1.CompletionItemKind.Function,
    pFile: vscode_languageserver_1.CompletionItemKind.Function,
    mlxFile: vscode_languageserver_1.CompletionItemKind.Function,
    mlappFile: vscode_languageserver_1.CompletionItemKind.Function,
    mex: vscode_languageserver_1.CompletionItemKind.Function,
    mdlFile: vscode_languageserver_1.CompletionItemKind.Function,
    slxFile: vscode_languageserver_1.CompletionItemKind.Function,
    slxpFile: vscode_languageserver_1.CompletionItemKind.Function,
    sscFile: vscode_languageserver_1.CompletionItemKind.Function,
    sscpFile: vscode_languageserver_1.CompletionItemKind.Function,
    sfxFile: vscode_languageserver_1.CompletionItemKind.Class,
    folder: vscode_languageserver_1.CompletionItemKind.Folder,
    logical: vscode_languageserver_1.CompletionItemKind.Value,
    function: vscode_languageserver_1.CompletionItemKind.Function,
    filename: vscode_languageserver_1.CompletionItemKind.File,
    localFunction: vscode_languageserver_1.CompletionItemKind.Function,
    fieldname: vscode_languageserver_1.CompletionItemKind.Field,
    username: vscode_languageserver_1.CompletionItemKind.Text,
    variable: vscode_languageserver_1.CompletionItemKind.Variable,
    feature: vscode_languageserver_1.CompletionItemKind.Text,
    cellString: vscode_languageserver_1.CompletionItemKind.Value,
    class: vscode_languageserver_1.CompletionItemKind.Class,
    package: vscode_languageserver_1.CompletionItemKind.Module,
    property: vscode_languageserver_1.CompletionItemKind.Property,
    method: vscode_languageserver_1.CompletionItemKind.Method,
    enumeration: vscode_languageserver_1.CompletionItemKind.EnumMember,
    messageId: vscode_languageserver_1.CompletionItemKind.Text,
    keyword: vscode_languageserver_1.CompletionItemKind.Keyword,
    attribute: vscode_languageserver_1.CompletionItemKind.Keyword
};
/**
 * Handles requests for completion-related features.
 * Currently, this handles auto-completion as well as function signature help.
 */
class CompletionSupportProvider {
    constructor(matlabLifecycleManager) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.REQUEST_CHANNEL = '/matlabls/completions/request';
        this.RESPONSE_CHANNEL = '/matlabls/completions/response';
    }
    /**
     * Handles a request for auto-completion choices.
     *
     * @param params Parameters from the onCompletion request
     * @param documentManager The text document manager
     * @returns An array of possible completions
     */
    handleCompletionRequest(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = documentManager.get(params.textDocument.uri);
            if (doc == null) {
                return vscode_languageserver_1.CompletionList.create();
            }
            const completionData = yield this.retrieveCompletionData(doc, params.position);
            return this.parseCompletionItems(completionData);
        });
    }
    /**
     * Handles a request for function signature help.
     *
     * @param params Parameters from the onSignatureHelp request
     * @param documentManager The text document manager
     * @returns The signature help, or null if no signature help is available
     */
    handleSignatureHelpRequest(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = documentManager.get(params.textDocument.uri);
            if (doc == null) {
                return null;
            }
            const completionData = yield this.retrieveCompletionData(doc, params.position);
            return this.parseSignatureHelp(completionData);
        });
    }
    /**
     * Retrieves raw completion data from MATLAB.
     *
     * @param doc The text document
     * @param position The cursor position in the document
     * @returns The raw completion data
     */
    retrieveCompletionData(doc, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const docUri = doc.uri;
            const code = doc.getText();
            const fileName = vscode_uri_1.URI.parse(docUri).fsPath;
            const cursorPosition = doc.offsetAt(position);
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            if (matlabConnection == null) {
                return {};
            }
            return yield new Promise(resolve => {
                const channelId = matlabConnection.getChannelId();
                const channel = `${this.RESPONSE_CHANNEL}/${channelId}`;
                const responseSub = matlabConnection.subscribe(channel, message => {
                    matlabConnection.unsubscribe(responseSub);
                    resolve(message);
                });
                matlabConnection.publish(this.REQUEST_CHANNEL, {
                    code,
                    fileName,
                    cursorPosition,
                    channelId
                });
            });
        });
    }
    /**
     * Parses the raw completion data to extract possible auto-completions.
     *
     * @param completionData The raw completion data
     * @returns A list of completion items
     */
    parseCompletionItems(completionData) {
        var _a, _b;
        const completionItems = [];
        const completionsMap = new Map();
        // Gather completions from top-level object. This should find function completions.
        this.gatherCompletions(completionData, completionsMap);
        // Gather completions from each signature. This should find function argument completions.
        let signatures = completionData.signatures;
        if (signatures != null) {
            signatures = Array.isArray(signatures) ? signatures : [signatures];
            signatures.forEach(signature => {
                let inputArguments = signature.inputArguments;
                if (inputArguments == null) {
                    return;
                }
                inputArguments = Array.isArray(inputArguments) ? inputArguments : [inputArguments];
                inputArguments.forEach(inputArgument => {
                    this.gatherCompletions(inputArgument, completionsMap);
                });
            });
        }
        let index = 0;
        completionsMap.forEach((completionData, completionName) => {
            // Preserve the sorting from MATLAB
            const sortText = String(index).padStart(10, '0');
            const completionItem = vscode_languageserver_1.CompletionItem.create(completionName);
            completionItem.kind = completionData.kind;
            completionItem.detail = completionData.doc;
            completionItem.data = index++;
            completionItem.sortText = sortText;
            completionItems.push(completionItem);
        });
        return vscode_languageserver_1.CompletionList.create(completionItems, (_b = (_a = completionData.widgetData) === null || _a === void 0 ? void 0 : _a.truncated) !== null && _b !== void 0 ? _b : false);
    }
    /**
     * Parses raw completion and argument data and stores info about possible completions in the provided map.
     *
     * @param completionDataObj Raw completion or argument data
     * @param completionMap A map in which to store info about possible completions
     */
    gatherCompletions(completionDataObj, completionMap) {
        var _a;
        let choices = (_a = completionDataObj.widgetData) === null || _a === void 0 ? void 0 : _a.choices;
        if (choices == null) {
            return;
        }
        choices = Array.isArray(choices) ? choices : [choices];
        choices.forEach(choice => {
            var _a, _b, _c;
            let completion = choice.completion;
            let isPath = false;
            switch (choice.matchType) {
                case 'folder':
                case 'filename':
                    // For files and folders, the completion is the full path whereas the displayString is the path to be added
                    completion = (_a = choice.displayString) !== null && _a !== void 0 ? _a : '';
                    isPath = true;
                    break;
                case 'messageId':
                    // Remove quotes from completion
                    completion = ((_b = choice.displayString) !== null && _b !== void 0 ? _b : '').replace(/['"]/g, '');
                    break;
            }
            const dotIdx = choice.completion.lastIndexOf('.');
            if (dotIdx > 0 && !isPath) {
                completion = completion.slice(dotIdx + 1);
            }
            completionMap.set(completion, {
                kind: (_c = MatlabCompletionToKind[choice.matchType]) !== null && _c !== void 0 ? _c : vscode_languageserver_1.CompletionItemKind.Function,
                doc: choice.purpose
            });
        });
    }
    /**
     * Parses the raw completion data to extract function signature help.
     *
     * @param completionData The raw completion data
     * @returns The signature help, or null if no signature help is available
     */
    parseSignatureHelp(completionData) {
        let signatureData = completionData.signatures;
        if (signatureData == null) {
            return null;
        }
        signatureData = Array.isArray(signatureData) ? signatureData : [signatureData];
        const signatureHelp = {
            activeParameter: 0,
            activeSignature: 0,
            signatures: []
        };
        // Parse each signature
        signatureData.forEach(sigData => {
            const params = [];
            // Handle function inputs
            const argNames = [];
            let inputArguments = sigData.inputArguments;
            if (inputArguments == null) {
                return;
            }
            inputArguments = Array.isArray(inputArguments) ? inputArguments : [inputArguments];
            inputArguments.forEach((inputArg, index) => {
                let paramDoc = '';
                if (inputArg.purpose != null) {
                    paramDoc += inputArg.purpose;
                }
                if (inputArg.valueSummary != null) {
                    paramDoc += (paramDoc.length > 0 ? '\n' : '') + inputArg.valueSummary;
                }
                const paramDocArgs = paramDoc.length > 0 ? [paramDoc] : [];
                params.push(vscode_languageserver_1.ParameterInformation.create(inputArg.name, ...paramDocArgs));
                argNames.push(inputArg.name);
                if (inputArg.status === 'presenting') {
                    signatureHelp.activeParameter = index;
                }
            });
            let argStr = '';
            if (argNames.length === 1) {
                argStr = argNames[0];
            }
            else if (argNames.length > 1) {
                argStr = argNames.join(', ');
            }
            // Handle function outputs
            let outStr = '';
            let outputArguments = sigData.outputArguments;
            if (outputArguments != null) {
                outputArguments = Array.isArray(outputArguments) ? outputArguments : [outputArguments];
                outStr = outputArguments.length === 1
                    ? outputArguments[0].name
                    : `[${outputArguments.map(output => output.name).join(', ')}]`;
                outStr += ' = ';
            }
            const id = `${outStr}${sigData.functionName}(${argStr})`;
            signatureHelp.signatures.push(vscode_languageserver_1.SignatureInformation.create(id, undefined, ...params));
        });
        return signatureHelp;
    }
}
exports.default = CompletionSupportProvider;
//# sourceMappingURL=CompletionSupportProvider.js.map