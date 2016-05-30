/**
 * Created by kib357 on 27/02/16.
 */

import EventEmitter from "../utils/events";

class uiActuators extends EventEmitter {
    showSideNav() {
        this.emit("showSideNav");
    }
    showNotifications() {
        this.emit("showNotifications");
    }
}
var e = new uiActuators();
export default e;