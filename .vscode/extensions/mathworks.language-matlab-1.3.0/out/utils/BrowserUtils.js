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
exports.openUrlInExternalBrowser = void 0;
const vscode = require("vscode");
/**
 * Opens the provided URL in an external browser.
 * If the URL fails to open in the browser, it renders the URL inside a VS Code webview panel.
 * @param url - The URL to open.
 * @returns A Promise that resolves when the URL is opened or rendered.
 */
function openUrlInExternalBrowser(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const parsedUrl = vscode.Uri.parse(url);
        // This is a no-op if the extension is running on the client machine.
        let externalUri = yield vscode.env.asExternalUri(parsedUrl);
        // In remote environments (ie. codespaces) asExternalUri() removes path and query fields in the vscode.Uri object
        // So, reinitialize it with required fields.
        externalUri = externalUri.with({ path: parsedUrl.path, query: parsedUrl.query });
        const success = yield vscode.env.openExternal(externalUri);
        // Render inside vscode's webview if the url fails to open in the browser.
        if (!success) {
            void vscode.window.showWarningMessage('Failed to open licensing server url in browser. Opening it within vs code.');
            const panel = vscode.window.createWebviewPanel('matlabLicensing', 'MATLAB Licensing', vscode.ViewColumn.Active, { enableScripts: true });
            panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Webview Example</title>
            <style>
                body, html, iframe {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    border: none;
                }
            </style>
        </head>
        <body>
        <iframe src="${externalUri.toString(true)}"></iframe>
        </body>
        </html>
    `;
        }
    });
}
exports.openUrlInExternalBrowser = openUrlInExternalBrowser;
//# sourceMappingURL=BrowserUtils.js.map