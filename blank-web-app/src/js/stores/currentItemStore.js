/**
 * Created by kib357 on 09/11/15.
 */

import BaseStore from "./baseStore.js";
import credentialsStore from "./credentialsStore.js";
import modifiedItemsStore from "./modifiedItemsStore.js";
import appState from "./appStateStore.js";
import config from "./configStore.js";
import dataActions from "../actions/dataActuators.js";
import { userActions, serverActions, itemStates } from "constants";

class CurrentItemStore extends BaseStore {
    constructor(props) {
        super(props);
        this.cache = new Map();
        this.itemId = null;

        this.get = this.get.bind(this);
    }

    get() {
        let item = this.cache.get(this.itemId);
        if (item == null) {
            return null;
        }
        item = JSON.parse(JSON.stringify(item));
        //Пока решили выключить фильтры в карточке объекта
        //if (item.$state !== itemStates.loading && !filtersStore.match(item, item.$store)) {
        //    item.$state = itemStates.notMatchFilter;
        //}
        return item;
    }

    handleItemChange() {
        let newId = appState.getCurrentItemId();
        this.itemId = newId;
        if (newId == null) {
            return;
        }
        let modified = modifiedItemsStore.get(newId);
        if (modified) {
            this.cache.set(newId, modified);
        } else {
            this.cache.set(newId, {
                "_id": newId,
                "$state": itemStates.loading,
                "$store": appState.getCurrentStore(),
                "$changedProps": {},
                "$invalidProps": {},
                "$dirtyProps": {},
                "$touchedProps": {},
            });
            dataActions.load(appState.getCurrentStore(), newId);
        }
    }

    handleItemLoad(id, data, error) {
        let item = this.cache.get(id) || {};
        if (error) {
            item.$state = itemStates.error;
            item.$error = 404;//error.desc;
            /////////////////////////////////////////////////////////////////////
            //TODO remove when fixed server bug with error on loading item from empty single store
            /////////////////////////////////////////////////////////////////////
            if (appState.getCurrentStore() === appState.getCurrentItemId()) {
                delete item.$error;
                Object.assign(item, {
                    "$state": itemStates.ready,
                    "_ownerId": credentialsStore.getUser()._id
                }, config.getBaseItem(appState.getCurrentStore()));
            }
            /////////////////////////////////////////////////////////////////////
        } else {
            Object.assign(item, data);
            item.$state = item._deleted ? itemStates.deleted : itemStates.ready;
        }
        this.cache.set(id, item);
    }

    __onDispatch(payload) {
        this.__dispatcher.waitFor([modifiedItemsStore.getDispatchToken(), appState.getDispatchToken()]);
        switch (payload.actionType) {
            case userActions.ROUTE_CHANGE:
            case serverActions.UPDATE_CONFIG:
                if (appState.hasChanged()) {
                    this.handleItemChange();
                    this.__emitChange();
                }
                break;
            case serverActions.ITEM_LOAD_2:
                this.handleItemLoad(payload.itemId, payload.item, payload.error);
                this.__emitChange();
                break;
            case userActions.ITEM_CREATE:
            case userActions.ITEM_SAVE_DRAFT:
            case userActions.ITEM_SAVE_REQUEST:
            case serverActions.ITEM_SAVE_RESPONSE:
            case userActions.ITEM_DELETE_REQUEST:
            case serverActions.ITEM_DELETE_RESPONSE:
            case userActions.ITEM_ACTION_REQUEST:
            case serverActions.ITEM_ACTION_RESPONSE:
            case serverActions.ITEMS_UPDATED:
            case serverActions.FILE_UPLOAD_RESPONSE:
                if (modifiedItemsStore.hasChanged()) {
                    let modified = modifiedItemsStore.getLastModified();
                    if (this.cache.has(modified._id)) {
                        this.cache.set(modified._id, modified);
                    }
                    if (this.itemId === modified._id) {
                        //console.log("Item in store:", JSON.stringify(modified));
                        this.__emitChange();
                    }
                    break;
                }
        }
    }
}

export default new CurrentItemStore();