/**
 * Created by kib357 on 09/11/15.
 */

import BaseStore from "./baseStore.js";
import appState from "./appStateStore.js";
import modifiedItemsStore from "./modifiedItemsStore.js";
import currentActionStore from "./currentActionStore";
import { serverActions } from "constants";

class UpdateSignalStore extends BaseStore {
    constructor(props) {
        super(props);
    }

    __onDispatch(payload) {
        this.__dispatcher.waitFor([modifiedItemsStore.getDispatchToken(), appState.getDispatchToken(), currentActionStore.getDispatchToken()]);
        switch (payload.actionType) {
            case serverActions.ITEM_SAVE_RESPONSE:
            case serverActions.ITEM_ACTION_RESPONSE:
            case serverActions.ITEMS_UPDATED:
                if (modifiedItemsStore.hasChanged()) {
                    let modified = modifiedItemsStore.getLastModified();
                    if (appState.itemId === modified._id) {
                        this.__emitChange();
                    }
                    break;
                }
        }
    }
}

export default new UpdateSignalStore();