/**
 * Created by kib357 on 21/02/15.
 */

import BaseStore from "./baseStore.js";
import serverStateActions from "../actions/serverStateActuator.js";
import { serverActions } from "constants";

class ServerStateStore extends BaseStore {
    constructor(props) {
        super(props);
        this._connected = false;
        this._serverState = null;
    }

    getState() {
        return {"connected": this._connected, "serverState": this._serverState};
    }

    get() {
        return {"connected": this._connected, "serverState": this._serverState};
    }

    __onDispatch(payload) {
        switch (payload.actionType) {
            case serverActions.CONNECTED_EVENT:
                this._connected = true;
                serverStateActions.loadServerState();
                this.__emitChange();
                break;
            case serverActions.DISCONNECTED_EVENT:
                this._connected = false;
                this._serverState = null;
                this.__emitChange();
                break;
            case serverActions.UPDATE_SERVER_STATE:
                this._serverState = payload.serverState;
                this.__emitChange();
                break;
        }
    }
}

let store = new ServerStateStore();

export default store;

