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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTiming = exports.Argument = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const TelemetryUtils_1 = require("../logging/TelemetryUtils");
const CliUtils_1 = require("../utils/CliUtils");
const ClientConnection_1 = __importDefault(require("../ClientConnection"));
var Argument;
(function (Argument) {
    // Basic arguments
    Argument["MatlabLaunchCommandArguments"] = "matlabLaunchCommandArgs";
    Argument["MatlabInstallationPath"] = "matlabInstallPath";
    Argument["MatlabConnectionTiming"] = "matlabConnectionTiming";
    Argument["ShouldIndexWorkspace"] = "indexWorkspace";
    // Advanced arguments
    Argument["MatlabUrl"] = "matlabUrl";
})(Argument = exports.Argument || (exports.Argument = {}));
var ConnectionTiming;
(function (ConnectionTiming) {
    ConnectionTiming["OnStart"] = "onStart";
    ConnectionTiming["OnDemand"] = "onDemand";
    ConnectionTiming["Never"] = "never";
})(ConnectionTiming = exports.ConnectionTiming || (exports.ConnectionTiming = {}));
const SETTING_NAMES = [
    'installPath',
    'matlabConnectionTiming',
    'indexWorkspace',
    'telemetry',
    'maxFileSizeForAnalysis',
    'signIn'
];
class ConfigurationManager {
    constructor() {
        var _a, _b, _c, _d, _e;
        this.configuration = null;
        this.hasConfigurationCapability = false;
        // Map to keep track of callbacks to execute when a specific setting changes
        this.settingChangeCallbacks = new Map();
        const cliArgs = (0, CliUtils_1.getCliArgs)();
        this.defaultConfiguration = {
            installPath: '',
            matlabConnectionTiming: ConnectionTiming.OnStart,
            indexWorkspace: false,
            telemetry: true,
            maxFileSizeForAnalysis: 0,
            signIn: false
        };
        this.globalSettings = {
            installPath: (_a = cliArgs[Argument.MatlabInstallationPath]) !== null && _a !== void 0 ? _a : this.defaultConfiguration.installPath,
            matlabConnectionTiming: (_b = cliArgs[Argument.MatlabConnectionTiming]) !== null && _b !== void 0 ? _b : this.defaultConfiguration.matlabConnectionTiming,
            indexWorkspace: (_c = cliArgs[Argument.ShouldIndexWorkspace]) !== null && _c !== void 0 ? _c : this.defaultConfiguration.indexWorkspace,
            telemetry: this.defaultConfiguration.telemetry,
            maxFileSizeForAnalysis: this.defaultConfiguration.maxFileSizeForAnalysis,
            signIn: this.defaultConfiguration.signIn
        };
        this.additionalArguments = {
            [Argument.MatlabLaunchCommandArguments]: (_d = cliArgs[Argument.MatlabLaunchCommandArguments]) !== null && _d !== void 0 ? _d : '',
            [Argument.MatlabUrl]: (_e = cliArgs[Argument.MatlabUrl]) !== null && _e !== void 0 ? _e : ''
        };
    }
    static getInstance() {
        if (ConfigurationManager.instance == null) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }
    /**
     * Sets up the configuration manager
     *
     * @param capabilities The client capabilities
     */
    setup(capabilities) {
        var _a;
        const connection = ClientConnection_1.default.getConnection();
        this.hasConfigurationCapability = ((_a = capabilities.workspace) === null || _a === void 0 ? void 0 : _a.configuration) != null;
        if (this.hasConfigurationCapability) {
            // Register for configuration changes
            void connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type);
        }
        connection.onDidChangeConfiguration(params => { void this.handleConfigurationChanged(params); });
    }
    /**
     * Registers a callback for setting changes.
     *
     * @param settingName - The setting to listen for.
     * @param onSettingChangeCallback - The callback invoked on setting change.
     * @throws {Error} For invalid setting names.
     */
    addSettingCallback(settingName, onSettingChangeCallback) {
        if (this.settingChangeCallbacks.get(settingName) == null) {
            this.settingChangeCallbacks.set(settingName, onSettingChangeCallback);
        }
    }
    /**
     * Gets the configuration for the langauge server
     *
     * @returns The current configuration
     */
    getConfiguration() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.hasConfigurationCapability) {
                if (this.configuration == null) {
                    const connection = ClientConnection_1.default.getConnection();
                    this.configuration = (yield connection.workspace.getConfiguration('MATLAB'));
                }
                return this.configuration;
            }
            return this.globalSettings;
        });
    }
    /**
     * Gets the value of the given argument
     *
     * @param argument The argument
     * @returns The argument's value
     */
    getArgument(argument) {
        return this.additionalArguments[argument];
    }
    /**
     * Handles a change in the configuration
     * @param params The configuration changed params
     */
    handleConfigurationChanged(params) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let oldConfig;
            let newConfig;
            if (this.hasConfigurationCapability) {
                oldConfig = this.configuration;
                // Clear cached configuration
                this.configuration = null;
                // Force load new configuration
                newConfig = yield this.getConfiguration();
            }
            else {
                oldConfig = this.globalSettings;
                this.globalSettings = (_b = (_a = params.settings) === null || _a === void 0 ? void 0 : _a.matlab) !== null && _b !== void 0 ? _b : this.defaultConfiguration;
                newConfig = this.globalSettings;
            }
            this.compareSettingChanges(oldConfig, newConfig);
        });
    }
    compareSettingChanges(oldConfiguration, newConfiguration) {
        if (oldConfiguration == null) {
            // Not yet initialized
            return;
        }
        for (let i = 0; i < SETTING_NAMES.length; i++) {
            const settingName = SETTING_NAMES[i];
            const oldValue = oldConfiguration[settingName];
            const newValue = newConfiguration[settingName];
            if (oldValue !== newValue) {
                (0, TelemetryUtils_1.reportTelemetrySettingsChange)(settingName, newValue.toString(), oldValue.toString());
                // As the setting changed, execute the corresponding callback for it.
                const callback = this.settingChangeCallbacks.get(settingName);
                if (callback != null) {
                    callback(newConfiguration);
                }
            }
        }
    }
}
exports.default = ConfigurationManager.getInstance();
//# sourceMappingURL=ConfigurationManager.js.map