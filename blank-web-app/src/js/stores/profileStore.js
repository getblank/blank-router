/**
 * Created by kib357 on 18/11/15.
 */

import BaseStore from "./baseStore.js";
import credentialsStore from "./credentialsStore.js";
import modifiedItemsStore from "./modifiedItemsStore.js";
import { userActions, serverActions, itemStates } from "constants";

class ProfileStore extends BaseStore {
    constructor(props) {
        super(props);
        this._user = null;

        this.get = this.get.bind(this);
    }

    get() {
        return JSON.parse(JSON.stringify(this._user));
    }

    __handleUserUpdate(user) {
        if (user == null) {
            this._user = null;
        } else {
            this._user = Object.assign({"$state": itemStates.ready, "$changedProps": {}}, this._user, user);
        }
        this.__emitChange();
    }

    __onDispatch(payload) {
        this.__dispatcher.waitFor([credentialsStore.getDispatchToken(), modifiedItemsStore.getDispatchToken()]);
        switch (payload.actionType) {
            case serverActions.DISCONNECTED_EVENT:
            case serverActions.UPDATE_USER:
            case serverActions.SIGN_IN:
            case serverActions.SIGN_OUT:
                this.__handleUserUpdate(credentialsStore.getUser());
                break;
            case userActions.ITEM_SAVE_DRAFT:
            case userActions.ITEM_SAVE_REQUEST:
            case serverActions.ITEM_SAVE_RESPONSE:
            case userActions.ITEM_ACTION_REQUEST:
            case serverActions.ITEM_ACTION_RESPONSE:
                if (this._user._id === payload.itemId || (payload.item && this._user._id === payload.item._id)) {
                    this.__handleUserUpdate(modifiedItemsStore.getLastModified());
                }
                break;
        }
    }
}

export default new ProfileStore();