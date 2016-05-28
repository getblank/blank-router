/**
 * Created by kib357 on 16/05/15.
 */

import BaseStore from "./baseStore.js";
import serverState from "./serverStateStore.js";
import credentialsActions from "../actions/credentialsActuators.js";
import historyActions from "../actions/historyActuators.js";
import find from "utils/find";
import { serverActions } from "constants";

class CredentialsStore extends BaseStore {
    constructor(props) {
        super(props);
        this._signedIn = false;
        this._waitingForResponse = false;
        this._user = null;
        this._error = null;
        this._pendingAutoLogin = true;
    }

    getState() {
        return {
            "signedIn": this._signedIn,
            "pendingAutoLogin": this._pendingAutoLogin,
            "loading": this._waitingForResponse,
            "user": this._user,
            "error": this._error,
        };
    }

    getUser() {
        return this._user != null ? Object.assign({}, this._user) : null;
    }

    getApiKey() {
        return localStorage.getItem("tempKey");
    }

    signedIn() {
        return this._user != null;
    }

    __autoLogin() {
        let urlKey = find.urlParam("apikey");
        if (urlKey) {
            localStorage.setItem("tempKey", urlKey);
            window.location = location.protocol + "//" + location.host + location.pathname;
            return;
        }
        let key = localStorage.getItem("tempKey");
        if (key != null) {
            console.log("Sign in by key attempt");
            credentialsActions.signIn("$userKey$", key);
        } else {
            this._pendingAutoLogin = false;
            this.__emitChange();
        }
    }

    __clearUserData(notRemoveKey) {
        if (notRemoveKey !== true) {
            localStorage.removeItem("tempKey");
        }
        this._waitingForResponse = false;
        this._signedIn = false;
        this._user = null;
    }

    __setUserData(data) {
        this._user = data.user;
        this._signedIn = this._user != null;
        if (data.key) {
            localStorage.setItem("tempKey", data.key);
        }
    }

    __onDispatch(payload) {
        this._error = null;
        switch (payload.actionType) {
            case serverActions.UPDATE_SERVER_STATE:
                this.__dispatcher.waitFor([serverState.getDispatchToken()]);
                if (serverState.get().serverState === "ready") {
                    this.__autoLogin();
                }
                break;
            case serverActions.DISCONNECTED_EVENT:
                this.__clearUserData(true);
                this._pendingAutoLogin = true;
                this.__emitChange();
                break;
            case serverActions.UPDATE_USER:
                this.__setUserData(payload.rawMessage);
                this.__emitChange();
                break;
            case serverActions.SIGN_IN:
                this._pendingAutoLogin = false;
                if (payload.error == null) {
                    this.__setUserData(payload);
                    credentialsActions.subscribe(this._user);
                }
                this.__emitChange();
                break;
            case serverActions.SIGN_OUT:
                if (this._signedIn) {
                    this.__clearUserData();
                    credentialsActions.unsubscribe();
                    historyActions.pushState("/");
                    this.__emitChange();
                }
                break;
        }
    }
}

var store = new CredentialsStore();
//store.setMaxListeners(30);

export default store;