/**
 * Created by kib357 on 19/11/15.
 */

import BaseStore from "./baseStore.js";
import credentials from "./credentialsStore.js";
import { userActions } from "constants";

class PreferencesStore extends BaseStore {
    constructor(props) {
        super(props);
    }

    getUserPreference(preference) {
        if (credentials.getUser() == null || !preference) {
            return null;
        }
        let value = localStorage.getItem(credentials.getUser()._id + "-" + preference);
        if (value === null) {
            return null;
        }
        return JSON.parse(value);
    }

    __onDispatch(payload) {
        this._error = null;
        switch (payload.actionType) {
            case userActions.SET_PREFERENCE:
                localStorage.setItem(credentials.getUser()._id + "-" + payload.preference, JSON.stringify(payload.value));
                this.__emitChange();
                break;
        }
    }
}

var store = new PreferencesStore();

export default store;