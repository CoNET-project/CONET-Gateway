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
exports.socket4Requests = exports.Requests = exports.Replies = exports.ATYP = exports.CMD = void 0;
// =======================================================================
/*
  +----+-----+-------+------+----------+----------+
  |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  +----+-----+-------+------+----------+----------+
  | 1  |  1  | X'00' |  1   | Variable |    2     |
  +----+-----+-------+------+----------+----------+

  Where:

        o  VER    protocol version: X'05'
        o  CMD
           o  CONNECT X'01'
           o  BIND X'02'
           o  UDP ASSOCIATE X'03'
        o  RSV    RESERVED
        o  ATYP   address type of following address
           o  IP V4 address: X'01'
           o  DOMAINNAME: X'03'
           o  IP V6 address: X'04'
        o  DST.ADDR       desired destination address
        o  DST.PORT desired destination port in network octet
           order
*/
var connectRequest = Buffer.from('050100', 'hex');
exports.CMD = {
    CONNECT: 0x1,
    BIND: 0x2,
    UDP_ASSOCIATE: 0x3
};
exports.ATYP = {
    IP_V4: 0x1,
    DOMAINNAME: 0x03,
    IP_V6: 0x4
};
exports.Replies = {
    GRANTED: 0x0,
    GENERAL_FAILURE: 0x1,
    CONNECTION_NOT_ALLOWED_BY_RULESET: 0x2,
    NETWORK_UNREACHABLE: 0x3,
    HOST_UNREACHABLE: 0x4,
    CONNECTION_REFUSED_BY_DESTINATION_HOST: 0x5,
    TTL_EXPIRED: 0x6,
    COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR: 0x7,
    ADDRESS_TYPE_NOT_SUPPORTED: 0x8
};
//		state 
var STATE_VERSION = 0;
var STATE_METHOD = 1;
var STATE_REP_STATUS = 2;
var STATE_REP_RSV = 3;
var STATE_REP_ATYP = 4;
var STATE_REP_BNDADDR = 5;
var STATE_REP_BNDADDR_VARLEN = 6;
var STATE_REP_BNDPORT = 7;
//		end stats
//		reply Buffer
var reply_NO_AUTHENTICATION_REQUIRED = Buffer.from('0500', 'hex');
var reply_GSSAPI = Buffer.from('0501', 'hex');
var reply_USERNAME_PASSWORD = Buffer.from('0502', 'hex');
var reply_to_x7F_IANA_ASSIGNED = Buffer.from('0503', 'hex');
var reply_to_xFE_RESERVED_FOR_PRIVATE_METHODS = Buffer.from('0580', 'hex');
var reply_NO_ACCEPTABLE_METHODS = Buffer.from('05ff', 'hex');
//		end reply Buffer
var Requests = /** @class */ (function () {
    function Requests(buffer) {
        this.buffer = buffer;
    }
    Object.defineProperty(Requests.prototype, "socketVersion", {
        get: function () {
            return this.buffer.readUInt8(0);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "IsSocket5", {
        get: function () {
            return this.buffer.readUInt8(0) === 0x05;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "isRequests", {
        get: function () {
            return this.buffer.length > 3;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "domainLength", {
        get: function () {
            return this.buffer.readUInt8(4);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "domainName", {
        get: function () {
            if (this.ATYP !== exports.ATYP.DOMAINNAME) {
                return null;
            }
            return this.buffer.toString('utf8', 5, 5 + this.domainLength);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "ATYP", {
        get: function () {
            return this.buffer.readInt8(3);
        },
        enumerable: false,
        configurable: true
    });
    Requests.prototype.set_V5 = function () {
        this.buffer.writeUInt8(5, 0);
    };
    Object.defineProperty(Requests.prototype, "status", {
        set: function (n) {
            this.buffer.writeUInt8(n, 1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "ATYP_IP4Address", {
        get: function () {
            if (this.ATYP !== exports.ATYP.IP_V4) {
                return null;
            }
            return "".concat(this.buffer.readUInt8(4).toString(), ".").concat(this.buffer.readUInt8(5).toString(), ".").concat(this.buffer.readUInt8(6).toString(), ".").concat(this.buffer.readUInt8(7).toString());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "port", {
        get: function () {
            if (this.ATYP === exports.ATYP.DOMAINNAME) {
                var length_1 = this.buffer.readUInt8(4);
                return this.buffer.readUInt16BE(5 + length_1);
            }
            if (this.ATYP === exports.ATYP.IP_V6) {
                return this.buffer.readUInt16BE(19);
            }
            return this.buffer.readUInt16BE(8);
        },
        set: function (port) {
            this.buffer.writeUInt16BE(port, 20);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "IPv6", {
        get: function () {
            if (this.ATYP !== exports.ATYP.IP_V6)
                return null;
            return "".concat(this.buffer.readUInt32BE(4).toString(16), ":").concat(this.buffer.readUInt32BE(8).toString(16), ":").concat(this.buffer.readUInt32BE(12).toString(16), ":").concat(this.buffer.readUInt32BE(16).toString(16));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "cmd", {
        get: function () {
            return this.buffer.readUInt8(1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "serverIP", {
        set: function (n) {
            this.buffer = Buffer.alloc(22);
            this.set_V5();
            this.buffer.writeUInt8(1, 3);
            var y = n.split('.');
            for (var i = 0, j = 4; i < 4; i++, j++) {
                var k = parseInt(y[i]);
                if (isNaN(k) || k < 0 || k > 255) {
                    console.log("serverIP ERROR! k = [".concat(k, "] ip[").concat(n, "]"));
                    break;
                }
                this.buffer.writeUInt8(k, j);
            }
            console.log("setup serverIP: buffer [".concat(this.buffer.toString('hex'), "]"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "REP", {
        set: function (n) {
            this.buffer.writeUInt8(n, 1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "hostAddress", {
        get: function () {
            return this.ATYP_IP4Address || this.IPv6;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Requests.prototype, "host", {
        get: function () {
            return this.domainName || this.IPv6 || this.ATYP_IP4Address;
        },
        enumerable: false,
        configurable: true
    });
    return Requests;
}());
exports.Requests = Requests;
var socket4Requests = /** @class */ (function () {
    function socket4Requests(buffer) {
        this.buffer = buffer;
    }
    Object.defineProperty(socket4Requests.prototype, "socketVersion", {
        get: function () {
            return this.buffer.readUInt8(0);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(socket4Requests.prototype, "IsSocket4", {
        get: function () {
            return this.buffer.readUInt8(0) === 0x04;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(socket4Requests.prototype, "cmd", {
        get: function () {
            return this.buffer.readUInt8(1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(socket4Requests.prototype, "port", {
        get: function () {
            return this.buffer.readUInt16BE(2);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(socket4Requests.prototype, "targetIp", {
        get: function () {
            var uu = "".concat(this.buffer.readUInt8(4).toString(), ".").concat(this.buffer.readUInt8(5).toString(), ".").concat(this.buffer.readUInt8(6).toString(), ".").concat(this.buffer.readUInt8(7).toString());
            if (/^0.0.0/.test(uu))
                return null;
            return uu;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(socket4Requests.prototype, "domainName", {
        get: function () {
            if (!this.targetIp) {
                return this.buffer.slice(9).toString();
            }
            return null;
        },
        enumerable: false,
        configurable: true
    });
    socket4Requests.prototype.request_4_granted = function (targetIp, targetPort) {
        if (!targetIp) {
            return Buffer.from('005a000000000000', 'hex');
        }
        var ret = Buffer.from('005a000000000000', 'hex');
        ret.writeUInt16BE(targetPort, 2);
        var u = targetIp.split('.');
        for (var i = 4, l = 0; i < 8; i++, l++) {
            ret.writeUInt8(parseInt(u[l]), i);
        }
        return ret;
    };
    Object.defineProperty(socket4Requests.prototype, "request_failed", {
        get: function () {
            return Buffer.from('005b000000', 'hex');
        },
        enumerable: false,
        configurable: true
    });
    return socket4Requests;
}());
exports.socket4Requests = socket4Requests;
