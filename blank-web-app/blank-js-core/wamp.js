// Wamp-one wamp-client.js 1.0.1
// (c) 2015 Samorukov Valentin, Kuvshinov Evgeniy
// Wamp-one may be freely distributed under the MIT license.
"use strict";

(function () {
    // Thanks to Underscore.js for export code
    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    var msgTypes = {
        "WELCOME": 0,
        "PREFIX": 1,
        "CALL": 2,
        "CALLRESULT": 3,
        "CALLERROR": 4,
        "SUBSCRIBE": 5,
        "UNSUBSCRIBE": 6,
        "PUBLISH": 7,
        "EVENT": 8,
        "SUBSCRIBED": 9,
        "SUBSCRIBEERROR": 10,
        "HB": 20,
    };
    var wsStates = {
        "CONNECTING": 0,
        "OPEN": 1,
        "CLOSING": 2,
        "CLOSED": 3,
    };
    var helpers = {
        newGuid: function () {
            var s4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };
            return (s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4());
        },
        getRandom: function (min, max) {
            return Math.random() * (max - min) + min;
        },
    };

    var WampClient = function (heartBeat, stringMsgTypes) {
        if (!(this instanceof WampClient)) {
            return new WampClient(heartBeat);
        }
        this._wsClient = null;
        this._heartBeat = heartBeat;
        this._stringMsgTypes = stringMsgTypes;
        this._callSequence = 0;
        //Outbound subscriptions (from THIS to SERVER)
        this._eventHandlers = {};
        this._subscribedHandlers = {};
        this._subscribeErrorHandlers = {};
        //Inbound subscriptions (from SERVER to THIS)
        this._subUris = {};
        //Outbound RPC
        this._callResponseHandlers = {};
        //Inbound RPC
        this._callRequestHandlers = {};
        //HB
        this._heartBeatHandlers = {};
        this._heartBeatInterval = 5 * 1000;
        //WS handlers
        this._wsOpenedHandler = this._wsOpenedHandler.bind(this);
        this._wsClosedHandler = this._wsClosedHandler.bind(this);
        this._wsErrorHandler = this._wsErrorHandler.bind(this);
        this._wsMessageHandler = this._wsMessageHandler.bind(this);
        //Public API
        this.open = this.connect = this.connect.bind(this);
        this.close = this.close.bind(this);
        this.call = this.call.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.publish = this.publish.bind(this);
        this.event = this.event.bind(this);
        this.registerRpcHandler = this.registerRpcHandler.bind(this);
        //Public event handlers
        this.onclose = null;
        this.onopen = null;
    };

    /**
     *
     * @param serverUrl - адрес сервера
     * @param cb - callback, который отработает при успешном соединении с сервером
     * @private
     */
    WampClient.prototype.connect = function (serverUrl, cb) {
        var self = this;
        if (self._wsClient) {
            if (self._wsClient.readyState !== wsStates.CLOSED) {
                throw new Error("WebSocket not closed. Close WebSocket and try again. To close WebSocket use function \"close()\"");
            }
        }
        if (!/^(wss?:\/\/).+/.test(serverUrl)) {
            console.error("Incorrect server url: " + serverUrl);
            return;
        }
        self._serverUrl = serverUrl;
        self._wsClient = new WebSocket(serverUrl);
        self._wsClient.onopen = self._wsOpenedHandler;
        self._wsClient.onclose = self._wsClosedHandler;
        self._wsClient.onmessage = self._wsMessageHandler;
        self._wsClient.onerror = self._wsErrorHandler;
        self._connectHandler = cb;
    };

    WampClient.prototype.close = function () {
        if (this._wsClient) {
            this._wsClient.close(4000);
        }
    };

    /**
     * Remote procedure call
     * @param url
     * @param callback - callback, который вызовется, когда придет ответ с сервера
     * @private
     */
    WampClient.prototype.call = function (url, callback) {
        if (this._wsClient.readyState === wsStates.OPEN) {
            var callId = ++this._callSequence;
            this._callResponseHandlers[callId] = callback;
            var callData = [(this._stringMsgTypes ? "CALL" : msgTypes.CALL), callId, url];
            callData = callData.concat(Array.prototype.slice.call(arguments, 2));
            this._wsClient.send(JSON.stringify(callData));
        } else {
            throw new Error("WebSocket not connected");
        }
    };

    /**
     * Server events subscription
     * @param url
     * @param callback
     * @private
     */
    WampClient.prototype.subscribe = function (uri, eventCb, okCb, errorCb, params) {
        if (this._wsClient.readyState === wsStates.OPEN) {
            this._eventHandlers[uri] = eventCb;
            this._subscribedHandlers[uri] = okCb;
            this._subscribeErrorHandlers[uri] = errorCb;
            let msg = [(this._stringMsgTypes ? "SUBSCRIBE" : msgTypes.SUBSCRIBE), uri];
            if (params) {
                msg.push(params);
            }
            this._wsClient.send(JSON.stringify(msg));
        } else {
            throw new Error("WebSocket not connected");
        }
    };

    /**
     * Отписка от серверных событий
     * @param url
     * @private
     */
    WampClient.prototype.unsubscribe = function (uri) {
        delete this._eventHandlers[uri];
        delete this._subscribedHandlers[uri];
        delete this._subscribeErrorHandlers[uri];
        if (this._wsClient.readyState === wsStates.OPEN) {
            this._wsClient.send(JSON.stringify([(this._stringMsgTypes ? "UNSUBSCRIBE" : msgTypes.UNSUBSCRIBE), uri]));
        }
    };

    WampClient.prototype.publish = function (uri, event) {
        if (this._wsClient.readyState === wsStates.OPEN) {
            this._wsClient.send(JSON.stringify([(this._stringMsgTypes ? "PUBLISH" : msgTypes.PUBLISH), uri, event]));
        } else {
            throw new Error("WebSocket not connected");
        }
    };

    WampClient.prototype.event = function (uri, event) {
        if (this._wsClient.readyState === wsStates.OPEN) {
            if (this._subUris[uri]) {
                this._wsClient.send(JSON.stringify([(this._stringMsgTypes ? "EVENT" : msgTypes.EVENT), uri, event]));
            } else {
                console.info(`No subscribers for "${uri}"`);
            }
        } else {
            throw new Error("WebSocket not connected");
        }
    };

    WampClient.prototype.registerRpcHandler = function (uri, cb) {
        if (typeof uri !== "string" || !uri) {
            throw new Error("Invalid uri, must be non empty string");
        }
        if (typeof cb === "function") {
            this._callRequestHandlers[uri] = cb;
        } else {
            if (cb == null) {
                delete this._callRequestHandlers[uri];
            } else {
                throw new Error("Invalid callback, must be function or null");
            }
        }
    };

    WampClient.prototype._wsMessageHandler = function (rawMsg) {
        let msg;
        try {
            msg = JSON.parse(rawMsg.data);
        } catch (e) {
            console.debug("WAMP: Invalid message JSON");
            return;
        }
        let msgType = msg[0],
            msgId = msg[1],
            msgData = msg.length > 2 ? msg[2] : null;
        if (typeof msgType === "string" && msgTypes.hasOwnProperty(msgType)) {
            msgType = msgTypes[msgType];
        }
        switch (msgType) {
            case msgTypes.EVENT:
                if (typeof this._eventHandlers[msgId] === "function") {
                    this._eventHandlers[msgId](msgData);
                }
                break;
            case msgTypes.SUBSCRIBE:
                this._subUris[msgId] = true;
                break;
            case msgTypes.UNSUBSCRIBE:
                delete this._subUris[msgId];
                break;
            case msgTypes.SUBSCRIBED:
                if (typeof this._subscribedHandlers[msgId] === "function") {
                    this._subscribedHandlers[msgId](msgData);
                }
                delete this._subscribedHandlers[msgId];
                break;
            case msgTypes.SUBSCRIBEERROR:
                if (typeof this._subscribeErrorHandlers[msgId] === "function") {
                    this._subscribeErrorHandlers[msgId](msgData);
                }
                delete this._subscribeErrorHandlers[msgId];
                break;
            case msgTypes.CALL:
                {
                    let rpcUri = msgData;
                    for (let uri of Object.keys(this._callRequestHandlers)) {
                        if (uri === rpcUri || (new RegExp(uri)).test(rpcUri)) {
                            this._callRequestHandlers[uri].apply(this, msg.slice(3));
                        }
                    }
                }
                break;
            case msgTypes.CALLRESULT:
                if (typeof this._callResponseHandlers[msgId] === "function") {
                    this._callResponseHandlers[msgId](msgData);
                }
                delete this._callResponseHandlers[msgId];
                break;
            case msgTypes.CALLERROR:
                var err = {
                    url: msgData,
                    desc: msg[3],
                    details: msg.length > 4 ? msg[4] : null,
                };
                if (typeof this._callResponseHandlers[msgId] === "function") {
                    this._callResponseHandlers[msgId](null, err);
                }
                delete this._callResponseHandlers[msgId];
                break;
            case msgTypes.HB:
                if (typeof this._heartBeatHandlers[msgId] === "function") {
                    this._heartBeatHandlers[msgId](msgData);
                }
                delete this._heartBeatHandlers[msgId];
                break;
        }
    };

    WampClient.prototype._wsOpenedHandler = function () {
        var self = this;
        if (self._heartBeat) {
            self._startHeartbeat.call(self);
        }
        if (typeof self._connectHandler === "function") {
            self._connectHandler();
        }
        if (typeof self.onopen === "function") {
            self.onopen();
        }
    };

    WampClient.prototype._wsClosedHandler = function (closeEvent) {
        var self = this;
        self._eventHandlers = {};
        self._subscribedHandlers = {};
        self._subscribeErrorHandlers = {};
        self._subUris = {};
        self._callResponseHandlers = {};
        self._callRequestHandlers = {};
        self._heartBeatHandlers = {};
        clearInterval(self._hbInterval);
        if (closeEvent.code !== 4000) {
            setTimeout(self._startReconnect.bind(self), helpers.getRandom(2, 4) * 1000);
        }
        if (typeof self.onclose === "function") {
            self.onclose();
        }
    };

    WampClient.prototype._wsErrorHandler = function (err) {
        console.log(err);
    };

    WampClient.prototype._startReconnect = function () {
        var self = this;
        if (self._wsClient && self._wsClient.readyState === wsStates.CLOSED) {
            self.connect.call(self, self._serverUrl);
        }
    };

    WampClient.prototype._startHeartbeat = function () {
        var self = this;
        var hbCount = 0,
            hbCounter = 0;
        self._hbInterval = setInterval(function () {
            if (!self._wsClient || self._wsClient.readyState !== wsStates.OPEN) {
                clearInterval(self._hbInterval);
                return;
            }
            self._sendHeartbeat.call(self, hbCount++, function () {
                hbCounter = 0;
            });
            hbCounter++;
            if (hbCounter > 5) {
                console.warn("Ping timeout, reconnecting...");
                self.close();
            }
        }, self._heartBeatInterval);
    };

    WampClient.prototype._sendHeartbeat = function (hbNumber, cb) {
        var self = this;
        self._heartBeatHandlers[hbNumber] = cb;
        self._wsClient.send(JSON.stringify([(self._stringMsgTypes ? "HB" : msgTypes.HB), hbNumber]));
    };

    Object.defineProperty(WampClient.prototype, "state", {
        get: function () {
            return this._wsClient.readyState;
        },
        enumerable: true,
    });

    // Thanks to Underscore.js for export code
    // Export the WampClient function for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `WampClient` as a global object.
    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = WampClient;
        }
        exports.WampClient = WampClient;
    } else {
        root.WampClient = WampClient;
    }

}.call(this));