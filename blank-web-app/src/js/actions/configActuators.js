/**
 * Created by kib357 on 25/03/15.
 */

import { serverActions, lsKeys } from "constants";
import alerts from "../utils/alertsEmitter";
import dispatcher from "../dispatcher/blankDispatcher";
import client from "../wamp/client";

var _getBaseConfig = function () {
    var locale = localStorage.getItem(lsKeys.locale);
    var uri = "xhr.common-settings" + (locale ? "?lang=" + locale : "");
    client.call(uri,
        (data, error) => {
            if (error == null) {
                dispatcher.dispatch({
                    "actionType": serverActions.UPDATE_CONFIG,
                    "data": data,
                    "user": null,
                });
            }
            else {
                alerts.error("Что-то пошло не так: " + error.desc);
            }
        });
};

class ConfigActuators {
    subscribe(user) {
        if (user == null) {
            alerts.error("Please provide user to get config for.");
            return;
        }
        console.log("Subscribe action for config");
        client.subscribe("com.config", function (data) {
            dispatcher.dispatch({
                "action": {},
                "actionType": serverActions.UPDATE_CONFIG,
                "data": data,
                "user": user,
            });
        });
    }

    unsubscribe() {
        console.log("Unsubscribe action for config");
        client.unSubscribe("com.config");
    }

    getBaseConfig () {
        return _getBaseConfig();
    }

    setLocale (locale) {
        localStorage.setItem(lsKeys.locale, locale);
        _getBaseConfig();
    }
}

export default new ConfigActuators();