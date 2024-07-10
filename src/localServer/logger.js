"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexDebug = exports.loggerToStream = exports.logger = void 0;
var hexdump_nodejs_1 = require("hexdump-nodejs");
var safe_1 = require("colors/safe");
var logger = function () {
    var argv = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        argv[_i] = arguments[_i];
    }
    var date = new Date();
    var dateStrang = "%c [CONET-worker INFO ".concat(date.getHours(), ":").concat(date.getMinutes(), ":").concat(date.getSeconds(), ":").concat(date.getMilliseconds(), "]");
    return console.log.apply(console, __spreadArray([dateStrang, 'color: #dcde56'], argv, false));
};
exports.logger = logger;
var loggerToStream = function (logStream) {
    var argv = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        argv[_i - 1] = arguments[_i];
    }
    var date = new Date();
    logStream += "Proxy [".concat(date.getHours(), ":").concat(date.getMinutes(), ":").concat(date.getSeconds(), ":").concat(date.getMilliseconds(), "] ").concat(__spreadArray([], argv, true));
};
exports.loggerToStream = loggerToStream;
var hexDebug = function (buffer, length) {
    if (length === void 0) { length = 256; }
    console.log(safe_1.default.underline(safe_1.default.green("TOTAL LENGTH [".concat(buffer.length, "]"))));
    console.log(safe_1.default.grey((0, hexdump_nodejs_1.default)(buffer.slice(0, length))));
};
exports.hexDebug = hexDebug;
