/**
 * Created by kib357 on 09/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import client from "../wamp/client";
import changesProcessor from "../utils/changesProcessor";
import alerts from "../utils/alertsEmitter";
import i18n from "../stores/i18nStore";
import {serverActions} from "constants";
import uuid from "node-uuid";

let currentFindId = null;

class DataActuators {
    subscribe(storeName, params) {
        console.log("Subscribe action for " + storeName);
        client.subscribe("com.stores." + storeName, (data) => {
            dispatcher.dispatch({
                "actionType": serverActions.ITEMS_UPDATED,
                "data": data,
                "storeName": storeName,
            });
        }, () => {
            dispatcher.dispatch({
                "actionType": serverActions.SUBSCRIBED,
                "storeName": storeName,
            });
        }, (error) => {
            alerts.error(i18n.getError(error));
        }, params);
    }

    unsubscribe(storeName) {
        if (storeName === "users") {
            return;
        }
        console.log("Unsubscribe action for " + storeName);
        client.unSubscribe("com.stores." + storeName);
    }

    find(storeName, query, take, skip, order, currentId) {
        let id = uuid.v4();
        currentFindId = id;
        client.call("com.stores." + storeName + ".find", function (data, error) {
            if (typeof error === "undefined" && currentFindId === id) {
                dispatcher.dispatch({
                    "actionType": serverActions.ITEMS_PART_LOADED,
                    "items": data.items,
                    "stateCounters": data.stateCounts,
                    "offset": skip,
                    "length": data.fullCount,
                    "currentIndex": data.currentIndex,
                    "currentItem": data.currentItem,
                    "storeName": storeName,
                });
            }
        }, {"query": query, "take": take, "skip": skip, "orderBy": order || "name", "currentId": currentId});
    }

    load(storeName, id) {
        client.call("com.stores." + storeName + ".get", (data, error) => {
            dispatcher.dispatch({
                "actionType": serverActions.ITEM_LOAD_2,
                "error": error,
                "item": data,
                "itemId": id,
            });
        }, id);
    }

    save(storeName, item, nameForAlert) {
        let name = (nameForAlert || item.$changedProps.name || item.name);

        if (item.$state !== "new") {
            item = {"_id": item._id, "$changedProps": item.$changedProps};
        }
        changesProcessor.combineItem(item);
        console.log("Item to save: ", item);
        client.call("com.stores." + storeName + ".save", (data, error) => {
            dispatcher.dispatch({
                "actionType": serverActions.ITEM_SAVE_RESPONSE,
                "error": error,
                "itemId": item._id,
            });

            let alertText = error != null ? (i18n.get("errors.save") + " " + name + ": " + error.desc) :
                ((name ? "\"" + name + "\" - " : "") + i18n.get("common.saved"));
            alerts.info(alertText);
        }, item);
    }

    delete(storeName, id) {
        client.call("com.stores." + storeName + ".delete", (data, error) => {
            dispatcher.dispatch({
                "actionType": serverActions.ITEM_DELETE_RESPONSE,
                "error": error,
                "itemId": id,
            });
            if (error != null) {
                alerts.error(i18n.get("errors.delete") + ": " + error.desc, 5);
            }
        }, id);
    }

    performAction(storeName, itemId, actionId, data) {
        changesProcessor.combineItem(data || {});
        client.call("com.action", function (data, error) {
            dispatcher.dispatch({
                "actionType": serverActions.ITEM_ACTION_RESPONSE,
                "storeName": storeName,
                "itemId": itemId,
                "actionId": actionId,
                "data": data,
                "error": error,
            });
            if (error != null) {
                alerts.error(i18n.get("errors.action") + ": " + error.desc, 5);
            }
        }, storeName, actionId, itemId, data || {});
    }
}

export default new DataActuators();