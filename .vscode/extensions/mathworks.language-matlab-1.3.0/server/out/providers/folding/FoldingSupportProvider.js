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
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
class FoldingSupportProvider {
    constructor(matlabLifecycleManager) {
        this.matlabLifecycleManager = matlabLifecycleManager;
        this.REQUEST_CHANNEL = '/matlabls/foldDocument/request';
        this.RESPONSE_CHANNEL = '/matlabls/foldDocument/response';
    }
    handleFoldingRangeRequest(params, documentManager) {
        return __awaiter(this, void 0, void 0, function* () {
            const docToFold = documentManager.get(params.textDocument.uri);
            if (docToFold == null) {
                return null;
            }
            const matlabConnection = yield this.matlabLifecycleManager.getMatlabConnection();
            const isMatlabAvailable = (matlabConnection != null);
            const matlabRelease = this.matlabLifecycleManager.getMatlabRelease();
            // check for connection and release
            if (!isMatlabAvailable || (matlabRelease == null) || (matlabRelease < 'R2024b')) {
                return null;
            }
            const fileName = vscode_uri_1.URI.parse(docToFold.uri).fsPath;
            const code = docToFold.getText();
            const frArray = yield this.getFoldingRangesFromMatlab(code, fileName, matlabConnection);
            const foldingRanges = this.processFoldingRanges(frArray);
            return foldingRanges;
        });
    }
    /**
     * Gets folding ranges from MATLAB.
     *
     * @param code The code in the file
     * @param fileName The file's name
     * @param matlabConnection The connection to MATLAB
     * @returns An array of line numbers
     */
    getFoldingRangesFromMatlab(code, fileName, matlabConnection) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    channelId
                });
            });
        });
    }
    /**
     * Processes folding range data from MATLAB.
     *
     * @param frArray An array of line numbers from MATLAB
     * @returns An array of FoldingRanges
     */
    processFoldingRanges(frArray) {
        let fRangeArray = [];
        for (let i = 0; i < frArray.length; i = i + 2) {
            let fRange = vscode_languageserver_1.FoldingRange.create(frArray[i] - 1, frArray[i + 1] - 1);
            fRangeArray.push(fRange);
        }
        return fRangeArray;
    }
}
exports.default = FoldingSupportProvider;
//# sourceMappingURL=FoldingSupportProvider.js.map