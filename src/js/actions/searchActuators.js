/**
 * Created by kib357 on 25/05/15.
 */

import client from "../wamp/client";
import alerts from "../utils/alertsEmitter";

module.exports = {
    search: function (entityName, searchText, searchProps, itemsCount, skippedCount, orderBy, loadProps) {
        let query = {
            "$or": searchProps.map(p => {
                let q = {};
                q[p] = { "$regex": searchText, "$options": "i" };
                return q;
            }),
        };
        console.log("query:", query);
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + entityName + ".find", function (res, error) {
                if (typeof error === "undefined") {
                    resolve({ "text": searchText, "items": res.items || [], "count": res.count });
                } else {
                    alerts.error("Search: Что-то пошло не так: " + error.desc);
                    reject(error);
                }
            }, { "query": query, "take": itemsCount, "skip": skippedCount, "orderBy": orderBy, "props": loadProps });
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