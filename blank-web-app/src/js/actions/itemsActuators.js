/**
 * Created by kib357 on 18/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import appState from "../stores/appStateStore";
import { userActions, serverActions } from "constants";
import client from "../wamp/client";
import alerts from "../utils/alertsEmitter";
import i18n from "../stores/i18nStore";
import changesProcessor from "../utils/changesProcessor";

class itemActuators {
    loadItems(offset) {
        dispatcher.dispatch({
            "actionType": userActions.LOAD_ITEMS,
            "offset": offset,
        });
    }

    create(storeName) {
        dispatcher.dispatch({
            "actionType": userActions.ITEM_CREATE,
            "storeName": storeName || appState.getCurrentStore(),
        });
    }

    saveDraft(item, storeName) {
        if (item == null) {
            throw new Error("Cannot save draft - item is null or undefined");
        }
        dispatcher.dispatch({
            "actionType": userActions.ITEM_SAVE_DRAFT,
            "item": item,
            "storeName": storeName || appState.getCurrentStore(),
        });
    }

    save(item) {
        dispatcher.dispatch({
            "actionType": userActions.ITEM_SAVE_REQUEST,
            "itemId": item._id,
        });
    }

    saveToServer(item, storeName, cb) {
        let data = Object.assign({}, item, item.$changedProps);
        delete data.$state;
        delete data.$changedProps;
        delete data.$part;
        client.call("com.stores." + (storeName || appState.getCurrentStore()) + ".save", function (data, error) {
            if (error != null) {
                alerts.error(i18n.get("errors.save") + " " + item.name + ": " + error.desc);
                if (typeof cb === "function") {
                    cb(data, error);
                }
            }
        }, data);
    }

    delete(item, storeName) {
        dispatcher.dispatch({
            "actionType": userActions.ITEM_DELETE_REQUEST,
            "item": item,
            "storeName": storeName || appState.getCurrentStore(),
        });
    }

    performAction(item, actionId, data, storeName) {
        dispatcher.dispatch({
            "actionType": userActions.ITEM_ACTION_REQUEST,
            "item": item,
            "actionId": actionId,
            "data": data,
            "storeName": storeName || appState.getCurrentStore(),
        });
    }

    performStoreAction(storeName, actionId, requestData) {
        changesProcessor.combineItem(requestData);
        storeName = storeName || appState.getCurrentStore();
        dispatcher.dispatch({
            "actionType": userActions.STORE_ACTION_REQUEST,
            "actionId": actionId,
            "storeName": storeName,
        });
        client.call("com.action", function (data, error) {
            dispatcher.dispatch({
                "actionType": serverActions.STORE_ACTION_RESPONSE,
                "actionId": actionId,
                "storeName": storeName,
                "error": error,
            });
            if (error != null) {
                alerts.error(i18n.get("errors.action") + ": " + error.desc, 5);
            }
        }, storeName, actionId, "", requestData || {});
    }

    loadRefs(itemId, property, all, query, storeName) {
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + (storeName || appState.getCurrentStore()) + ".load-refs", function (res, error) {
                if (typeof error === "undefined") {
                    resolve(res);
                } else {
                    reject(error);
                }
            }, itemId, property, all, query);
        });
    }

    addComment(itemId, fieldName, comment, storeName) {
        return new Promise(function (resolve, reject) {
            client.call("com.stores." + (storeName || appState.getCurrentStore()) + ".push", function (res, error) {
                if (typeof error === "undefined") {
                    resolve(res);
                } else {
                    reject(error);
                }
            }, itemId, fieldName, comment);
        });
    }
}

let actions = new itemActuators();

export default actions;