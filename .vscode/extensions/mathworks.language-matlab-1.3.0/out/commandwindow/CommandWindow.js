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
const vscode = require("vscode");
const MVM_1 = require("./MVM");
const MVMInterface_1 = require("./MVMInterface");
/**
 * Direction of cursor movement
 */
var CursorDirection;
(function (CursorDirection) {
    CursorDirection[CursorDirection["LEFT"] = 0] = "LEFT";
    CursorDirection[CursorDirection["RIGHT"] = 1] = "RIGHT";
})(CursorDirection || (CursorDirection = {}));
/**
 * Direction of history movement
 */
var HistoryDirection;
(function (HistoryDirection) {
    HistoryDirection[HistoryDirection["BACKWARDS"] = 0] = "BACKWARDS";
    HistoryDirection[HistoryDirection["FORWARDS"] = 1] = "FORWARDS";
})(HistoryDirection || (HistoryDirection = {}));
/**
 * Indicator of whether the selection anchor should be kept in place or moved
 */
var AnchorPolicy;
(function (AnchorPolicy) {
    AnchorPolicy[AnchorPolicy["MOVE"] = 0] = "MOVE";
    AnchorPolicy[AnchorPolicy["KEEP"] = 1] = "KEEP";
})(AnchorPolicy || (AnchorPolicy = {}));
const ESC = '\x1b';
/**
 * Various terminal escape sequences
 */
const ACTION_KEYS = {
    LEFT: ESC + '[D',
    RIGHT: ESC + '[C',
    UP: ESC + '[A',
    DOWN: ESC + '[B',
    SHIFT_LEFT: ESC + '[1;2D',
    SHIFT_RIGHT: ESC + '[1;2C',
    HOME: ESC + '[H',
    END: ESC + '[F',
    SHIFT_HOME: ESC + '[1;2H',
    SHIFT_END: ESC + '[1;2F',
    NEWLINE: '\r\n',
    BACKSPACE: '\x7f',
    BACKSPACE_ALTERNATIVE: '\b',
    SELECT_ALL: '\x01',
    DELETE: ESC + '[3~',
    ESCAPE: ESC,
    INVERT_COLORS: ESC + '[7m',
    RESTORE_COLORS: ESC + '[27m',
    RED_FOREGROUND: ESC + '[31m',
    ALL_DEFAULT_COLORS: ESC + '[0m',
    COPY: '\x03',
    PASTE: '\x16',
    MOVE_TO_POSITION_IN_LINE: (n) => ESC + '[' + n.toString() + 'G',
    CLEAR_AND_MOVE_TO_BEGINNING: ESC + '[0G' + ESC + '[0J',
    CLEAR_COMPLETELY: ESC + '[2J' + ESC + '[1;1H',
    QUERY_CURSOR: ESC + '[6n',
    SET_CURSOR_STYLE_TO_BAR: ESC + '[5 q'
};
const PROMPTS = {
    IDLE_PROMPT: '>> ',
    DEBUG_PROMPT: 'K>> ',
    FAKE_INPUT_PROMPT: '? ',
    BUSY_PROMPT: ''
};
/**
 * Represents command window. Is a pseudoterminal to be used as the input/output processor in a VS Code terminal.
 */
