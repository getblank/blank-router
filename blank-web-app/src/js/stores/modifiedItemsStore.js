/**
 * Created by kib357 on 10/11/15.
 */

import BaseStore from "./baseStore.js";
import configStore from "./configStore.js";
import fileUploadStore from "./fileUploadStore";
import i18n from "./i18nStore.js";
import credentialsStore from "./credentialsStore.js";
import dataActions from "../actions/dataActuators.js";
import historyActions from "../actions/historyActuators.js";
import {
    userActions,
    serverActions,
    itemStates,
    storeTypes,
    propertyTypes,
    storeDisplayTypes,
} from "constants";
import changesProcessor from "../utils/changesProcessor";
import find from "utils/find";
import template from "template";

class ModifiedItemsStore extends BaseStore {
    constructor(props) {
        super(props);
        this.cache = new Map();
        this.itemId = null;
        this.lastModified = null;

        this.get = this.get.bind(this);
    }

    get(id) {
        let item = this.cache.get(id);
        return JSON.parse(JSON.stringify(item || null));
    }

    getAll() {
        return this.cache.values();
    }

    getForStore(storeName) {
        let res = [];
        for (var item of this.cache.values()) {
            if (item.$store === storeName) {
                res.push(item);
            }
        }
        return res;
    }

    getLastModified() {
        return this.lastModified;
    }

    __restoreItemState(item) {
        if (item.$preRequestState) {
            item.$state = item.$preRequestState;
            delete item.$preRequestState;
        }
        this.__checkItemState(item);
    }

    getBaseItem(storeName, isNew) {
        let res = {
            "$state": itemStates.ready,
            "$store": storeName,
            "$changedProps": {},
            "$invalidProps": {},
            "$dirtyProps": {},
            "$touchedProps": {},
        };
        if (isNew) {
            res.$state = itemStates.new;
            res._ownerId = credentialsStore.getUser()._id;
        }
        return res;
    }

    __checkItemState(item) {
        if (item.$state !== itemStates.new && item.$state !== itemStates.saving) {
            item.$state = item.$changedProps && Object.keys(item.$changedProps).length > 0 ? "modified" : "ready";
        }
    }

    __handleCreate(payload) {
        let item = this.getBaseItem(payload.storeName, true);
        Object.assign(item, configStore.getBaseItem(payload.storeName));
        historyActions.pushState(configStore.findRoute(payload.storeName) + "/" + item._id);
        return item;
    }

    __handleSaveDraft(payload) {
        let item = this.cache.get(payload.item._id);
        if (item != null) {
            for (let propName of Object.keys(payload.item)) {
                if (propName[0] === "$") {
                    item[propName] = JSON.parse(JSON.stringify(payload.item[propName] || null));
                }
            }
        } else {
            item = JSON.parse(JSON.stringify(payload.item));
            item.$store = payload.storeName;
        }
        this.__checkItemState(item);
        return item;
    }

    __handleSaveRequest(payload) {
        let item = this.cache.get(payload.itemId);
        if (item == null) {
            throw new Error(payload.itemId + " - not modified, we cannot save it.");
        }
        item.$preRequestState = item.$state;
        let storeDesc = configStore.getConfig(item.$store), nameForAlert = "";
        if (storeDesc.type === storeTypes.single || storeDesc.display === storeDisplayTypes.single) {
            nameForAlert = template.render(storeDesc.label || "?", { "$i18n": i18n.getForStore(item.$store) });
        }
        dataActions.save(item.$store, JSON.parse(JSON.stringify(item)), nameForAlert);
        item.$state = itemStates.saving;
        return item;
    }

