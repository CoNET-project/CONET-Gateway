"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.proxyServer = void 0;
var safe_1 = require("colors/safe");
var node_net_1 = require("node:net");
var node_crypto_1 = require("node:crypto");
var node_stream_1 = require("node:stream");
var Socks = require("./socks");
var httpProxy_1 = require("./httpProxy");
var node_http_1 = require("node:http");
var logger_1 = require("./logger");
var res = require("./res");
var openpgp = require("openpgp");
var ethers_1 = require("ethers");
var eth_crypto_1 = require("eth-crypto");
var Crypto = require("crypto");
var isSslFromBuffer = function (buffer) {
    var request = buffer.toString();
    return /^CONNECT\ /i.test(request);
};
var httpProxy = function (clientSocket, buffer, proxyServer) {
    var httpHead = new httpProxy_1.default(buffer);
    var hostName = httpHead.host;
    var connect = function (_, _data) {
        var uuuu = {
            uuid: Crypto.randomBytes(10).toString('hex'),
            host: hostName,
            buffer: buffer.toString('base64'),
            cmd: httpHead.methods,
            port: httpHead.Port,
            ssl: isSslFromBuffer(_data),
            order: 0
        };
        return proxyServer.requestGetWay(uuuu, clientSocket);
    };
    return connect(null, buffer);
};
var getRandomSaaSNode = function (saasNodes) {
    if (!saasNodes.length) {
        (0, logger_1.logger)(safe_1.default.red("getRandomSaaSNode saasNodes length [".concat(saasNodes.length, "]  Error!")));
        return null;
    }
    var ramdom = Math.floor((saasNodes.length - 1) * Math.random());
    var _ret = saasNodes[ramdom];
    return _ret;
};
var getRandomNode = function (activeNodes, saasNode) {
    var nodes = activeNodes.filter(function (n) { return n.ip_addr !== saasNode.ip_addr; });
    // return getNodeByIpaddress ('108.175.5.112', activeNodes)
    var ramdom = Math.round((nodes.length - 1) * Math.random());
    var ret = nodes[ramdom];
    (0, logger_1.logger)(safe_1.default.grey("getRandomNode nodes.length= [".concat(nodes.length, "] ramdom = [").concat(ramdom, "]")));
    (0, logger_1.logger)(safe_1.default.grey("getRandomNode ".concat(ret.ip_addr, " saasNode ").concat(saasNode === null || saasNode === void 0 ? void 0 : saasNode.ip_addr)));
    return ret;
};
var CoNET_SI_Network_Domain = 'openpgp.online';
var conet_DL_getSINodes = "https://".concat(CoNET_SI_Network_Domain, ":4001/api/conet-si-list");
var getPac = function (hostIp, port, http, sock5) {
    var FindProxyForURL = "function FindProxyForURL ( url, host )\n\t{\n\t\tif ( isInNet ( dnsResolve( host ), \"0.0.0.0\", \"255.0.0.0\") ||\n\t\tisInNet( dnsResolve( host ), \"172.16.0.0\", \"255.240.255.0\") ||\n\t\tisInNet( dnsResolve( host ), \"127.0.0.0\", \"255.255.255.0\") ||\n\t\tisInNet ( dnsResolve( host ), \"192.168.0.0\", \"255.255.0.0\" ) ||\n\t\tisInNet ( dnsResolve( host ), \"10.0.0.0\", \"255.0.0.0\" ) ||\n\t\tdnsDomainIs( host, \"conet.network\") || dnsDomainIs( host, \"openpgp.online\")\n\t\t) {\n\t\t\treturn \"DIRECT\";\n\t\t}\n\t\treturn \"".concat(http ? 'PROXY' : (sock5 ? 'SOCKS5' : 'SOCKS'), " ").concat(hostIp, ":").concat(port, "\";\n\t\n\t}");
    //return "${ http ? 'PROXY': ( sock5 ? 'SOCKS5' : 'SOCKS' ) } ${ hostIp }:${ port.toString() }; ";
    return res.Http_Pac(FindProxyForURL);
};
var makePrivateKeyObj = function (privateArmor_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([privateArmor_1], args_1, true), void 0, function (privateArmor, password) {
        var msg, privateKey;
        if (password === void 0) { password = ''; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!privateArmor) {
                        msg = "makePrivateKeyObj have no privateArmor Error!";
                        return [2 /*return*/, (0, logger_1.logger)(msg)];
                    }
                    return [4 /*yield*/, openpgp.readPrivateKey({ armoredKey: privateArmor })];
                case 1:
                    privateKey = _a.sent();
                    if (!!privateKey.isDecrypted()) return [3 /*break*/, 3];
                    return [4 /*yield*/, openpgp.decryptKey({
                            privateKey: privateKey,
                            passphrase: password
                        })];
                case 2:
                    privateKey = _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, privateKey];
            }
        });
    });
};
var getNodeByIpaddress = function (ipaddress, activeNodes) {
    var index = activeNodes.findIndex(function (n) { return n.ip_addr === ipaddress; });
    if (index > -1) {
        return activeNodes[index];
    }
    (0, logger_1.logger)(safe_1.default.red("proxyServer getNodeByIpaddress [".concat(ipaddress, "] hasn't include at activeNodes list!")));
};
var encrypt_Message = function (encryptionKeys, message) { return __awaiter(void 0, void 0, void 0, function () {
    var encryptObj;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = {};
                return [4 /*yield*/, openpgp.createMessage({ text: Buffer.from(JSON.stringify(message)).toString('base64') })];
            case 1:
                encryptObj = (_a.message = _b.sent(),
                    _a.encryptionKeys = encryptionKeys,
                    _a.config = { preferredCompressionAlgorithm: openpgp.enums.compression.zlib },
                    _a);
                return [4 /*yield*/, openpgp.encrypt(encryptObj)];
            case 2: return [2 /*return*/, _b.sent()];
        }
    });
}); };
var createSock5ConnectCmd = function (currentProfile, SaaSnode, requestData) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, key, command, message, messageHash, signMessage, encryptedCommand;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!currentProfile.pgpKey || !SaaSnode.armoredPublicKey) {
                    (0, logger_1.logger)(safe_1.default.red("currentProfile?.pgpKey[".concat(currentProfile === null || currentProfile === void 0 ? void 0 : currentProfile.pgpKey, "]|| !SaaSnode?.armoredPublicKey[").concat(SaaSnode === null || SaaSnode === void 0 ? void 0 : SaaSnode.armoredPublicKey, "] Error")));
                    return [2 /*return*/, null];
                }
                if (!!(SaaSnode === null || SaaSnode === void 0 ? void 0 : SaaSnode.publicKeyObj)) return [3 /*break*/, 2];
                _a = SaaSnode;
                return [4 /*yield*/, openpgp.readKey({ armoredKey: SaaSnode.armoredPublicKey })];
            case 1:
                _a.publicKeyObj = _b.sent();
                _b.label = 2;
            case 2:
                key = Buffer.from((0, node_crypto_1.getRandomValues)(new Uint8Array(16))).toString('base64');
                command = {
                    command: 'SaaS_Sock5',
                    algorithm: 'aes-256-cbc',
                    Securitykey: key,
                    requestData: requestData,
                    walletAddress: currentProfile.keyID.toLowerCase()
                };
                (0, logger_1.logger)(safe_1.default.blue("createSock5ConnectCmd"));
                message = JSON.stringify(command);
                messageHash = ethers_1.ethers.id(message);
                signMessage = eth_crypto_1.default.sign(currentProfile.privateKeyArmor, messageHash);
                return [4 /*yield*/, encrypt_Message(SaaSnode.publicKeyObj, { message: message, signMessage: signMessage })];
            case 3:
                encryptedCommand = _b.sent();
                command.requestData = [encryptedCommand, '', key];
                return [2 /*return*/, (command)];
        }
    });
}); };
var otherRequestForNet = function (data, host, port, UserAgent) {
    return "POST /post HTTP/1.1\r\n" +
        "Host: ".concat(host).concat(port !== 80 ? ':' + port : '', "\r\n") +
        "User-Agent: ".concat(UserAgent ? UserAgent : 'Mozilla/5.0', "\r\n") +
        "Content-Type: application/json;charset=UTF-8\r\n" +
        "Connection: keep-alive\r\n" +
        "Content-Length: ".concat(data.length, "\r\n\r\n") +
        data + '\r\n\r\n';
};
var transferCount = /** @class */ (function (_super) {
    __extends(transferCount, _super);
    function transferCount(upload, info) {
        var _this = _super.call(this) || this;
        _this.upload = upload;
        _this.info = info;
        _this.data = '';
        return _this;
    }
    transferCount.prototype._transform = function (chunk, encoding, callback) {
        if (this.upload) {
            this.info.upload += chunk.length;
        }
        else {
            this.data += chunk.toString();
            this.info.download += chunk.length;
        }
        callback(null, chunk);
    };
    return transferCount;
}(node_stream_1.Transform));
var sendTransferDataToLocalHost = function (infoData) {
    return new Promise(function (resolve) {
        var option = {
            host: 'localhost',
            method: 'POST',
            port: '3001',
            path: '/proxyusage',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Connection': 'close',
            }
        };
        var req = (0, node_http_1.request)(option, function (res) {
            if (res.statusCode !== 200) {
                return (0, logger_1.logger)(safe_1.default.red("sendTransferDataToLocalHost res.statusCode [".concat(res.statusCode, "] !== 200 ERROR")));
            }
            (0, logger_1.logger)(safe_1.default.blue("sendTransferDataToLocalHost SUCCESS"));
            res.destroy();
            resolve(null);
        });
        req.on('error', function (err) {
            (0, logger_1.logger)(safe_1.default.red("sendTransferDataToLocalHost on Error!"), err);
        });
        req.end(JSON.stringify({ data: infoData }));
    });
};
var ConnectToProxyNode = function (cmd, SaaSnode, entryNode, socket, uuuu, server) {
    if (!entryNode) {
        return (0, logger_1.logger)(safe_1.default.red("ConnectToProxyNode Error! getRandomNode return null nodes!"));
    }
    var hostInfo = "".concat(uuuu.host, ":").concat(uuuu.port);
    var connectID = safe_1.default.gray('Connect to [') + safe_1.default.green("".concat(hostInfo)) + safe_1.default.gray(']');
    var data = otherRequestForNet(JSON.stringify({ data: cmd.requestData[0] }), entryNode.ip_addr, 80, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
    var infoData = {
        hostInfo: hostInfo,
        ssl: uuuu.ssl,
        startTime: new Date().getTime(),
        download: 0,
        upload: 0,
        nodeIpaddress: SaaSnode.ip_addr,
        endTime: 0
    };
    var upload = new transferCount(true, infoData);
    var download = new transferCount(false, infoData);
    var remoteSocket = node_net_1.default.createConnection(80, entryNode.ip_addr, function () {
        //	remoteSocket.setNoDelay(true)
        (0, logger_1.logger)(safe_1.default.blue("ConnectToProxyNode connect to ".concat(connectID)));
        remoteSocket.pipe(download).pipe(socket).pipe(upload).pipe(remoteSocket);
    });
    remoteSocket.on('error', function (err) {
        (0, logger_1.logger)(safe_1.default.red("ConnectToProxyNode remote [".concat(entryNode.ip_addr, ":").concat(80, "] on Error ").concat(err.message, " ")));
    });
    remoteSocket.once('close', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            (0, logger_1.logger)(safe_1.default.magenta("ConnectToProxyNode remote [".concat(entryNode.ip_addr, ":").concat(80, "] on Close ")));
            return [2 /*return*/];
        });
    }); });
    socket.once('close', function () {
        var res = download.data;
        if (/^HTTP\/1\.1\ 402\ Payment/i.test(res)) {
            (0, logger_1.logger)(safe_1.default.red("Proxy Payment"));
            // server.SaaS_payment = false
        }
        remoteSocket.end().destroy();
        infoData.endTime = new Date().getTime();
    });
    socket.once('error', function (err) {
        (0, logger_1.logger)(safe_1.default.magenta("Proxy client on Error [".concat(err.message, "]! STOP connecting")));
        remoteSocket.end().destroy();
    });
    remoteSocket.write(data);
};
var proxyServer = /** @class */ (function () {
    function proxyServer(proxyPort, //			Proxy server listening port number
    _entryNodes, //			gateway nodes information
    _egressNodes, currentProfile, debug, logStream) {
        if (debug === void 0) { debug = false; }
        var _this = this;
        this.proxyPort = proxyPort;
        this._entryNodes = _entryNodes;
        this._egressNodes = _egressNodes;
        this.currentProfile = currentProfile;
        this.debug = debug;
        this.logStream = logStream;
        this.SaaS_payment = true;
        this.server = null;
        //public gateway = new gateWay ( this.multipleGateway, this.debug )
        this.whiteIpList = [];
        this.domainBlackList = [];
        this.domainListPool = new Map();
        this.checkAgainTimeOut = 1000 * 60 * 5;
        this.connectHostTimeOut = 1000 * 5;
        this.useGatWay = true;
        this.clientSockets = new Set();
        this.startLocalProxy = function () { return __awaiter(_this, void 0, void 0, function () {
            var socks, _a;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.server = node_net_1.default.createServer(function (socket) {
                            var ip = socket.remoteAddress;
                            _this.clientSockets.add(socket);
                            var isWhiteIp = _this.whiteIpList.find(function (n) { return n === ip; }) ? true : false;
                            var agent = 'Mozilla/5.0';
                            //	windows 7 GET PAC User-Agent: Mozilla/5.0 (compatible; IE 11.0; Win32; Trident/7.0)
                            //		proxy auto setup support
                            socket.once('data', function (data) {
                                var dataStr = data.toString();
                                if (/^GET \/pac/i.test(dataStr)) {
                                    var httpHead = new httpProxy_1.default(data);
                                    agent = httpHead.headers['user-agent'];
                                    var sock5 = /Firefox|Windows NT|WinHttp-Autoproxy-Service|Darwin/i.test(agent) && !/CFNetwork|WOW64/i.test(agent);
                                    var ret = getPac(httpHead.host, _this.proxyPort, /pacHttp/.test(dataStr), sock5);
                                    var logStream = safe_1.default.blue("Local proxy server got GET /pac from :[".concat(socket.remoteAddress, "] sock5 [").concat(sock5, "] agent [").concat(agent, "] httpHead.headers [").concat(Object.keys(httpHead.headers), "] dataStr = [").concat(dataStr, "]"));
                                    (0, logger_1.loggerToStream)(_this.logStream, logStream);
                                    (0, logger_1.logger)(logStream);
                                    return socket.end(ret);
                                }
                                switch (data.readUInt8(0)) {
                                    case 0x4: {
                                        return socks = new Socks.sockt4(socket, data, agent, _this);
                                    }
                                    case 0x5: {
                                        return socks = new Socks.socks5(socket, data, agent, _this);
                                    }
                                    default: {
                                        var logStream = safe_1.default.magenta("unsupport proxy protocol!");
                                        (0, logger_1.loggerToStream)(_this.logStream, logStream);
                                        (0, logger_1.logger)(logStream);
                                        return socket.end();
                                    }
                                }
                            });
                            socket.on('error', function (err) {
                                socks = null;
                            });
                            socket.once('end', function () {
                                _this.clientSockets.delete(socket);
                                socks = null;
                            });
                        });
                        this.server.on('error', function (err) {
                            (0, logger_1.logger)(safe_1.default.red("proxy server ERROR: ".concat(err.message)));
                        });
                        this.server.maxConnections = 65536;
                        this.server.listen(this.proxyPort, function () {
                            var _a, _b;
                            return (0, logger_1.logger)(safe_1.default.blue("Proxy SERVER success on port : [".concat(_this.proxyPort, "] entry nodes length =[").concat((_a = _this._egressNodes) === null || _a === void 0 ? void 0 : _a.length, "] SaaS nodes = [").concat((_b = _this._egressNodes) === null || _b === void 0 ? void 0 : _b.length, "]")));
                        });
                        if (!((_b = this.currentProfile) === null || _b === void 0 ? void 0 : _b.keyObj)) {
                            this.currentProfile.keyObj = {
                                privateKeyObj: null,
                                publicKeyObj: null
                            };
                        }
                        if (!((_c = this.currentProfile.pgpKey) === null || _c === void 0 ? void 0 : _c.privateKeyArmor)) return [3 /*break*/, 2];
                        _a = this.currentProfile.keyObj;
                        return [4 /*yield*/, makePrivateKeyObj(this.currentProfile.pgpKey.privateKeyArmor)];
                    case 1:
                        _a.privateKeyObj = _d.sent();
                        _d.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); };
        this.requestGetWay = function (uuuu, socket) { return __awaiter(_this, void 0, void 0, function () {
            var upChannel_SaaS_node, cmd, entryNode, streamString;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        upChannel_SaaS_node = getRandomSaaSNode(this._egressNodes);
                        if (!upChannel_SaaS_node) {
                            return [2 /*return*/, (0, logger_1.logger)(safe_1.default.red("proxyServer makeUpChannel upChannel_SaaS_node Null Error!"))];
                        }
                        return [4 /*yield*/, createSock5ConnectCmd(this.currentProfile, upChannel_SaaS_node, [uuuu])];
                    case 1:
                        cmd = _a.sent();
                        if (!cmd) {
                            return [2 /*return*/, (0, logger_1.logger)(safe_1.default.red("requestGetWay createSock5Connect return Null Error!"))];
                        }
                        entryNode = getRandomNode(this._entryNodes, upChannel_SaaS_node);
                        streamString = safe_1.default.blue("Create gateway request, Layer minus random SaaS node [".concat(safe_1.default.magenta(upChannel_SaaS_node.ip_addr), "] entry node [").concat(safe_1.default.magenta(entryNode.ip_addr), "]\n"));
                        (0, logger_1.loggerToStream)(this.logStream, streamString);
                        (0, logger_1.logger)(streamString);
                        ConnectToProxyNode(cmd, upChannel_SaaS_node, entryNode, socket, uuuu, this);
                        return [2 /*return*/];
                }
            });
        }); };
        this.restart = function (currentProfile, entryNodes, egressNodes) {
            _this.currentProfile = currentProfile;
            _this._entryNodes = entryNodes;
            _this._egressNodes = egressNodes;
        };
        (0, logger_1.logger)(safe_1.default.magenta("".concat(proxyPort, " Entry Nodes\n").concat(_entryNodes.map(function (n) { return n.ip_addr; }))));
        (0, logger_1.logger)(safe_1.default.magenta("".concat(proxyPort, " Egress Nodes\n").concat(_egressNodes.map(function (n) { return n.ip_addr; }))));
        this.startLocalProxy();
    }
    return proxyServer;
}());
exports.proxyServer = proxyServer;
var profile = {
    "isPrimary": false,
    "keyID": "0x28b2ae27e135e89d9bcb40595f859b411bf4846c",
    "privateKeyArmor": "0xd1806500c9ef182f981069c2ebcdb21f30f75c2e2620aedf5fc5a88a1271991c",
    "hdPath": "m/44'/60'/0'/0/0/1",
    "index": 1,
    "isNode": true,
    "nodeID": "234",
    "nodeIP_address": "",
    "nodeRegion": "",
    "pgpKey": {
        "privateKeyArmor": "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nxVgEZndrMBYJKwYBBAHaRw8BAQdAIzhghYSoVOl8yaim5tay6GwqW4+h77NT\nkJgLrb2Z72cAAQDdVdo2fyw2GtFBF2Qpd3T6BAv/YLMpb2Y5aSDfdjZrug1q\nzQDCjAQQFgoAPgWCZndrMAQLCQcICZC4mOKIpJkMwAMVCAoEFgACAQIZAQKb\nAwIeARYhBEbhCEnJjFv6tkW3LbiY4oikmQzAAAAKegD/bxWzqs+3Nvt52e/S\naTXLLRICcHRKI1+pM5ub/9gkw+UA/1Exk3IczFFJzfkgg2Yf4GW5MV9rWfuV\n5wN/AHUj5CsPx10EZndrMBIKKwYBBAGXVQEFAQEHQLPI3FS/F+Uh2ys/dEOi\nlphsmA2Ns1b+EhYRAAkpmN1uAwEIBwAA/0eYFVkHK6jEor/7IN7PVvVFB4M/\nizd42jdvnSJgoRZ4D3TCeAQYFgoAKgWCZndrMAmQuJjiiKSZDMACmwwWIQRG\n4QhJyYxb+rZFty24mOKIpJkMwAAA/TcA/RHAFxB/1DLrdThvO4XlxdrV1upY\nfBfghfDV42WXoszeAQCaX/1ZKIqPurrWZ8mYmvVj1n+kpoL7K1zy/cZ/a+6X\nCQ==\n=buDA\n-----END PGP PRIVATE KEY BLOCK-----\n",
        "publicKeyArmor": "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nxjMEZndrMBYJKwYBBAHaRw8BAQdAIzhghYSoVOl8yaim5tay6GwqW4+h77NT\nkJgLrb2Z72fNAMKMBBAWCgA+BYJmd2swBAsJBwgJkLiY4oikmQzAAxUICgQW\nAAIBAhkBApsDAh4BFiEERuEIScmMW/q2RbctuJjiiKSZDMAAAAp6AP9vFbOq\nz7c2+3nZ79JpNcstEgJwdEojX6kzm5v/2CTD5QD/UTGTchzMUUnN+SCDZh/g\nZbkxX2tZ+5XnA38AdSPkKw/OOARmd2swEgorBgEEAZdVAQUBAQdAs8jcVL8X\n5SHbKz90Q6KWmGyYDY2zVv4SFhEACSmY3W4DAQgHwngEGBYKACoFgmZ3azAJ\nkLiY4oikmQzAApsMFiEERuEIScmMW/q2RbctuJjiiKSZDMAAAP03AP0RwBcQ\nf9Qy63U4bzuF5cXa1dbqWHwX4IXw1eNll6LM3gEAml/9WSiKj7q61mfJmJr1\nY9Z/pKaC+ytc8v3Gf2vulwk=\n=irVj\n-----END PGP PUBLIC KEY BLOCK-----\n"
    },
    "tokens": {
        "CGPNs": {
            "balance": "0",
            "history": [],
            "network": "CONET Guardian Nodes (CGPNs)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPNs"
        },
        "CGPN2s": {
            "balance": "0",
            "history": [],
            "network": "CONET Guardian Nodes (CGPN2s)",
            "decimal": 1,
            "contract": "0x453701b80324c44366b34d167d40bce2d67d6047",
            "name": "CGPN2s"
        },
        "cCNTP": {
            "balance": "340112.74966555",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x530cf1b598d716ec79aa916dd2f05ae8a0ce8ee2",
            "name": "cCNTP"
        },
        "cBNBUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xae752b49385812af323240b26a49070bb839b10d",
            "name": "cBNBUSDT"
        },
        "cUSDB": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x3258e9631ca4992f6674b114bd17c83ca30f734b",
            "name": "cUSDB"
        },
        "CNTP": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "0x0f43685B2cB08b9FB8Ca1D981fF078C22Fec84c5",
            "name": "CNTP"
        },
        "cUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xfe75074c273b5e33fe268b1d5ac700d5b715da2f",
            "name": "cUSDT"
        },
        "dWETH": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x84b6d6A6675F830c8385f022Aefc9e3846A89D3B",
            "name": "dWETH"
        },
        "dUSDT": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x0eD55798a8b9647f7908c72a0Ce844ad47274422",
            "name": "dUSDT"
        },
        "dWBNB": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0xd8b094E91c552c623bc054085871F6c1CA3E5cAd",
            "name": "dWBNB"
        },
        "conet": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "",
            "name": "conet"
        },
        "CNTPV1": {
            "balance": "0",
            "history": [],
            "network": "CONET Holesky",
            "decimal": 18,
            "contract": "0x1a73e00ce25e5d56db1b5dd7b2dcdf8ec9f208d2",
            "name": "CNTPV1"
        },
        "usdt": {
            "balance": "0",
            "history": [],
            "network": "ETH",
            "decimal": 6,
            "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "name": "usdt"
        },
        "usdb": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "name": "usdb"
        },
        "eth": {
            "balance": "0",
            "history": [],
            "network": "ETH",
            "decimal": 18,
            "contract": "",
            "name": "eth"
        },
        "blastETH": {
            "balance": "0",
            "history": [],
            "network": "Blast Mainnet",
            "decimal": 18,
            "contract": "",
            "name": "blastETH"
        },
        "wbnb": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            "name": "wbnb"
        },
        "bnb": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "",
            "name": "bnb"
        },
        "wusdt": {
            "balance": "0",
            "history": [],
            "network": "BSC",
            "decimal": 18,
            "contract": "0x55d398326f99059fF775485246999027B3197955",
            "name": "wusdt"
        }
    },
    "data": null,
    referrer: '',
};
