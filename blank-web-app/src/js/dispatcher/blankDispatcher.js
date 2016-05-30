import invariant from "invariant";

var _prefix = "ID_";

class Dispatcher {

    constructor() {
        this._callbacks = {};
        this._beforeDispatchCallbacks = {};
        this._isDispatching = false;
        this._isHandled = {};
        this._isPending = {};
        this._lastID = 1;
    }

    /**
     * Registers a callback to be invoked with every dispatched payload. Returns
     * a token that can be used with `waitFor()`.
     */
    register(callback, beforeDispatchCallback) {
        var id = _prefix + this._lastID++;
        this._callbacks[id] = callback;
        if (typeof beforeDispatchCallback === "function") {
            this._beforeDispatchCallbacks[id] = beforeDispatchCallback;
        }
        return id;
    }

    /**
     * Removes a callback based on its token.
     */
    unregister(id) {
        invariant(this._callbacks[id], "Dispatcher.unregister(...): `%s` does not map to a registered callback.", id);
        delete this._callbacks[id];
        delete this._beforeDispatchCallbacks[id];
    }

    /**
     * Waits for the callbacks specified to be invoked before continuing execution
     * of the current callback. This method should only be used by a callback in
     * response to a dispatched payload.
     */
    waitFor(ids) {
        invariant(this._isDispatching, "Dispatcher.waitFor(...): Must be invoked while dispatching.");
        for (var ii = 0; ii < ids.length; ii++) {
            var id = ids[ii];
            if (this._isPending[id]) {
                invariant(
                    this._isHandled[id],
                    "Dispatcher.waitFor(...): Circular dependency detected while " +
                    "waiting for `%s`.",
                    id
                );
                continue;
            }
            invariant(
                this._callbacks[id],
                "Dispatcher.waitFor(...): `%s` does not map to a registered callback.",
                id
            );
            this._invokeCallback(id);
        }
    }

    /**
     * Dispatches a payload to all registered callbacks.
     */
    dispatch(payload) {
        invariant(
            !this._isDispatching,
            "Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch."
        );
        //console.log("Dispatch! ", payload.actionType);
        this._startDispatching(payload);
        try {
            for (var id in this._callbacks) {
                if (this._isPending[id]) {
                    continue;
                }
                this._invokeCallback(id);
            }
        } finally {
            this._stopDispatching();
        }
    }

    /**
     * Is this Dispatcher currently dispatching.
     */
    isDispatching() {
        return this._isDispatching;
    }

    /**
     * @public
     * @return {boolean} Whether the id is pending during current dispatch
     */
    isPending(id) {
        invariant(this._isDispatching, "Dispatcher.isPending(...): Must be invoked while dispatching.");
        return this._isHandled[id];
    }

    /**
     * Call the callback stored with the given id. Also do some internal
     * bookkeeping.
     *
     * @internal
     */
    _invokeCallback(id) {
        this._isPending[id] = true;
        this._callbacks[id](this._pendingPayload);
        this._isHandled[id] = true;
    }

    /**
     * Set up bookkeeping needed when dispatching.
     *
     * @internal
     */
    _startDispatching(payload) {
        for (var id in this._callbacks) {
            this._isPending[id] = false;
            this._isHandled[id] = false;
        }
        this._pendingPayload = payload;
        this._isDispatching = true;
    }

    /**
     * Clear bookkeeping used for dispatching.
     *
     * @internal
     */
    _stopDispatching() {
        //console.log("_stopDispatching");
        delete this._pendingPayload;
        this._isDispatching = false;
    }
}

var dispatcher = new Dispatcher();

export default dispatcher;