    __handleSaveResponse(payload) {
        let item = this.cache.get(payload.itemId);
        if (item == null) {
            throw new Error(payload.itemId + " - not modified, cannot process SAVE response.");
        }
        if (payload.error == null) {
            delete item.$preRequestState;
            //Clear deleted props
            for (let prop of Object.keys(item.$changedProps)) {
                if (item.$changedProps[prop] === null) {
                    delete item[prop];
                    delete item.$changedProps[prop];
                }
            }
            //Clear virtual references data
            let storeDesc = configStore.getConfig(item.$store);
            for (let prop of Object.keys(storeDesc.props)) {
                if (storeDesc.props[prop].type === propertyTypes.virtualRefList) {
                    delete item[prop];
                }
            }
            item = changesProcessor.combineItem(item, true);
            item.$state = itemStates.ready;
            item.$changedProps = {};
            item.$dirtyProps = {};
            item.$touchedProps = {};
            item.$touched = false;
        } else {
            this.__restoreItemState(item);
        }
        return item;
    }

    __handleDeleteRequest(payload) {
        let item = this.cache.get(payload.item._id) || JSON.parse(JSON.stringify(payload.item));
        item.$preRequestState = item.$state;
        item.$store = payload.storeName;
        if (item.$state === itemStates.new) {
            item.$state = itemStates.deleted;
            historyActions.pushState(configStore.findRoute(item.$store));
        } else {
            item.$state = itemStates.deleting;
            dataActions.delete(payload.storeName, item._id);
        }
        return item;
    }

    __handleDeleteResponse(payload) {
        let item = this.cache.get(payload.itemId);
        if (item == null) {
            throw new Error(payload.itemId + " - not modified, cannot process DELETE response.");
        }
        if (payload.error == null) {
            item.$state = itemStates.deleted;
            delete item.$preRequestState;
            historyActions.pushState(configStore.findRoute(item.$store));
        } else {
            this.__restoreItemState(item);
            console.log("Delete error, item: ", item);
        }
        return item;
    }

    __handlePerformActionRequest(payload) {
        let actionDesc = find.itemById(configStore.getConfig(payload.storeName).actions, payload.actionId);
        let item = this.cache.get(payload.item._id) || JSON.parse(JSON.stringify(payload.item));

        if (actionDesc.type === "client" && actionDesc.script) {
            let itemCopy = changesProcessor.combineItem(item, true);
            let script = new Function("$item", "$history", "$setProperty", "$user", actionDesc.script);
            try {
                script(itemCopy, historyActions, (propName, value) => {
                    changesProcessor.handle(item, propName, value);
                }, credentialsStore.getUser());
                this.__checkItemState(item);
            } catch (e) {
                console.error("Action script error: ", e);
            }
            return item;
        }

        if (actionDesc.clientPreScript) {
            let itemCopy = changesProcessor.combineItem(item, true);
            let script = new Function("$history", "$item", "$setProperty", "$user", actionDesc.clientPreScript);
            try {
                let preScriptData = script(historyActions, itemCopy, (propName, value) => {
                    changesProcessor.handle(item, propName, value);
                }, credentialsStore.getUser());
                if (preScriptData) {
                    payload.data = payload.data || {};
                    console.log(preScriptData);
                    Object.assign(payload.data, preScriptData);
                }
            } catch (e) {
                console.error("Action preScript error: ", e);
            }
        }

        item.$preRequestState = item.$state;
        item.$lastActionError = null;
        item.$state = itemStates.saving;
        dataActions.performAction(payload.storeName, item._id, payload.actionId, payload.data);
        return item;
    }

    __handlePerformActionResponse(payload) {
        let item = this.cache.get(payload.itemId);
        if (item == null) {
            throw new Error(payload.itemId + " - not modified, cannot process PERFORM_ACTION response.");
        }
        this.__restoreItemState(item);
        item.$lastActionError = payload.error || null;
        let actionDesc = find.itemById(configStore.getConfig(payload.storeName).actions, payload.actionId);
        if (actionDesc.clientPostScript) {
            let itemCopy = changesProcessor.combineItem(item, true);
            let script = new Function("$result", "$error", "$history", "$item", "$setProperty", "$user", actionDesc.clientPostScript);
            try {
                script(payload.data, payload.error, historyActions, itemCopy, (propName, value) => {
                    changesProcessor.handle(item, propName, value);
                }, credentialsStore.getUser());
                this.__checkItemState(item);
            } catch (e) {
                console.error("Action postScript error: ", e);
            }
        }
        return item;
    }

