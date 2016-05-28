/**
 * Created by kib357 on 10/11/15.
 */

import BaseStore from "./baseStore";
import historyStore from "./historyStore";
import configStore from "./configStore";
import dataActions from "../actions/dataActuators";
import { userActions, serverActions } from "constants";

class AppStateStore extends BaseStore {
    constructor(props) {
        super(props);
        this.route = null;
        this.itemId = null;
        this.store = null;
        this.navGroup = null;
    }

    getCurrentStore() {
        return this.store;
    }

    getCurrentItemId() {
        return this.itemId;
    }

    handleChangeState() {
        let route = historyStore.getCurrentRoute(), store = null, navGroup = null, itemId = null, single = false;
        if (route != null && configStore.isReady()) {
            for (let i = 0; i < route.components.length; i++) {
                switch (route.components[i]) {
                    case "NavGroup":
                        navGroup = route.levels[i];
                        break;
                    case "StoreView":
                        store = route.levels[i];
                        break;
                    case "SingleStoreView":
                        store = route.levels[i];
                        single = true;
                        break;
                }
            }
            if (store != null) {
                itemId = single ? store : historyStore.params.get("itemId");
            }
        }
        if ((this.route == null && route != null) ||
            store !== this.store ||
            navGroup !== this.navGroup ||
            itemId !== this.itemId) {
            if (store !== this.store) {
                if (this.store) {
                    dataActions.unsubscribe(this.store);
                }
                if (store) {
                    dataActions.subscribe(store);
                }
            }
            this.route = route;
            this.store = store;
            this.navGroup = navGroup;
            this.itemId = itemId;
            this.__emitChange();
            console.log("Group: ", navGroup, " Store: ", store, " ItemId: ", itemId);
        }
    }

    __onDispatch(payload) {
        this.__dispatcher.waitFor([historyStore.getDispatchToken(), configStore.getDispatchToken()]);
        switch (payload.actionType) {
            case userActions.ROUTE_CHANGE:
            case serverActions.UPDATE_CONFIG:
                this.handleChangeState();
                break;
            default:
                if (configStore.hasChanged()) {
                    this.handleChangeState();
                }
                break;
        }
    }
}

export default new AppStateStore();