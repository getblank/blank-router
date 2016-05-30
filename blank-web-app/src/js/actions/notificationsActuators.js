/**
 * Created by kib357 on 30/08/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import client from "../wamp/client";
import alerts from "../utils/alertsEmitter";
import { serverActions, userActions } from "constants";

var notificationsUpdate = function (store, data) {
    data.group = store;
    dispatcher.dispatch({
        "actionType": serverActions.NOTIFICATIONS_UPDATE,
        "rawMessage": data,
    });
};

module.exports = {
    subscribe: function (stores) {
        for (let store of stores) {
            client.subscribe("com.stores." + store, notificationsUpdate.bind(this, store), (res) => {
            }, (error) => {
                alerts.error("Ошибка при подписке: " + JSON.stringify(error) + " =(", 5);
            });
        }
    },
    unsafeDelete: function (store, ids) {
        ids = ([]).concat(ids);
        client.call("com.stores." + store + ".delete", () => {}, ids);
    },
    delete: function (store, id) {
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + store + ".delete", (data, error) => {
                if (error == null) {
                    resolve(data);
                } else {
                    alerts.error("Очень жаль, но мы не смогли выполнить ваш запрос: " + error.desc + " =(", 5);
                    reject(error);
                }
            }, id);
        });
    },
    performAction: function (storeName, item, actionId, actionData) {
        return new Promise(function (resolve, reject) {
            client.call("com.action", function (data, error) {
                if (error == null) {
                    resolve(data);
                } else {
                    switch (error.desc) {
                        default:
                            alerts.error("Очень жаль, но мы не смогли выполнить ваш запрос: " + error.desc + " =(", 5);
                            break;
                    }
                    reject(error);
                }
            }, storeName, actionId, item._id, actionData);
        });
    },
    highlight: function (id) {
        dispatcher.dispatch({
            "actionType": userActions.NOTIFICATIONS_HIGHLIGHT,
            "id": id,
        });
    },
};