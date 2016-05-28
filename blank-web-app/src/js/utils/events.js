/**
 * Created by kib357 on 15/02/16.
 */

export default class EventEmitter {
    constructor() {
        this._events = new Map();
    }

    on(eventType, handler) {
        if (!this._events.has(eventType)) {
            this._events.set(eventType, new Set());
        }
        let handlers = this._events.get(eventType);
        handlers.add(handler);
    }

    removeListener(eventType, handler) {
        if (!this._events.has(eventType)) {
            return;
        }
        let handlers = this._events.get(eventType);
        handlers.delete(handler);
    }

    emit(eventType) {
        if (!this._events.has(eventType)) {
            return;
        }
        var handlers = this._events.get(eventType);
        let len = arguments.length;
        if (len === 1) {
            for (let handler of handlers) {
                handler.call(this);
            }
        } else {
            let args = new Array(len - 1);
            for (let i = 1; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            for (let handler of handlers) {
                handler.apply(this, Array.prototype.slice.call(args));
            }
        }
    }
}