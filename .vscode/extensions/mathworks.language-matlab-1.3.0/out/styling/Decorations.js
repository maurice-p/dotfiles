"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontWeightBoldDecoration = exports.greyBorderBottomDecoration = exports.greyBorderTopDecoration = exports.blueBorderBottomDecoration = exports.blueBorderTopDecoration = void 0;
// Copyright 2024 The MathWorks, Inc.
const vscode = require("vscode");
const BLUE_COLOR = 'rgb(38,140,221)';
const LIGHT_GREY = 'rgb(136,136,136)';
const DARK_GREY = 'rgb(166,166,166)';
const borderBottomStyle = '0 0 1px 0';
const borderTopStyle = '1px 0 0 0';
// Create a decorator type for highlighted section
const blueBorder = {
    borderColor: BLUE_COLOR,
    borderStyle: 'solid',
    isWholeLine: true,
    light: {
        borderColor: BLUE_COLOR
    },
    dark: {
        borderColor: BLUE_COLOR
    }
};
const blueBorderTopDecoration = vscode.window.createTextEditorDecorationType(Object.assign({ borderWidth: borderTopStyle }, blueBorder));
exports.blueBorderTopDecoration = blueBorderTopDecoration;
const blueBorderBottomDecoration = vscode.window.createTextEditorDecorationType(Object.assign({ borderWidth: borderBottomStyle }, blueBorder));
exports.blueBorderBottomDecoration = blueBorderBottomDecoration;
const greyBorder = {
    borderColor: LIGHT_GREY,
    borderStyle: 'solid',
    isWholeLine: true,
    light: {
        borderColor: LIGHT_GREY
    },
    dark: {
        borderColor: DARK_GREY
    }
};
const greyBorderTopDecoration = vscode.window.createTextEditorDecorationType(Object.assign({ borderWidth: borderTopStyle }, greyBorder));
exports.greyBorderTopDecoration = greyBorderTopDecoration;
const greyBorderBottomDecoration = vscode.window.createTextEditorDecorationType(Object.assign({ borderWidth: borderBottomStyle }, greyBorder));
exports.greyBorderBottomDecoration = greyBorderBottomDecoration;
const fontWeightBoldDecoration = vscode.window.createTextEditorDecorationType({ fontWeight: 'bold', isWholeLine: true });
exports.fontWeightBoldDecoration = fontWeightBoldDecoration;
//# sourceMappingURL=Decorations.js.map