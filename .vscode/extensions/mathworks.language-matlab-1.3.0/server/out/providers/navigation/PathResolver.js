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
const vscode_uri_1 = require("vscode-uri");
class PathResolver {
    constructor() {
        this.REQUEST_CHANNEL = '/matlabls/navigation/resolvePath/request';
        this.RESPONSE_CHANNEL = '/matlabls/navigation/resolvePath/response';
    }
    /**
     * Attempts to resolve the given names to the files in which the names are defined.
     * For example, 'MyClass' may be resolved to 'file:///path/to/MyClass.m'.
     *
     * @param names The names which should be resolved to paths
     * @param contextFileUri The file from which the context of the path resolution should be made
     * @param matlabConnection The connection to MATLAB®
     *
     * @returns The resolved URIs. Any URIs which could not be determiend are denoted by empty strings.
     */
    resolvePaths(names, contextFileUri, matlabConnection) {
        return __awaiter(this, void 0, void 0, function* () {
            const contextFile = vscode_uri_1.URI.parse(contextFileUri).fsPath;
            return yield new Promise(resolve => {
                const channelId = matlabConnection.getChannelId();
                const channel = `${this.RESPONSE_CHANNEL}/${channelId}`;
                const responseSub = matlabConnection.subscribe(channel, message => {
                    matlabConnection.unsubscribe(responseSub);
                    const resolvedPaths = message.data;
                    // Convert file system paths from MATLAB to URIs
                    const resolvedUris = resolvedPaths.map(resolvedPath => {
                        const filePath = resolvedPath.path;
                        const uri = (filePath === '') ? '' : vscode_uri_1.URI.file(filePath).toString();
                        return {
                            name: resolvedPath.name,
                            uri
                        };
                    });
                    resolve(resolvedUris);
                });
                matlabConnection.publish(this.REQUEST_CHANNEL, {
                    names,
                    contextFile,
                    channelId
                });
            });
        });
    }
}
exports.default = PathResolver;
//# sourceMappingURL=PathResolver.js.map