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
exports.sockt4 = exports.socks5 = void 0;
var Rfc1928 = require("./rfc1928");
var Crypto = require("crypto");
var Util = require("util");
var logger_1 = require("./logger");
var safe_1 = require("colors/safe");
//	socks 5 headers
var server_res = {
    NO_AUTHENTICATION_REQUIRED: Buffer.from('0500', 'hex')
};
var isSslFromBuffer = function (buffer) {
    var ret = buffer[0] === 0x16 && buffer[1] === 0x03;
    return ret;
};
var getHostNameFromSslConnection = function (buffer) {
    if (!isSslFromBuffer(buffer)) {
        return null;
    }
    var lengthPoint = buffer.readInt16BE(0x95);
    var serverName = buffer.slice(0x97, 0x97 + lengthPoint);
    //	00000090  00 02 01 00 00 0A 00 08 00 06 00 1D 00 17 00 18  ................
    //	use IP address
    if (lengthPoint === 0x0A00 && serverName[0] === 0x8 && serverName[1] === 0x0) {
        return null;
    }
    (0, logger_1.hexDebug)(serverName);
    (0, logger_1.logger)("getHostNameFromSslConnection lengthPoint[".concat(lengthPoint.toString(16), "] === 0x0A ").concat(lengthPoint === 0x0A00, " serverName[0] [").concat(serverName[0].toString(16), "] serverName[0] === 0x8 ").concat(serverName[0] === 0x8, " && serverName[1] [").concat(serverName[1].toString(16), "]  === 0x06 [").concat(serverName[1] === 0x0, "] "));
    return serverName.toString();
};
var socks5 = /** @class */ (function () {
    function socks5(socket, data, agent, proxyServer) {
        var _this = this;
        this.socket = socket;
        this.data = data;
        this.agent = agent;
        this.proxyServer = proxyServer;
        this.keep = false;
        this.uuid = Crypto.randomBytes(10).toString('hex');
        (0, logger_1.logger)(safe_1.default.yellow("new socks v5"));
        this.socket.once('data', function (chunk) {
            return _this.connectStat2(chunk);
        });
        this.socket.write(server_res.NO_AUTHENTICATION_REQUIRED);
    }
    socks5.prototype.stopConnection = function (req) {
        req.REP = Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR;
        this.socket.write(req.buffer);
        this.socket.end();
    };
    socks5.prototype.stopIP_V6Connection = function (req) {
        (0, logger_1.logger)(safe_1.default.red("stopIP_V6Connection!!"));
        req.REP = Rfc1928.Replies.ADDRESS_TYPE_NOT_SUPPORTED;
        this.socket.write(req.buffer);
        this.socket.end();
    };
    socks5.prototype.closeSocks5 = function (buffer) {
        //console.log (`close proxy socket!`)
        if (this.socket) {
            if (this.socket.writable) {
                this.socket.end(buffer);
            }
            if (typeof this.socket.removeAllListeners === 'function')
                this.socket.removeAllListeners();
        }
    };
    socks5.prototype.connectStat3 = function (req) {
        var _this = this;
        if (!this.proxyServer.SaaS_payment) {
            req.REP = Rfc1928.Replies.NETWORK_UNREACHABLE;
            return this.socket.write(req.buffer);
        }
        var userAgent = '';
        switch (req.cmd) {
            case Rfc1928.CMD.CONNECT: {
                if (req.ATYP === Rfc1928.ATYP.IP_V6) {
                    return this.stopIP_V6Connection(req);
                }
                break;
            }
            case Rfc1928.CMD.BIND: {
                (0, logger_1.logger)(safe_1.default.red("Rfc1928.CMD.BIND"));
                return this.stopConnection(req);
            }
            case Rfc1928.CMD.UDP_ASSOCIATE: {
                (0, logger_1.logger)(safe_1.default.red("Rfc1928.CMD.UDP_ASSOCIATE"));
                return this.stopConnection(req);
            }
            default: {
                (0, logger_1.logger)(safe_1.default.red("Rfc1928.CMD unknow command! "));
                return this.stopConnection(req);
            }
        }
        //		PAYMENT REQUIRE
        this.socket.once('data', function (_data) {
            var uuuu = {
                uuid: _this.uuid,
                host: req.host,
                buffer: _data.toString('base64'),
                cmd: _this._cmd,
                port: req.port,
                ssl: isSslFromBuffer(_data),
                order: 0
            };
            return _this.proxyServer.requestGetWay(uuuu, _this.socket);
        });
        req.REP = Rfc1928.Replies.GRANTED;
        return this.socket.write(req.buffer);
    };
    socks5.prototype.udpProcess = function (data) {
        data.REP = Rfc1928.Replies.GRANTED;
        return this.socket.write(data.buffer);
    };
    socks5.prototype.connectStat2 = function (data) {
        if (this.debug) {
            (0, logger_1.hexDebug)(data);
        }
        var req = new Rfc1928.Requests(data);
        this.ATYP = req.ATYP;
        this.host = req.domainName;
        this.port = req.port;
        this.cmd = req.cmd;
        this.targetIpV4 = req.ATYP_IP4Address;
        this.keep = false;
        //.serverIP = this.socket.localAddress.split (':')[3]
        //		IPv6 not support!
        switch (this.cmd) {
            case Rfc1928.CMD.CONNECT: {
                this.keep = true;
                this._cmd = 'CONNECT';
                break;
            }
            case Rfc1928.CMD.BIND: {
                this._cmd = 'BIND';
                (0, logger_1.logger)(safe_1.default.red("Sock5 Rfc1928.CMD.BIND request!"));
                break;
            }
            case Rfc1928.CMD.UDP_ASSOCIATE: {
                this._cmd = 'UDP_ASSOCIATE';
                (0, logger_1.logger)("Rfc1928.CMD.UDP_ASSOCIATE data[".concat(data.toString('hex'), "]"));
                break;
            }
            default: {
                this._cmd = 'UNKNOW';
                (0, logger_1.logger)("Socks 5 unknow cmd: ", data.toString('hex'), Util.inspect(req, false, 3, true));
                break;
            }
        }
        //			IPv6 not support 
        // if ( req.IPv6 ) {
        // 	this.keep = false
        // }
        var obj = { ATYP: this.ATYP, host: this.host, hostType: typeof this.host, port: this.port, targetIpV4: this.targetIpV4, cmd: this._cmd, buffer: data.toString('hex') };
        if (!this.keep) {
            req.REP = Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR;
            if (this.debug) {
                (0, logger_1.logger)(safe_1.default.red("Rfc1928.Replies.COMMAND_NOT_SUPPORTED_or_PROTOCOL_ERROR STOP socks 5 connecting."));
                (0, logger_1.logger)(Util.inspect(obj));
            }
            return this.closeSocks5(req.buffer);
        }
        return this.connectStat3(req);
    };
    return socks5;
}());
exports.socks5 = socks5;
var sockt4 = /** @class */ (function () {
    function sockt4(socket, buffer, agent, proxyServer) {
        this.socket = socket;
        this.buffer = buffer;
        this.agent = agent;
        this.proxyServer = proxyServer;
        this.uuid = Crypto.randomBytes(10).toString('hex');
        this._cmd = '';
        this.keep = false;
        this.debug = false;
        this.debug = proxyServer.debug;
        this.socket.pause();
        this.req = new Rfc1928.socket4Requests(this.buffer);
        this.host = this.req.domainName;
        this.port = this.req.port;
        this.cmd = this.req.cmd;
        this.targetIpV4 = this.req.targetIp;
        this.id = safe_1.default.blue("[".concat(this.uuid, "] [").concat(this.socket.remoteAddress, ":").concat(this.socket.remotePort, "] --> [").concat(this.host, ":").concat(this.port, "]"));
        if (this.debug) {
            (0, logger_1.logger)(safe_1.default.yellow("new socks v4"));
            (0, logger_1.hexDebug)(buffer);
        }
        switch (this.cmd) {
            case Rfc1928.CMD.CONNECT: {
                this.keep = true;
                this._cmd = 'CONNECT';
                if (this.debug) {
                    (0, logger_1.logger)(safe_1.default.gray("".concat(this.id, " sockt4 got Rfc1928 command ").concat(safe_1.default.magenta('CONNECT'))));
                }
                break;
            }
            case Rfc1928.CMD.BIND: {
                this._cmd = 'BIND';
                if (this.debug) {
                    (0, logger_1.logger)(safe_1.default.gray("".concat(this.id, " sockt4 got Rfc1928 command ").concat(safe_1.default.magenta('BIND'))));
                }
                break;
            }
            case Rfc1928.CMD.UDP_ASSOCIATE: {
                if (this.debug) {
                    (0, logger_1.logger)(safe_1.default.gray("".concat(this.id, " sockt4 got Rfc1928 command ").concat(safe_1.default.magenta('UDP_ASSOCIATE'))));
                }
                this._cmd = 'UDP_ASSOCIATE';
                break;
            }
            default: {
                (0, logger_1.logger)(safe_1.default.red("".concat(this.id, " sockt4 got Rfc1928 unknow command [").concat(this.cmd, "]")));
                this._cmd = 'UNKNOW';
                break;
            }
        }
        if (!this.keep) {
            this.debug ? (0, logger_1.logger)(safe_1.default.red("STOP session")) : null;
            this.socket.end(this.req.request_failed);
            return;
        }
        this.connectStat2();
    }
    sockt4.prototype.connectStat2 = function () {
        var _this = this;
        this.socket.once('data', function (_data) {
            if (_this.debug) {
                (0, logger_1.logger)("SOCK4 connectStat2 [".concat(_this.host || _this.targetIpV4, "] get data"));
                (0, logger_1.hexDebug)(_data);
            }
            _this.connect(_data);
        });
        var buffer = this.req.request_4_granted('0.0.0.255', this.port);
        this.socket.write(buffer);
        return this.socket.resume();
    };
    sockt4.prototype.connect = function (buffer) {
        var uuuu = {
            uuid: this.uuid,
            host: this.req.domainName || this.req.targetIp,
            buffer: buffer.toString('base64'),
            cmd: this._cmd,
            port: this.req.port,
            ssl: isSslFromBuffer(buffer),
            order: 0
        };
        return this.proxyServer.requestGetWay(uuuu, this.socket);
        //return this.socket.end ( this.req.request_failed )
    };
    return sockt4;
}());
exports.sockt4 = sockt4;
/*
export class UdpDgram {
    private server: Dgram.Socket = null
    public port = 0

    private createDgram () {
        this.server = Dgram.createSocket ( 'udp4' )
        
        this.server.once ( 'error', err => {
            console.log ( 'server.once error close server!', err  )
            this.server.close ()
        })

        this.server.on ( 'message', ( msg: Buffer, rinfo ) => {
            console.log(`UdpDgram server msg: ${ msg.toString('hex') } from ${ rinfo.address }:${ rinfo.port }`)
        })

        this.server.once ( 'listening', () => {
            const address = this.server.address()
            this.port = address.port
            console.log ( `server listening ${ address.address }:${ address.port }` )
        })

        this.server.bind ({ port: 0 } , ( err, kkk ) => {
            if ( err ) {
                return console.log ( `server.bind ERROR`, err )
            }
            console.log ( kkk )
        })
    }
    constructor () {
        this.createDgram ()
    }
}
*/ 
