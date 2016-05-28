/**
 * Created by kib357 on 16.03.2015.
 */

import EventEmitter from "./events";

class alertsEmitter extends EventEmitter {
    notification(notification, time) {
        this.emit("add", notification, "notification", time);
    }

    removeNotification(id) {
        this.emit("remove", id);
    }

    error(message, time) {
        this.emit("add", message, "danger", time);
    }

    info(message, time) {
        this.emit("add", message, "info", time);
    }
}
var e = new alertsEmitter();
export default e;