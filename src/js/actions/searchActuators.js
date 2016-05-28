/**
 * Created by kib357 on 25/05/15.
 */

import client from "../wamp/client";
import alerts from "../utils/alertsEmitter";

module.exports = {
    search: function (entityName, searchText, searchProps, itemsCount, skippedCount, orderBy, loadProps) {
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + entityName + ".search", function (res, error) {
                if (typeof error === "undefined") {
                    resolve(res);
                } else {
                    alerts.error("Search: Что-то пошло не так: " + error.desc);
                    reject(error);
                }
            }, searchText, searchProps, itemsCount, skippedCount, orderBy, loadProps);
        });
    },
    searchByIds: function (entityName, ids) {
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + entityName + ".get", function (res, error) {
                if (typeof error === "undefined") {
                    resolve(res);
                } else {
                    alerts.error("SearchByIds: Что-то пошло не так: " + error.desc);
                    reject(error);
                }
            }, ids);
        });
    }
};