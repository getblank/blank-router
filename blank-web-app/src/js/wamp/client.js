/**
 * Created by kib357 on 21/02/15.
 */

import connectionActions from "../actions/connectionActuator.js";
import WampClient from "wamp";

var wsUrl = (process.env.WS || ((location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/")) + "wamp";
var wampClient = new WampClient(true, true);
wampClient.onopen = function () {
    console.info("connected to " + wsUrl);
    connectionActions.connected();
};
wampClient.onclose = function () {
    connectionActions.disconnected();
};

wampClient.open(wsUrl);

window.addEventListener("beforeunload", function () {
    wampClient.close(null, false);
});

var callViaXhr = function (uri, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                let response = null;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    cb(null, e);
                    return;
                }
                cb(response, null);
            } else {
                cb(null, { "status": xhr.status, "statusText": xhr.statusText });
            }
        }
    };
    xhr.open("GET", uri);
    xhr.send();
};

var call = function (uri, callback) {
    if (uri.indexOf("xhr.") === 0) {
        callViaXhr("/" + uri.slice(4), callback);
    } else {
        wampClient.call.apply(null, arguments);
    }
};

export default {
    subscribe: wampClient.subscribe,
    unSubscribe: wampClient.unsubscribe,
    call: call,
};