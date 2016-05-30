/**
 * Created by kib357 on 21/02/15.
 */

import client from "../wamp/client";
import dispatcher from "../dispatcher/blankDispatcher";
import { serverActions } from "constants";
import alerts from "../utils/alertsEmitter";

export default {
    loadServerState: function () {
        client.call("com.state", (data, error) => {
            if (error == null) {
                dispatcher.dispatch({
                    "action": {},
                    "actionType": serverActions.UPDATE_SERVER_STATE,
                    "serverState": data,
                    "error": error,
                });
            } else {
                alerts.error("Полууундра!!! Свистать всех наверх! Капитан сошел с ума!");
            }
        });
    },
    setup: function (data) {
        return new Promise((resolve, reject) => {
            client.call("com.setup", (data, error) => {
                console.log(error);
                if (error == null) {
                    localStorage.setItem("tempKey", data.key);
                    dispatcher.dispatch({
                        "action": {},
                        "actionType": serverActions.UPDATE_SERVER_STATE,
                        "serverState": "ready",
                        "error": error,
                    });
                } else {
                    switch (error.desc) {
                        case "WRONG_EMAIL":
                            alerts.error("Некорректный e-mail", 2);
                            break;
                        default:
                            alerts.error("Сервер не справился с настройкой учетных данных администратора: " + error.desc);
                            break;
                    }
                }
                resolve();
            }, data);
        });
    },
};