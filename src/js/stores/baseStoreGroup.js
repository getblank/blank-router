/**
 * Created by kib357 on 15/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher.js";
import EventEmitter from "../utils/events";
import {storeEvents} from "constants";

export default class BaseStoreGroup extends EventEmitter {
    constructor() {
        super();
        this.__className = this.constructor.name;

        this.__changed = false;
        this.__changeEvent = storeEvents.CHANGED;
        this.__dispatcher = dispatcher;

        let stores = this.__getStores();

        // precompute store tokens
        var storeTokens = stores.map(function (store) {
            return store.getDispatchToken();
        });

        // register with the dispatcher
        this._dispatchToken = this.__dispatcher.register(payload => {
            this.__dispatcher.waitFor(storeTokens);
            //check any store changed and emit
            for (let i = 0; i < stores.length; i++) {
                if (stores[i].hasChanged()) {
                    this.emit(this.__changeEvent);
                    return;
                }
            }
        });
    }

    __getStores() {
        console.error(this.__className, ".__getStores(): Must be overridden");
    }
}