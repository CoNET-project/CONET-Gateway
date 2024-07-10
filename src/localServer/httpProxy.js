"use strict";
/*!
 * Copyright 2018 CoNET Technology Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var net_1 = require("net");
var cacheFileType = /\.jpeg$|\.html$|\.css$|\.gif$|\.js$|\.jpg$|\.png$|\.svg$|\.xml$/i;
var httpProxy = /** @class */ (function () {
    function httpProxy(buffer) {
        this.buffer = buffer;
        this.text = buffer.toString('utf8');
        this._parts = this.text.split('\r\n\r\n');
        this.commandWithLine = this._parts[0].split(/\r\n/);
        var u = '{';
        for (var i = 1, k = 0; i < this.commandWithLine.length; i++) {
            var line = this.commandWithLine[i].split(': ');
            if (line.length !== 2) {
                if (/^host$/i.test(line[0]))
                    continue;
                break;
            }
            if (k++ !== 0)
                u += ',';
            u += "\"".concat(line[0].toLowerCase(), "\": ").concat(JSON.stringify(line[1]));
        }
        u += '}';
        this.headers = JSON.parse(u);
    }
    Object.defineProperty(httpProxy.prototype, "parts", {
        get: function () {
            return Math.round(this._parts.length / 2);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "nextPart", {
        get: function () {
            var part = '\r\n\r\n';
            if (this.parts > 1) {
                var part1 = this.text.indexOf(part);
                var part2 = this.text.indexOf(part, part1 + 1);
                var kk = this.buffer.slice(part2 + 4);
                if (kk.length)
                    return kk;
            }
            return Buffer.alloc(0);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isHttps", {
        get: function () {
            return (this.isConnect);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isHttpRequest", {
        get: function () {
            return (/^connect|^get|^put|^delete|^post|^OPTIONS|^HEAD|^TRACE/i.test(this.commandWithLine[0]));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "methods", {
        get: function () {
            return this.commandWithLine[0].split(' ')[0];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isConnect", {
        get: function () {
            return (/^connect /i.test(this.commandWithLine[0]));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "hostIpAddress", {
        get: function () {
            if (!(0, net_1.isIP)(this.host)) {
                return '';
            }
            return this.host;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isGet", {
        get: function () {
            return /^GET /i.test(this.commandWithLine[0]);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isPost", {
        get: function () {
            return /^port/i.test(this.commandWithLine[0]);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "host", {
        get: function () {
            if (!this.headers['host']) {
                return '';
            }
            return this.headers['host'].split(':')[0];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "cachePath", {
        get: function () {
            if (!this.isGet || !this.isCanCacheFile)
                return null;
            return (0, crypto_1.createHash)('md5').update(this.host + this.commandWithLine[0]).digest('hex');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "isCanCacheFile", {
        get: function () {
            return cacheFileType.test(this.commandWithLine[0].split(' ')[1]);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "getProxyAuthorization", {
        get: function () {
            for (var i = 1; i < this.commandWithLine.length; i++) {
                var y = this.commandWithLine[i];
                if (/^Proxy-Authorization: Basic /i.test(y)) {
                    var n = y.split(' ');
                    if (n.length === 3) {
                        return Buffer.from(n[2], 'base64').toString();
                    }
                    return;
                }
            }
            return;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "BufferWithOutKeepAlife", {
        get: function () {
            if (!this.isGet || !this.isCanCacheFile)
                return this.buffer;
            var ss = '';
            this.commandWithLine.forEach(function (n) {
                ss += n.replace('keep-alive', 'close') + '\r\n';
            });
            ss += '\r\n\r\n';
            return Buffer.from(ss);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "Body", {
        get: function () {
            var length = parseInt(this.headers['content-length']);
            if (!length)
                return null;
            var body = this._parts[1];
            if (body && body.length && body.length === length)
                return body;
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "preBodyLength", {
        get: function () {
            var body = this._parts[1];
            return body.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "Port", {
        get: function () {
            //console.log ( this.commandWithLine )
            var uu = this.commandWithLine[0].split(/\/\//);
            if (uu.length > 1) {
                var kk = uu[1].split(':');
                if (kk.length > 1) {
                    var ret = kk[1].split(' ')[0];
                    console.log("ret = [".concat(ret, "]"));
                    return parseInt(ret);
                }
                return 80;
            }
            var vv = this.commandWithLine[0].split(':');
            if (vv.length > 1) {
                var kk = vv[1].split(' ')[0];
                return parseInt(kk);
            }
            return 443;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(httpProxy.prototype, "BodyLength", {
        get: function () {
            return parseInt(this.headers['content-length']);
        },
        enumerable: false,
        configurable: true
    });
    return httpProxy;
}());
exports.default = httpProxy;
