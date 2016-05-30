/**
 * Created by kib357 on 03/12/15.
 */

import "./app.js";

var wsUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.hostname + ":8888";
var wsClient = null;

var connect = function () {
    wsClient = new WebSocket(wsUrl);
    wsClient.onmessage = function () {
        location.reload();
    };
    wsClient.onclose = function () {
        setTimeout(function () {
            if (wsClient && wsClient.readyState === 3) { //3-CLOSED
                connect();
            }
        }, (Math.random() * 2000 + 2000));
    };
};
connect();