class CommandWindow {
    constructor(mvm) {
        this._initialized = false;
        this._currentPrompt = PROMPTS.IDLE_PROMPT;
        this._currentState = MVMInterface_1.PromptState.INITIALIZING;
        this._currentPromptLine = this._currentPrompt;
        this._cursorIndex = 0;
        this._anchorIndex = undefined;
        this._lastOutputLine = '';
        this._commandHistory = [];
        this._historyIndex = 0;
        this._lastKnownCurrentLine = '';
        this._lastSentTerminalDimensions = null;
        this._justTypedLastInColumn = false;
        this._mvm = mvm;
        this._mvm.on(MVM_1.MVM.Events.output, this.addOutput.bind(this));
        this._mvm.on(MVM_1.MVM.Events.clc, this.clear.bind(this));
        this._mvm.on(MVM_1.MVM.Events.promptChange, this._handlePromptChange.bind(this));
        this._initialized = false;
        this._writeEmitter = new vscode.EventEmitter();
        this.onDidWrite = this._writeEmitter.event;
        this._terminalDimensions = { rows: 30, columns: 100 };
        this._mvm.on(MVM_1.MVM.Events.stateChanged, this._handleMatlabStateChange.bind(this));
        this._updateHasSelectionContext();
    }
    /**
     * Called when a terminal with this pseudoterminal is opened.
     *
     * Depending on MATLAB state we will either clear the terminal or write the current line again.
     * @param initialDimensions
     */
    open(initialDimensions) {
        if (initialDimensions != null) {
            this._terminalDimensions = initialDimensions;
        }
        this._writeEmitter.fire(ACTION_KEYS.SET_CURSOR_STYLE_TO_BAR);
        const currentMatlabState = this._mvm.getMatlabState();
        if (currentMatlabState === MVM_1.MatlabState.READY) {
            this._initialized = true;
            this._writeCurrentPromptLine();
        }
        else if (currentMatlabState === MVM_1.MatlabState.DISCONNECTED) {
            this._clearState();
            this._initialized = false;
            this._currentState = MVMInterface_1.PromptState.INITIALIZING;
        }
        else if (currentMatlabState === MVM_1.MatlabState.BUSY) {
            this._clearState();
            this._initialized = true;
        }
    }
    close() {
        // Unimplemented
    }
    /**
     * Resets the terminal state
     */
    _clearState() {
        this._writeEmitter.fire(ACTION_KEYS.CLEAR_COMPLETELY);
        this._setToEmptyPrompt();
        this._lastSentTerminalDimensions = null;
    }
    _handleMatlabStateChange(oldState, newState) {
        if (oldState === newState) {
            return;
        }
        if (newState === MVM_1.MatlabState.READY) {
            this._clearState();
            this._initialized = true;
            this._writeCurrentPromptLine();
        }
        else if (newState === MVM_1.MatlabState.DISCONNECTED) {
            this._clearState();
            this._initialized = false;
        }
        else if (newState === MVM_1.MatlabState.BUSY) {
            this._clearState();
            this._initialized = true;
        }
    }
    /**
     * Clear current line and selection
     */
    _setToEmptyPrompt() {
        this._currentPromptLine = this._currentPrompt;
        this._lastKnownCurrentLine = '';
        this._cursorIndex = 0;
        this._anchorIndex = undefined;
        this._updateHasSelectionContext();
        this._updateWhetherJustTypedInLastColumn();
    }
    /**
     * Insert a command to run and submit it.
     * @param command
     */
    insertCommandForEval(command) {
        if (this._currentPromptLine !== this._currentPrompt) {
            this._setToEmptyPrompt();
            this._writeCurrentPromptLine();
        }
        this.handleInput(command + ACTION_KEYS.NEWLINE);
    }
    /**
     * Handles input data from the user. Adds it to a queue to be processed asynchronously when we are next idle.
     * @param data
     * @returns
     */
    handleInput(data) {
        if (!this._initialized || this._currentState === MVMInterface_1.PromptState.INITIALIZING) {
            return;
        }
        if (this._currentState === MVMInterface_1.PromptState.PAUSE) {
            this._mvm.unpause();
            return;
        }
        this.handleText(data, false);
    }
    /**
     * Processes the incoming text, handling the terminal escape sequences as needed.
     * @param data
     * @param isOutput
     * @returns
     */
    handleText(data, isOutput) {
        if (this._isSpecialKey(data)) {
            // For now, disallow output from containing control characters.
            if (isOutput) {
                return;
            }
            if (this._handleActionKeys(data)) {
                this._writeCurrentPromptLine();
            }
            return;
        }
        if (data.length === 1 && data.charCodeAt(0) < ' '.charCodeAt(0) && data !== '\r' && data !== '\n') {
            return;
        }
        const lines = this._preprocessInputLines(data);
        if (isOutput) {
            for (let i = 0; i < lines.length; i++) {
                this._handleOutputLine(lines[i], i !== lines.length - 1);
            }
        }
        else {
            // Case 1: Normal typing
            if (lines.length === 1) {
                this._handleLine(lines[0]);
                // Case 2: Normal typing followed by an enter.
            }
            else if (lines.length === 2 && lines[1].length === 0) {
                this._handleLine(lines[0]);
                this._handleEnter();
                // Case 3: Multi-line input (ie, from pasting, etc)
            }
            else {
                for (let i = 0; i < lines.length; i++) {
                    this._handleLine(lines[i] + ((i === lines.length - 1) ? '' : ACTION_KEYS.NEWLINE));
                }
                this._handleEnter();
            }
        }
    }
    _handleOutputLine(line, implicitNewlineAtEnd) {
        const numberOfLinesBehind = Math.floor(this._getAbsoluteIndexOnLine(this._cursorIndex) / this._terminalDimensions.columns);
        if (numberOfLinesBehind !== 0) {
            this._writeEmitter.fire(ACTION_KEYS.UP.repeat(numberOfLinesBehind));
        }
        if (this._lastOutputLine.length !== 0) {
            this._writeEmitter.fire(ACTION_KEYS.UP);
        }
        this._writeEmitter.fire(ACTION_KEYS.CLEAR_AND_MOVE_TO_BEGINNING);
        this._lastOutputLine += line;
        this._writeEmitter.fire(this._lastOutputLine);
        if (implicitNewlineAtEnd) {
            this._handleOutputNewline();
        }
        if (this._lastOutputLine.length !== 0) {
            this._writeEmitter.fire(ACTION_KEYS.NEWLINE);
        }
        this._writeCurrentPromptLine(false);
    }
    _handleOutputNewline() {
        this._writeEmitter.fire(ACTION_KEYS.NEWLINE);
        this._lastOutputLine = '';
    }
    _isSpecialKey(data) {
        return data.startsWith(ESC) || Object.values(ACTION_KEYS).includes(data);
    }
    _handleActionKeys(keyCode) {
        switch (keyCode) {
            case ACTION_KEYS.LEFT:
                return this._handleLeftRight(CursorDirection.LEFT, AnchorPolicy.MOVE);
            case ACTION_KEYS.RIGHT:
                return this._handleLeftRight(CursorDirection.RIGHT, AnchorPolicy.MOVE);
            case ACTION_KEYS.SHIFT_LEFT:
                return this._handleLeftRight(CursorDirection.LEFT, AnchorPolicy.KEEP);
            case ACTION_KEYS.SHIFT_RIGHT:
                return this._handleLeftRight(CursorDirection.RIGHT, AnchorPolicy.KEEP);
            case ACTION_KEYS.END:
                return this._handleEnd(AnchorPolicy.MOVE);
            case ACTION_KEYS.SHIFT_END:
                return this._handleEnd(AnchorPolicy.KEEP);
            case ACTION_KEYS.HOME:
                return this._handleHome(AnchorPolicy.MOVE);
            case ACTION_KEYS.SHIFT_HOME:
                return this._handleHome(AnchorPolicy.KEEP);
            case ACTION_KEYS.DELETE:
                return this._handleDelete();
            case ACTION_KEYS.UP:
                return this._handleNavigateHistory(HistoryDirection.BACKWARDS);
            case ACTION_KEYS.DOWN:
                return this._handleNavigateHistory(HistoryDirection.FORWARDS);
            case ACTION_KEYS.ESCAPE:
                return this._handleEscape();
            case ACTION_KEYS.BACKSPACE:
            case ACTION_KEYS.BACKSPACE_ALTERNATIVE:
                return this._handleBackspace();
            case ACTION_KEYS.SELECT_ALL:
                return this._handleSelectAll();
            case ACTION_KEYS.COPY:
                return this._handleCopy();
            case ACTION_KEYS.PASTE:
                return this._handlePaste();
            default:
                return false;
        }
    }
    _preprocessInputLines(data) {
        data = data.replace(/\r\n?/g, '\n');
        const lines = data.split('\n');
        return lines;
    }
    _handleNavigateHistory(direction) {
        const isCurrentlyAtEndOfHistory = this._historyIndex === this._commandHistory.length;
        const isCurrentlyAtBeginningOfHistory = this._historyIndex === 0;
        if (direction === HistoryDirection.BACKWARDS && isCurrentlyAtBeginningOfHistory) {
            return false;
        }
        if (direction === HistoryDirection.FORWARDS && isCurrentlyAtEndOfHistory) {
            return false;
        }
        if (isCurrentlyAtEndOfHistory) {
            this._lastKnownCurrentLine = this._stripCurrentPrompt(this._currentPromptLine);
        }
        this._historyIndex += direction === HistoryDirection.BACKWARDS ? -1 : 1;
        return this._replaceCurrentLineWithNewLine(this._currentPrompt + this._getHistoryItem(this._historyIndex));
    }
    _markCurrentLineChanged() {
        this._historyIndex = this._commandHistory.length;
        this._lastKnownCurrentLine = '';
    }
    _possiblyUpdateAnchorForCursorChange(policy) {
        let isLineDirty = false;
        if (policy === AnchorPolicy.MOVE && this._anchorIndex !== undefined) {
            this._anchorIndex = undefined;
            isLineDirty = true;
        }
        else if (policy === AnchorPolicy.KEEP) {
            if (this._anchorIndex === undefined) {
                this._anchorIndex = this._cursorIndex;
            }
            isLineDirty = true;
        }
        this._updateHasSelectionContext();
        return isLineDirty;
    }
    _handleEnd(anchorPolicy) {
        const currentCursorLine = Math.ceil(this._getAbsoluteIndexOnLine(this._cursorIndex) / this._terminalDimensions.columns);
        const isLineDirty = this._possiblyUpdateAnchorForCursorChange(anchorPolicy);
        this._cursorIndex = this._getMaxIndexOnLine();
        this._moveCursorToCurrent(currentCursorLine);
        return isLineDirty;
    }
    _handleHome(anchorPolicy) {
        const currentCursorLine = Math.ceil(this._getAbsoluteIndexOnLine(this._cursorIndex) / this._terminalDimensions.columns);
        const isLineDirty = this._possiblyUpdateAnchorForCursorChange(anchorPolicy);
        this._cursorIndex = 0;
        this._moveCursorToCurrent(currentCursorLine);
        return isLineDirty;
    }
    _handleLeftRight(direction, anchorPolicy) {
        let isLineDirty = false;
        if (direction === CursorDirection.LEFT && this._cursorIndex !== 0) {
            if (this._justTypedLastInColumn) {
                // Don't actually move the cursor, but do move the index we think the cursor is at.
                this._justTypedLastInColumn = false;
            }
            else {
                if (this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns === 0) {
                    this._writeEmitter.fire(ACTION_KEYS.UP + ACTION_KEYS.MOVE_TO_POSITION_IN_LINE(this._terminalDimensions.columns));
                }
                else {
                    this._writeEmitter.fire(ACTION_KEYS.LEFT);
                }
            }
            isLineDirty = this._possiblyUpdateAnchorForCursorChange(anchorPolicy);
            this._cursorIndex--;
        }
        if (direction === CursorDirection.RIGHT && this._cursorIndex !== this._getMaxIndexOnLine()) {
            if (this._justTypedLastInColumn) {
                // Not possible
            }
            else {
                if (this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns === (this._terminalDimensions.columns - 1)) {
                    this._writeEmitter.fire(ACTION_KEYS.DOWN + ACTION_KEYS.MOVE_TO_POSITION_IN_LINE(0));
                }
                else {
                    this._writeEmitter.fire(ACTION_KEYS.RIGHT);
                }
            }
            isLineDirty = this._possiblyUpdateAnchorForCursorChange(anchorPolicy);
            this._cursorIndex++;
        }
        return isLineDirty;
    }
    _getMaxIndexOnLine() {
        return this._currentPromptLine.length - this._currentPrompt.length;
    }
    _getAbsoluteIndexOnLine(index) {
        return index + this._currentPrompt.length;
    }
    _handleBackspace() {
        if (this._anchorIndex !== undefined) {
            return this._removeSelection();
        }
        if (this._cursorIndex === 0) {
            return false;
        }
        const before = this._currentPromptLine.substring(0, this._getAbsoluteIndexOnLine(this._cursorIndex) - 1);
        const after = this._currentPromptLine.substring(this._getAbsoluteIndexOnLine(this._cursorIndex));
        this._currentPromptLine = before + after;
        this._cursorIndex--;
        this._markCurrentLineChanged();
        return true;
    }
    _handleSelectAll() {
        this._cursorIndex = this._getMaxIndexOnLine();
        this._anchorIndex = 0;
        this._updateHasSelectionContext();
        return true;
    }
    _handleDelete() {
        if (this._anchorIndex !== undefined) {
            return this._removeSelection();
        }
        if (this._cursorIndex === this._getMaxIndexOnLine()) {
            return false;
        }
        const before = this._currentPromptLine.substring(0, this._getAbsoluteIndexOnLine(this._cursorIndex));
        const after = this._currentPromptLine.substring(this._getAbsoluteIndexOnLine(this._cursorIndex) + 1);
        this._currentPromptLine = before + after;
        this._markCurrentLineChanged();
        return true;
    }
    _writeCurrentPromptLine(eraseExisting = true) {
        if (eraseExisting) {
            this._eraseExistingPromptLine();
        }
        if (this._anchorIndex === undefined) {
            this._writeEmitter.fire(this._currentPromptLine);
        }
        else {
            const selectionStart = this._currentPrompt.length + Math.min(this._cursorIndex, this._anchorIndex);
            const selectionEnd = this._currentPrompt.length + Math.max(this._cursorIndex, this._anchorIndex);
            const preSelection = this._currentPromptLine.slice(0, selectionStart);
            const selection = this._currentPromptLine.slice(selectionStart, selectionEnd);
            const postSelection = this._currentPromptLine.slice(selectionEnd);
            this._writeEmitter.fire(preSelection);
            this._writeEmitter.fire(ACTION_KEYS.INVERT_COLORS);
            this._writeEmitter.fire(selection);
            this._writeEmitter.fire(ACTION_KEYS.RESTORE_COLORS);
            this._writeEmitter.fire(postSelection);
        }
        const currentCursorLine = Math.ceil(this._currentPromptLine.length / this._terminalDimensions.columns);
        this._moveCursorToCurrent(currentCursorLine);
    }
    _eraseExistingPromptLine() {
        const numberOfLinesBehind = Math.floor(this._getAbsoluteIndexOnLine(this._cursorIndex) / this._terminalDimensions.columns);
        if (numberOfLinesBehind !== 0) {
            this._writeEmitter.fire(ACTION_KEYS.UP.repeat(numberOfLinesBehind));
        }
        this._writeEmitter.fire(ACTION_KEYS.CLEAR_AND_MOVE_TO_BEGINNING);
    }
    _replaceCurrentLineWithNewLine(updatedLine) {
        this._eraseExistingPromptLine();
        this._currentPromptLine = updatedLine;
        this._cursorIndex = this._getMaxIndexOnLine();
        this._anchorIndex = undefined;
        this._updateWhetherJustTypedInLastColumn();
        this._writeCurrentPromptLine(false);
        return false;
    }
    _removeSelection() {
        if (this._anchorIndex === undefined || this._cursorIndex === this._anchorIndex) {
            this._anchorIndex = undefined;
            this._updateHasSelectionContext();
            return false;
        }
        const selectionStart = this._getAbsoluteIndexOnLine(Math.min(this._cursorIndex, this._anchorIndex));
        const selectionEnd = this._getAbsoluteIndexOnLine(Math.max(this._cursorIndex, this._anchorIndex));
        const preSelection = this._currentPromptLine.slice(0, selectionStart);
        const postSelection = this._currentPromptLine.slice(selectionEnd);
        this._currentPromptLine = preSelection + postSelection;
        this._cursorIndex = selectionStart - this._currentPrompt.length;
        this._anchorIndex = undefined;
        this._updateHasSelectionContext();
        return true;
    }
    _handleLine(line) {
        if (this._removeSelection()) {
            this._writeCurrentPromptLine();
        }
        if (this._cursorIndex === this._getMaxIndexOnLine()) {
            this._currentPromptLine += line;
            this._cursorIndex += line.length;
            this._writeEmitter.fire(line);
        }
        else {
            const before = this._currentPromptLine.substring(0, this._getAbsoluteIndexOnLine(this._cursorIndex));
            const after = this._currentPromptLine.substring(this._getAbsoluteIndexOnLine(this._cursorIndex));
            this._currentPromptLine = before + line + after;
            this._cursorIndex += line.length;
            this._writeCurrentPromptLine();
        }
        this._markCurrentLineChanged();
        this._justTypedLastInColumn = this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns === 0;
    }
    _handleEnter() {
        const stringToEvaluate = this._stripCurrentPrompt(this._currentPromptLine).trim();
        this._addToHistory(stringToEvaluate);
        this._handleEnd(AnchorPolicy.MOVE);
        this._writeEmitter.fire(ACTION_KEYS.NEWLINE);
        this._lastOutputLine = '';
        this._currentPromptLine = this._currentPrompt;
        this._justTypedLastInColumn = this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns === 0;
        this._cursorIndex = 0;
        this._anchorIndex = undefined;
        this._updateHasSelectionContext();
        this._lastKnownCurrentLine = this._stripCurrentPrompt(this._currentPromptLine);
        this._writeCurrentPromptLine();
        void this._evaluateCommand(stringToEvaluate);
    }
    _addToHistory(command) {
        const isEmpty = command === '';
        const isLastInHistory = this._commandHistory.length !== 0 && command === this._commandHistory[this._commandHistory.length - 1];
        if (!isEmpty && !isLastInHistory) {
            this._commandHistory.push(command);
        }
        this._historyIndex = this._commandHistory.length;
    }
    _getHistoryItem(n) {
        if (this._historyIndex < this._commandHistory.length) {
            return this._commandHistory[n];
        }
        else {
            return this._lastKnownCurrentLine;
        }
    }
    _moveCursorToCurrent(lineOfInputCursorIsCurrentlyOn) {
        const lineNumberCursorShouldBeOn = Math.max(1, Math.ceil(this._getAbsoluteIndexOnLine(this._cursorIndex) / this._terminalDimensions.columns));
        if (lineOfInputCursorIsCurrentlyOn === undefined) {
            lineOfInputCursorIsCurrentlyOn = lineNumberCursorShouldBeOn;
        }
        lineOfInputCursorIsCurrentlyOn = Math.max(1, lineOfInputCursorIsCurrentlyOn);
        if (lineNumberCursorShouldBeOn > lineOfInputCursorIsCurrentlyOn) {
            this._writeEmitter.fire(ACTION_KEYS.DOWN.repeat(lineNumberCursorShouldBeOn - lineOfInputCursorIsCurrentlyOn));
        }
        else if (lineNumberCursorShouldBeOn < lineOfInputCursorIsCurrentlyOn) {
            this._writeEmitter.fire(ACTION_KEYS.UP.repeat(lineOfInputCursorIsCurrentlyOn - lineNumberCursorShouldBeOn));
        }
        this._writeEmitter.fire(ACTION_KEYS.MOVE_TO_POSITION_IN_LINE((this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns) + 1));
    }
    setDimensions(dimensions) {
        this._terminalDimensions = dimensions;
    }
    _sendTerminalDimensionsIfNeeded() {
        if ((this._lastSentTerminalDimensions == null) || this._lastSentTerminalDimensions.columns !== this._terminalDimensions.columns || this._lastSentTerminalDimensions.rows !== this._terminalDimensions.rows) {
            void this._mvm.eval(`try; if usejava('jvm'); com.mathworks.mde.cmdwin.CmdWinMLIF.setCWSize(${this._terminalDimensions.rows}, ${this._terminalDimensions.columns}); end; end;`);
            this._lastSentTerminalDimensions = this._terminalDimensions;
        }
    }
    _evaluateCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            this._sendTerminalDimensionsIfNeeded();
            return yield this._mvm.eval(command);
        });
    }
    /**
     *
     * @param output Add an output TextEvent to the command window. Stderr is displayed in red.
     */
    addOutput(output) {
        if (this._initialized) {
            if (output.stream === 0) {
                this.handleText(output.text, true);
            }
            else {
                this._writeEmitter.fire(ACTION_KEYS.RED_FOREGROUND);
                this.handleText(output.text, true);
                this._writeEmitter.fire(ACTION_KEYS.ALL_DEFAULT_COLORS);
            }
        }
    }
    /**
     * Clears the command window, and also wipes out the terminal's scroll history as well.
     */
    clear() {
        this._writeEmitter.fire(ACTION_KEYS.CLEAR_COMPLETELY);
        void vscode.commands.executeCommand('workbench.action.terminal.clear');
        this._setToEmptyPrompt();
    }
    _updateHasSelectionContext() {
        void vscode.commands.executeCommand('setContext', 'matlab.terminalHasSelection', this._anchorIndex !== undefined);
    }
    _handleCopy() {
        if (this._anchorIndex === undefined) {
            return false;
        }
        const selectionStart = this._currentPrompt.length + Math.min(this._cursorIndex, this._anchorIndex);
        const selectionEnd = this._currentPrompt.length + Math.max(this._cursorIndex, this._anchorIndex);
        const selection = this._currentPromptLine.slice(selectionStart, selectionEnd);
        void vscode.env.clipboard.writeText(selection);
        return false;
    }
    _handlePaste() {
        vscode.env.clipboard.readText().then((text) => {
            this.handleInput(text);
        }, () => {
            // Ignored
        });
        return false;
    }
    _handleEscape() {
        this._setToEmptyPrompt();
        return true;
    }
    _handlePromptChange(state, isIdle) {
        this._currentState = state;
        if (state === MVMInterface_1.PromptState.READY) {
            this._changePrompt(PROMPTS.IDLE_PROMPT);
        }
        else if (state === MVMInterface_1.PromptState.DEBUG) {
            this._changePrompt(PROMPTS.DEBUG_PROMPT);
        }
        else if (state === MVMInterface_1.PromptState.PAUSE) {
            this._changePrompt(PROMPTS.BUSY_PROMPT);
        }
        else if (state === MVMInterface_1.PromptState.INPUT) {
            this._changePrompt(PROMPTS.FAKE_INPUT_PROMPT);
        }
        else {
            this._changePrompt(PROMPTS.BUSY_PROMPT);
        }
    }
    _changePrompt(prompt) {
        if (this._currentPrompt !== PROMPTS.BUSY_PROMPT) {
            this._currentPromptLine = this._stripCurrentPrompt(this._currentPromptLine);
        }
        this._currentPrompt = prompt;
        this._currentPromptLine = this._currentPrompt + this._currentPromptLine;
        this._updateWhetherJustTypedInLastColumn();
        this._writeCurrentPromptLine();
    }
    _stripCurrentPrompt(line) {
        return this._currentPromptLine.slice(this._currentPrompt.length);
    }
    _updateWhetherJustTypedInLastColumn() {
        this._justTypedLastInColumn = this._getAbsoluteIndexOnLine(this._cursorIndex) % this._terminalDimensions.columns === 0;
    }
    /**
     *
     * @param data Helper used to log input is a readible manner
     */
    _logInput(data) {
        let shouldPrint = false;
        let s = '[';
        const prefix = '';
        for (let i = 0; i < data.length; i++) {
            let ch = data[i];
            if (data.charCodeAt(i) === 0x1b) {
                ch = 'ESC';
                shouldPrint = true;
            }
            else {
                if (ch.match(/[a-z0-9,./;'[\]\\`~!@#$%^&*()_+\-=|:'{}<>?]/i) === null) {
                    let hex = data.charCodeAt(i).toString(16);
                    if (hex.length === 1) {
                        hex = '0' + hex;
                    }
                    ch = '\\x' + hex;
                    shouldPrint = true;
                }
            }
            s += prefix + ch;
        }
        s += ']';
        if (shouldPrint) {
            console.log(s);
        }
    }
}
exports.default = CommandWindow;
//# sourceMappingURL=CommandWindow.js.map