    //__handleItemLoad(payload) {
    //    if (payload.error == null && payload.item._deleted && this.cache.has(payload.itemId)) {
    //        let item = this.cache.get(payload.itemId);
    //        this.cache.delete(payload.itemId);
    //        item.$state = itemStates.deleted;
    //        return item;
    //    }
    //}

    __handleItemUpdate(payload) {
        var command = payload.data;
        if (command.event === "init") {
            return;
        }
        let updatedItem = command.data[0];
        let item = this.cache.get(updatedItem._id) || this.getBaseItem(payload.storeName);
        Object.assign(item, updatedItem);
        switch (command.event) {
            case "delete":
                item.$state = itemStates.deleted;
                break;
        }
        return item;
    }

    __handleUploadUpdate() {
        let upload = fileUploadStore.getLastModified(),
            item = this.cache.get(upload.itemId);
        if (item == null) {
            return;
        }
        let storeDesc = configStore.getConfig(item.$store);
        let changed = this.__updateFileProps(storeDesc, item, upload);
        if (changed) {
            console.log("Changed: ", item);
            return item;
        }
    }

    __updateFileProps(storeDesc, item, upload) {
        let changed = false,
            data = item.$changedProps,
            props = storeDesc.props;
        for (let propName of Object.keys(props)) {
            let propDesc = props[propName];
            if (propDesc.type === propertyTypes.file || propDesc.type === propertyTypes.fileList) {
                let files = Array.isArray(data[propName]) ? data[propName] : [data[propName]];
                for (let file of files) {
                    if (file && file._id === upload._id) {
                        console.log("Upload: ", upload);
                        file.$uploadState = upload.state;
                        file.$progress = upload.progress;
                        file.error = upload.error;
                        changed = true;
                    }
                }
            }
            if ((propDesc.type === propertyTypes.object || propDesc.type === propertyTypes.objectList) &&
                data[propName] != null) {
                let innerChanged = this.__updateFileProps(propDesc, data[propName], upload);
                if (!changed && innerChanged) {
                    changed = true;
                }
            }
        }
        return changed;
    }

    __onDispatch(payload) {
        this.__dispatcher.waitFor([fileUploadStore.getDispatchToken()]);
        let item;
        switch (payload.actionType) {
            //case serverActions.ITEM_LOAD_2:
            //    item = this.__handleItemLoad(payload);
            //    break;
            case serverActions.SIGN_OUT:
                this.cache = new Map();
                this.itemId = null;
                this.lastModified = null;
                this.__emitChange();
                break;
            case userActions.ITEM_CREATE:
                item = this.__handleCreate(payload);
                break;
            case userActions.ITEM_SAVE_DRAFT:
                item = this.__handleSaveDraft(payload);
                break;
            case userActions.ITEM_SAVE_REQUEST:
                item = this.__handleSaveRequest(payload);
                break;
            case serverActions.ITEM_SAVE_RESPONSE:
                item = this.__handleSaveResponse(payload);
                break;
            case userActions.ITEM_DELETE_REQUEST:
                item = this.__handleDeleteRequest(payload);
                break;
            case serverActions.ITEM_DELETE_RESPONSE:
                item = this.__handleDeleteResponse(payload);
                break;
            case userActions.ITEM_ACTION_REQUEST:
                item = this.__handlePerformActionRequest(payload);
                break;
            case serverActions.ITEM_ACTION_RESPONSE:
                item = this.__handlePerformActionResponse(payload);
                break;
            case serverActions.ITEMS_UPDATED:
                item = this.__handleItemUpdate(payload);
                break;
            case serverActions.FILE_UPLOAD_RESPONSE:
                item = this.__handleUploadUpdate(payload);
                break;
        }
        if (item != null) {
            if (item.$state === itemStates.ready || item.$state === itemStates.deleted) {
                this.cache.delete(item._id);
            } else {
                this.cache.set(item._id, item);
            }
            this.lastModified = item;
            this.__emitChange();
        }
    }
}

export default new ModifiedItemsStore();