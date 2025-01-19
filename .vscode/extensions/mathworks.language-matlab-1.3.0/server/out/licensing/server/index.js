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
exports.stopLicensingServer = exports.startLicensingServer = exports.url = exports.matlabLifecycleManager = void 0;
const express_1 = __importDefault(require("express"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./routes");
const middlewares_1 = require("./middlewares");
const tokenAuth_1 = require("./tokenAuth");
const config_1 = require("../config");
const FsUtils_1 = require("../../utils/FsUtils");
const NetworkUtils_1 = require("../../utils/NetworkUtils");
let server = null;
let port = null;
let licensingUrlFilePath = path_1.default.join(os_1.default.tmpdir(), "url.json");
/**
 * The URL of the running server.
 */
exports.url = null;
/**
 * Starts the server and returns its URL.
 *
 * @param buildPath - The path to the build directory.
 * @returns {string} The URL of the running server.
 */
function startLicensingServer(buildPath, mLM) {
    return __awaiter(this, void 0, void 0, function* () {
        if (exports.url !== null) {
            return exports.url;
        }
        // If in a codespaces environment, getExistingUrl() will return 
        // a previously started licensing server in the event of a page reload.
        const existingUrl = yield getExistingUrl();
        if (existingUrl) {
            exports.url = existingUrl;
            return exports.url;
        }
        exports.matlabLifecycleManager = mLM;
        server = (0, express_1.default)();
        (0, middlewares_1.addMiddlwares)(server, buildPath);
        // Add routes
        (0, routes_1.addRoutes)(server);
        // Start the server on a random port.
        const app = server.listen(0);
        const address = app.address();
        port = address.port;
        // Generate auth token
        const authToken = (0, tokenAuth_1.generateAuthToken)(config_1.MWI_AUTH_TOKEN_LENGTH);
        exports.url = `http://localhost:${port}/index.html?${config_1.MWI_AUTH_TOKEN_NAME_FOR_HTTP}=${authToken}`;
        // Write url to file for handling new server start on page reload.
        (0, FsUtils_1.writeJSONDataToFile)(licensingUrlFilePath, { url: exports.url });
        return exports.url;
    });
}
exports.startLicensingServer = startLicensingServer;
/**
 * Stops the running server.
 */
function stopLicensingServer() {
    if (server != null) {
        server.close(() => {
            console.log('Server stopped successfully');
        });
        (0, FsUtils_1.deleteFile)(licensingUrlFilePath).then(() => { });
    }
}
exports.stopLicensingServer = stopLicensingServer;
/**
 * Retrieves an existing URL of the licensing server if it was started previously. Useful in Github codespaces.

 * @returns {Promise<string>} A promise resolving to the URL string if the port is occupied, or an empty string otherwise.
 */
function getExistingUrl() {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs_1.default.existsSync(licensingUrlFilePath)) {
            const data = JSON.parse(fs_1.default.readFileSync(licensingUrlFilePath, 'utf8'));
            const serverUrl = new URL(data.url);
            if (yield (0, NetworkUtils_1.isPortFree)(Number(serverUrl.port))) {
                return '';
            }
            else {
                return serverUrl.toString();
            }
        }
        return '';
    });
}
//# sourceMappingURL=index.js.map