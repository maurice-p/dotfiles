"use strict";
// Copyright 2022 - 2023 The MathWorks, Inc.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCliArgs = void 0;
const yargs = __importStar(require("yargs"));
const ConfigurationManager_1 = require("../lifecycle/ConfigurationManager");
/**
 * Creates a yargs parser to extract command line arguments.
 *
 * @returns The parsed command line arguments
 */
function makeParser() {
    const argParser = yargs.option(ConfigurationManager_1.Argument.MatlabLaunchCommandArguments, {
        description: 'Arguments passed to MATLAB when launching',
        type: 'string',
        requiresArg: true
    }).option(ConfigurationManager_1.Argument.MatlabInstallationPath, {
        description: 'The full path to the top-level directory of the MATLAB installation. If not specified, the environment path will be checked for the location of the `matlab` executable.',
        type: 'string',
        default: ''
    }).option(ConfigurationManager_1.Argument.MatlabConnectionTiming, {
        description: 'When the language server should attempt to connect to MATLAB.',
        type: 'string',
        default: 'onStart',
        choices: ['onStart', 'onDemand', 'never']
    }).option(ConfigurationManager_1.Argument.ShouldIndexWorkspace, {
        boolean: true,
        default: false,
        description: 'Whether or not the user\'s workspace should be indexed.',
        requiresArg: false
    }).option(ConfigurationManager_1.Argument.MatlabUrl, {
        type: 'string',
        description: 'URL for communicating with an existing MATLAB instance',
        requiresArg: true
    }).usage('Usage: $0 {--node-ipc | --stdio | --socket=socket} options\n' +
        '\n' +
        '\tAn LSP server for MATLAB. This is meant to be invoked from an editor or IDE.\n').group(['node-ipc', 'stdio', 'socket'], 'Required IPC flag').option('node-ipc', {
        description: 'Use Node IPC'
    }).option('stdio', {
        description: 'Use stdio for IPC'
    }).option('socket', {
        description: 'Use specified socket for IPC',
        requiresArg: true
    }).help('help').alias('h', 'help');
    return argParser;
}
/**
 * Parse the command line arguments.
 *
 * @param args If provided, these are the arguments to parse. Otherwise, the true
 * command line arguments will be parsed. This is primarily meant for testing.
 * @returns The parsed CLI arguments
 */
function getCliArgs(args) {
    const cliParser = makeParser();
    return (args != null) ? cliParser.parseSync(args) : cliParser.parseSync();
}
exports.getCliArgs = getCliArgs;
//# sourceMappingURL=CliUtils.js.map