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
exports.addMiddlwares = exports.authenticateRequest = void 0;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const crypto_1 = __importDefault(require("crypto"));
const tokenAuth_1 = require("./tokenAuth");
const config_1 = require("../config");
/**
 * Middleware function to authenticate an incoming request.
 * If the request is authentic, passes control to the next middleware or route handler.
 * If not, sends a 403 Forbidden response.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next function to pass control to the next middleware/route handler.
 * @returns {void}
 */
function authenticateRequest(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield (0, tokenAuth_1.isRequestAuthentic)(req)) {
            next(); // Handover the request to the endpoint
        }
        else {
            res.sendStatus(403); // Return 403 immediately without handing over the request to the endpoint.
        }
    });
}
exports.authenticateRequest = authenticateRequest;
/**
 * Adds various middlewares to an Express server instance.
 * @param server - The Express server instance to which middlewares will be added.
 * @param buildPath - The path to the directory containing static files to serve.
 * @returns {void}
 */
function addMiddlwares(server, buildPath) {
    // Adds paths to static file content
    server.use(express_1.default.static(buildPath));
    // Adds ability to parse json
    server.use(express_1.default.json());
    // Adds ability to parse cookies
    server.use((0, cookie_parser_1.default)());
    // Adds ability to create sessions
    const uniqifySessionCookie = crypto_1.default.randomBytes(16).toString('hex');
    server.use((0, express_session_1.default)({
        name: `${config_1.MWI_LICENSING_SESSION_COOKIE_NAME}-${uniqifySessionCookie}`,
        secret: crypto_1.default.randomBytes(config_1.MWI_AUTH_TOKEN_LENGTH).toString('hex'),
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false
        }
    }));
}
exports.addMiddlwares = addMiddlwares;
//# sourceMappingURL=middlewares.js.map