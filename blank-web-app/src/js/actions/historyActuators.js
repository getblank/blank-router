/**
 * Created by kib357 on 09/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import configStore from "../stores/configStore";
import { userActions } from "constants";

class HistoryActuators {
    constructor() {
        window.addEventListener("hashchange", () => {
            dispatcher.dispatch({
                "action": {},
                "actionType": userActions.ROUTE_CHANGE,
                "path": this.getCurrentPath(),
            });
        });
    }

    getCurrentPath() {
        var path = window.location.hash.replace("#", "").replace(/\?.*/, "");
        return path;
    }

    pushState(path) {
        if (typeof path !== "string") {
            console.error("Invalid route path requested: ", JSON.stringify(path));
        }
        window.location.hash = path;
    }

    pushStore(storeName) {
        if (typeof storeName !== "string") {
            console.error("Invalid store requested: ", JSON.stringify(storeName));
        }
        this.pushState(configStore.findRoute(storeName));
    }

    replaceState(path) {
        if (typeof path !== "string") {
            console.error("Invalid route path requested: ", JSON.stringify(path));
        }
        var baseUrl = window.location.href.split("#")[0];
        window.location.replace(baseUrl + "#" + path);
    }

    replaceStore(storeName) {
        if (typeof storeName !== "string") {
            console.error("Invalid store requested: ", JSON.stringify(storeName));
        }
        this.replaceState(configStore.findRoute(storeName));
    }
}

export default new HistoryActuators();