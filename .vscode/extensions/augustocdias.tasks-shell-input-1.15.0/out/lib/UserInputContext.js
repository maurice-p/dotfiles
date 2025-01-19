"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInputContext = void 0;
class UserInputContext {
    constructor() {
        this.recordedInputsByInputId = {};
        this.recordedInputsByTaskId = {};
    }
    recordInputByInputId(inputId, taskValue) {
        if (inputId !== undefined) {
            this.recordedInputsByInputId[inputId] = taskValue;
        }
    }
    recordInputByTaskId(taskId, taskValue) {
        if (taskId !== undefined) {
            this.recordedInputsByTaskId[taskId] = taskValue;
        }
    }
    lookupInputValueByInputId(inputId) {
        return this.recordedInputsByInputId[inputId];
    }
    lookupInputValueByTaskId(taskId) {
        return this.recordedInputsByTaskId[taskId];
    }
}
exports.UserInputContext = UserInputContext;
//# sourceMappingURL=UserInputContext.js.map