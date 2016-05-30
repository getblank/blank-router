/**
 * Created by kib357 on 11/11/15.
 */

import BaseStore from "./baseStore.js";
import filtersStore from "./filtersStore.js";
import appState from "./appStateStore.js";
import dataActions from "../actions/dataActuators.js";
import modifiedItemsStore from "./modifiedItemsStore.js";
import {userActions, serverActions, itemStates, processStates} from "constants";
import find from "utils/find";
import order from "utils/order";

class ListStore extends BaseStore {
    constructor(props) {
        super(props);
        this._store = appState.getCurrentStore();
        this._items = null;
        this._stateCounters = null;
        this._page = null;
        this._lastAdded = null;
        this._pageSize = 100;
    }

    _reloadItems() {
        this._items = null;
        this._stateCounters = null;
        this._page = null;
        if (this._store) {
            this._requestItems(0);
        }
    }

    getCounters() {
        return this._stateCounters;
    }

    get() {
        return this.getNewItems().concat(this._items);
    }

    getLastAddedId() {
        return this._lastAdded;
    }

    first() {
        return JSON.parse(JSON.stringify(this.items ? (this.items[0] || null) : null));
    }

    needLoadItems(offset) {
        return Math.floor(offset / this._pageSize) !== this._page;
    }

    isReady() {
        return this._items != null && this._store === appState.getCurrentStore();
    }

    __setItem(index, data) {
        if (this._items[index] == null) {
            this._items[index] = Object.assign(modifiedItemsStore.get(data._id) || modifiedItemsStore.getBaseItem(this._store), data);
        } else {
            Object.assign(this._items[index], data);
        }
    }

    getNewItems(noFilter) {
        let res = [];
        for (let modified of modifiedItemsStore.getAll()) {
            if (modified.$store === this._store &&
                modified.$state === itemStates.new &&
                (noFilter || filtersStore.match(modified, modified.$store))) {
                res.push(modified);
            }
        }
        return res;
    }

    __handleRouteChange() {
        if (appState.getCurrentStore() !== this._store) {
            this._store = appState.getCurrentStore();
            this._reloadItems();
        }
    }

    __handleFilterChange() {
        this._reloadItems();
    }

    __handleItemModification(modified) {
        let changed = this.__applyModified(modified);
        if (changed > 0) {
            this.__emitChange();
        }
    }

    __applyModified(modifiedItems) {
        let applied = 0;
        if (this._items == null) {
            return applied;
        }
        if (!Array.isArray(modifiedItems)) {
            modifiedItems = [modifiedItems];
        }
        for (let modified of modifiedItems) {
            if (modified.$store !== this._store) {
                continue;
            }
            let index = find.index(this._items, modified._id, null, true);
            if (index >= 0) {
                //Удаляем объект из списка. Если он не удален и проходит по фильтру, мы вернем его, применив сортировку
                this._items.splice(index, 1);
                if (modified.$state === itemStates.deleted || !filtersStore.match(modified, modified.$store)) {
                    //Ничего не делаем, объект уже удален из списка
                } else {
                    //Применяем изменённые данные к находящимся в списке объектам
                    let orderBy = filtersStore.getOrder(modified.$store);
                    orderedInsert(this._items, Object.assign({}, modified), orderBy);
                }
                applied++;
            } else {
                if (modified.$state !== itemStates.new &&
                    modified.$state !== itemStates.deleted &&
                    filtersStore.match(modified, modified.$store)) {
                    //Если объект не новый, не удален и он проходит по фильтру, попробуем вставить его в список
                    let orderBy = filtersStore.getOrder(modified.$store);
                    orderedInsert(this._items, Object.assign({}, modified), orderBy);
                    applied++;
                }
            }
        }
        return applied;
    }

    __handleCountersChange(payload) {
        //Пересчитываем каунтеры
        var command = payload.data;
        let modified = command.data[0];
        if (this._stateCounters == null || !filtersStore.match(modified, payload.storeName, ["_state"])) {
            return;
        }
        switch (command.event) {
            case "delete":
                if (modified._state !== processStates._archive) {
                    this._stateCounters["all"]--;
                }
                if (this._stateCounters[modified._state] != null) {
                    this._stateCounters[modified._state]--;
                    if (this._stateCounters[modified._state] === 0) {
                        delete this._stateCounters[modified._state];
                    }
                }
                break;
            case "create":
                if (modified._state !== processStates._archive) {
                    this._stateCounters["all"]++;
                }
                this._stateCounters[modified._state] = (this._stateCounters[modified._state] || 0) + 1;
                break;
            case "update":
                if (modified._prevState !== modified._state) {
                    if (modified._prevState && this._stateCounters[modified._prevState] != null) {
                        this._stateCounters[modified._prevState]--;
                        if (this._stateCounters[modified._prevState] === 0) {
                            delete this._stateCounters[modified._prevState];
                        }
                    }
                    this._stateCounters[modified._state] = (this._stateCounters[modified._state] || 0) + 1;
                    if (modified._state !== processStates._archive && modified._prevState === processStates._archive) {
                        this._stateCounters["all"]++;
                    }
                    if (modified._state === processStates._archive && modified._prevState !== processStates._archive) {
                        this._stateCounters["all"]--;
                    }
                }
                break;
        }
        this.__emitChange();
    }

