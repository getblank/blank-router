/**
 * Created by kib357 on 09/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher.js";
import EventEmitter from "../utils/events";
import {storeEvents} from "constants";

export default class BaseStore extends EventEmitter {
    constructor(props) {
        super(props);
        this.__className = this.constructor.name;

        this.__changed = false;
        this.__changeEvent = storeEvents.CHANGED;
        this.__dispatcher = dispatcher;
        this._dispatchToken = dispatcher.register((payload) => {
            this.__invokeOnDispatch(payload);
        });
    }

    getDispatchToken() {
        return this._dispatchToken;
    }

    getDispatcher() {
        return this.__dispatcher;
    }

    __emitChange() {
        !this.__dispatcher.isDispatching() ? console.error(this.__className, ".__emitChange(): Must be invoked while dispatching.") : undefined;
        this.__changed = true;
    }

    hasChanged() {
        !this.__dispatcher.isDispatching() ? console.error(this.__className, ".hasChanged(): Must be invoked while dispatching.") : undefined;
        return this.__changed && this.__dispatcher.isPending(this._dispatchToken);
    }

    __onDispatch(payload) {
        console.error(this.__className, ".__onDispatch(): Must be overridden");
    }

    __invokeOnDispatch(payload) {
        this.__changed = false;
        this.__onDispatch(payload);
        if (this.__changed) {
            this.emit(this.__changeEvent);
        }
    }
}