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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPortFree = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const ProxyUtils_1 = require("./ProxyUtils");
const net_1 = __importDefault(require("net"));
/**
 * Sends an HTTP request to the specified URL with the provided options.
 *
 * @param url - The URL to send the request to.
 * @param options - The options for the request.
 * @returns {Promise<Response | null>} A Promise that resolves with the Response object if the request is successful, or null if an error occurs.
 */
function sendRequest(url, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const proxyAgent = (0, ProxyUtils_1.getProxyAgent)(url);
            if (proxyAgent != null) {
                options.agent = proxyAgent;
                console.log(`Will use NETWORK PROXY for sending request to: ${url}`);
            }
            const response = yield (0, node_fetch_1.default)(url, options);
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            return response;
        }
        catch (error) {
            console.error('Failed to send HTTP request: ', error);
            return null;
        }
    });
}
exports.default = sendRequest;
/**
 * Checks if a specified port is free to use.
 *
 * @param  port - The port number to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the port is free or `false` if the port is occupied.
 */
function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net_1.default.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            }
            else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close(() => {
                resolve(true);
            });
        });
        server.listen(port);
    });
}
exports.isPortFree = isPortFree;
//# sourceMappingURL=NetworkUtils.js.map