    __handleItemsSubsetLoad(payload) {
        if (payload.storeName !== this._store) {
            console.warn("Subset load warning: subset store !== current store");
            return;
        }
        this._items = this._items || [];
        //При иземенении размера выборки очищаем старые данные
        if (this._items.length !== payload.length) {
            this._items = [];
            this._items.length = payload.length;
        }
        for (let i = 0; i < payload.items.length; i++) {
            this.__setItem(i + payload.offset, payload.items[i]);
        }
        if (payload.currentIndex > 0) {
            this.__setItem(payload.currentIndex, payload.currentItem);
        }
        if (payload.stateCounters != null) {
            this._stateCounters = payload.stateCounters;
        }
        this.__emitChange();
    }

    __onDispatch(payload) {
        this._lastAdded = null;
        this.__dispatcher.waitFor([appState.getDispatchToken(), filtersStore.getDispatchToken(), modifiedItemsStore.getDispatchToken()]);
        switch (payload.actionType) {
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
                    if (payload.actionType === serverActions.ITEMS_UPDATED) {
                        this.__handleCountersChange(payload);
                    }
                    this.__handleItemModification(modified);
                }

                //Checking filters store - it may changed because of changing "_state" of item
                if (filtersStore.hasChanged()) {
                    this.__handleFilterChange();
                    this.__emitChange();
                }
                break;
            case serverActions.ITEMS_PART_LOADED:
                this.__handleItemsSubsetLoad(payload);
                break;
            case userActions.SET_ORDER:
            case userActions.SET_FILTER:
            case userActions.CLEAR_FILTER:
                this.__handleFilterChange();
                this.__emitChange();
                break;
            case userActions.LOAD_ITEMS:
                this._requestItems(payload.offset);
                break;
            default:
                if (appState.hasChanged()) {
                    this.__handleRouteChange();
                    this.__emitChange();
                }
                break;
        }
    }

    _requestItems(offset) {
        if (!this._store) {
            console.warn("Attempt to request without a store!");
            return;
        }
        var page = Math.floor(offset / this._pageSize);
        if (this._page === page) {
            return;
        }
        console.log("_requestItems, page:", page, " pageSize: ", this._pageSize);
        this._page = page;
        var take = this._pageSize * 3;
        var selectedId = appState.getCurrentItemId();
        var filters = filtersStore.getFilters(this._store, true);
        let order = filtersStore.getOrder(this._store);
        dataActions.subscribe(this._store, filters);
        dataActions.find(this._store, filters, take, (page + (page >= 1 ? -1 : 0)) * this._pageSize, order, selectedId);
    }
}

function orderedInsert(items, item, orderBy) {
    let descending = orderBy && orderBy[0] === "-";
    orderBy = descending ? orderBy.slice(1) : orderBy;
    //console.log("orderedInsert. By: ", orderBy, " desc: ", descending);
    if (!descending) {
        for (let i = 0; i < items.length; i++) {
            if (items[i] != null &&
                items[i].$state === itemStates.ready &&
                order.compare(item, items[i], orderBy) === -1) {
                items.splice(i, 0, item);

                //Если элемент должен встать в край одного из диапазонов - удаляем его, т.к. его позиция точно не известна
                if (i > 0 && items[i - 1] == null) {
                    delete items[i];
                }
                return;
            }
        }
        //Inserting at the end of the list if we dont find other position
        items.push(item);
    } else {
        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i] != null &&
                items[i].$state === itemStates.ready &&
                order.compare(item, items[i], orderBy) === -1) {
                items.splice(i + 1, 0, item);

                //Если элемент должен встать в край одного из диапазонов - удаляем его, т.к. его позиция точно не известна
                if (i + 2 < items.length && items[i + 2] == null) {
                    delete items[i + 1];
                }
                return;
            }
        }
        //Inserting at the start of the list if we dont find other position
        items.unshift(item);
    }
}

export default new ListStore();