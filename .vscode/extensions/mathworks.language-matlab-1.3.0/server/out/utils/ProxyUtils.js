"use strict";
// Copyright 2024 The MathWorks, Inc.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyAgent = exports.getProxyEnvironmentVariables = exports.isProxyEnvironment = exports.cacheAndClearProxyEnvironmentVariables = void 0;
const hpagent_1 = require("hpagent");
const proxyEnvironmentVariables = {};
/**
 * Workaround for connection issue with proxy environments: cache values for HTTP_PROXY,
 * HTTPS_PROXY, and NO_PROXY environment variables, then delete variables from environment.
 */
function cacheAndClearProxyEnvironmentVariables() {
    var _a, _b, _c;
    const httpProxy = (_a = process.env.HTTP_PROXY) !== null && _a !== void 0 ? _a : process.env.http_proxy;
    const httpsProxy = (_b = process.env.HTTPS_PROXY) !== null && _b !== void 0 ? _b : process.env.https_proxy;
    const noProxy = (_c = process.env.NO_PROXY) !== null && _c !== void 0 ? _c : process.env.no_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
    if (httpProxy != null) {
        proxyEnvironmentVariables.HTTP_PROXY = httpProxy;
    }
    if (httpsProxy != null) {
        proxyEnvironmentVariables.HTTPS_PROXY = httpsProxy;
    }
    if (noProxy != null) {
        proxyEnvironmentVariables.NO_PROXY = noProxy;
    }
}
exports.cacheAndClearProxyEnvironmentVariables = cacheAndClearProxyEnvironmentVariables;
/**
 * Determines if running within a proxy environment.
 *
 * @returns True if within a proxy environment, false otherwise
 */
function isProxyEnvironment() {
    return Object.keys(proxyEnvironmentVariables).length > 0;
}
exports.isProxyEnvironment = isProxyEnvironment;
/**
 * Gets any proxy environment variables and their values that had been set prior to
 * `cacheAndClearProxyEnvironmentVariables` being called.
 *
 * @returns An object containing any proxy-related environment variables and their values
 */
function getProxyEnvironmentVariables() {
    return proxyEnvironmentVariables;
}
exports.getProxyEnvironmentVariables = getProxyEnvironmentVariables;
/**
 * Returns an HTTP or HTTPS proxy agent based on the provided URL.
 *
 * @param url - The URL to determine the proxy agent for.
 * @returns {HttpProxyAgent | HttpsProxyAgent | undefined} - The proxy agent, or undefined if no proxy is used.
 */
function getProxyAgent(url) {
    const parsedUrl = new URL(url);
    if (!isProxyEnvironment()) {
        return undefined;
    }
    const proxyEnvironmentVariables = getProxyEnvironmentVariables();
    // Determine if we should bypass the proxy
    const noProxy = proxyEnvironmentVariables.NO_PROXY;
    if (typeof noProxy !== 'undefined' && noProxy !== null && noProxy.trim() !== '') {
        const noProxyHosts = noProxy.split(',').map(host => host.trim());
        if (noProxyHosts.includes(parsedUrl.hostname)) {
            return undefined;
        }
    }
    // Determine which proxy to use based on the protocol
    if (parsedUrl.protocol === 'http:') {
        const httpProxy = proxyEnvironmentVariables.HTTP_PROXY;
        if (httpProxy !== undefined && httpProxy !== null && httpProxy !== '') {
            return new hpagent_1.HttpProxyAgent({
                proxy: httpProxy
            });
        }
    }
    if (parsedUrl.protocol === 'https:') {
        const httpsProxy = proxyEnvironmentVariables.HTTPS_PROXY;
        if (httpsProxy !== undefined && httpsProxy !== null && httpsProxy !== '') {
            return new hpagent_1.HttpProxyAgent({
                proxy: httpsProxy
            });
        }
    }
    return undefined;
}
exports.getProxyAgent = getProxyAgent;
//# sourceMappingURL=ProxyUtils.js.map