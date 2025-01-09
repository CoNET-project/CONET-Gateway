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
exports._HTTP_PROXY_302 = exports._HTTP_PROXY_200 = exports.HTTP_403 = exports.body_403 = exports._HTTP_200 = exports.Http_Pac = exports._HTTP_598 = exports._HTTP_598_body = exports._HTTP_599 = exports._HTTP_599_body = exports._HTTP_404 = exports._HTTP_502 = void 0;
var Os = require("os");
exports._HTTP_502 = "HTTP/1.1 502 Bad Gateway\nContent-Length: 0\nConnection: close\nProxy-Connection: close\nContent-Type: text/html; charset=UTF-8\nCache-Control: private, max-age=0\n\n";
exports._HTTP_404 = "HTTP/1.1 404 Not Found\nContent-Length: 0\nConnection: close\nProxy-Connection: close\nContent-Type: text/html; charset=UTF-8\nCache-Control: private, max-age=0\n\n";
exports._HTTP_599_body = 'Have not internet.\r\n無互聯網，請檢查您的網絡連結\r\nネットワークはオフラインです\r\n';
exports._HTTP_599 = "HTTP/1.1 599 Have not internet\nContent-Length: 100\nConnection: close\nProxy-Connection: close\nContent-Type: text/html; charset=UTF-8\nCache-Control: private, max-age=0\n\n".concat(exports._HTTP_599_body, "\n");
exports._HTTP_598_body = "Domain name can't find.\r\n\u7121\u6B64\u57DF\u540D\r\n\u3053\u306E\u30C9\u30E1\u30A4\u30F3\u540D\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u3067\u3059\r\n";
exports._HTTP_598 = "HTTP/1.1 598 Domain name can't find\nContent-Length: 100\nConnection: close\nProxy-Connection: close\nContent-Type: text/html; charset=UTF-8\nCache-Control: private, max-age=0\n\n".concat(exports._HTTP_598_body, "\n");
var Http_Pac = function (body) {
    return "HTTP/1.1 200 OK\nContent-Type: application/x-ns-proxy-autoconfig\nConnection: keep-alive\nContent-Length: ".concat(body.length, "\n\n").concat(body, "\r\n\r\n");
};
exports.Http_Pac = Http_Pac;
var _HTTP_200 = function (body) {
    return "HTTP/1.1 200 OK\nContent-Type: text/html; charset=UTF-8\nConnection: keep-alive\nContent-Length: ".concat(body.length, "\n\n").concat(body, "\r\n\r\n");
};
exports._HTTP_200 = _HTTP_200;
exports.body_403 = '<!DOCTYPE html><html><p>This domain in proxy blacklist.</p><p>這個域名被代理服務器列入黑名單</p><p>このサイドはプロクシーの禁止リストにあります</p></html>';
exports.HTTP_403 = "HTTP/1.1 403 Forbidden\nContent-Type: text/html; charset=UTF-8\nConnection: close\nProxy-Connection: close\nContent-Length: 300\n\n".concat(exports.body_403, "\n\n");
exports._HTTP_PROXY_200 = 'HTTP/1.1 200 Connection Established\r\n\r\n';
var getLocalServerIPAddress = function () {
    var nets = Os.networkInterfaces();
    var results = [];
    for (var _i = 0, _a = Object.keys(nets); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        var next = nets[name_1];
        if (next == undefined) {
            continue;
        }
        for (var _b = 0, next_1 = next; _b < next_1.length; _b++) {
            var net = next_1[_b];
            if (net.family == 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
};
var _HTTP_PROXY_302 = function () {
    var lostManagerServerIP = getLocalServerIPAddress()[0];
    return "HTTP/1.1 302 Found\n" +
        "Location: http://".concat(lostManagerServerIP, "/proxyErr\n\n");
};
exports._HTTP_PROXY_302 = _HTTP_PROXY_302;


function FindProxyForURL ( url, host ) {
	if (isInNet ( dnsResolve( host ), "0.0.0.0", "255.0.0.0") ||
	   isInNet( dnsResolve( host ), "172.16.0.0", "255.240.255.0") ||
	   isInNet( dnsResolve( host ), "127.0.0.0", "255.255.255.0") ||
	   isInNet ( dnsResolve( host ), "192.168.0.0", "255.255.0.0" ) ||
	   isInNet ( dnsResolve( host ), "10.0.0.0", "255.0.0.0" ) ||
	   isInNet( dnsResolve( host ), "216.225.195.198", "255.255.255.255" ) ||
	   isInNet( dnsResolve( host ), "217.160.150.50", "255.255.255.255" ) ||
	   isInNet( dnsResolve( host ), "74.208.224.40", "255.255.255.255" ) ||
	   isInNet( dnsResolve( host ), "216.225.205.235", "255.255.255.255" ) ||
	   isInNet( dnsResolve( host ), "216.225.203.45", "255.255.255.255" ) ||
	   dnsDomainIs( host, "conet.network") ||
	   dnsDomainIs( host, ".local") ||
	   dnsDomainIs( host, "openpgp.online")) {
		   return "DIRECT";
	};
	return "socks 127.0.0.1:8888";
}
