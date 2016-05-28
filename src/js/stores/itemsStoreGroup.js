/**
 * Created by kib357 on 15/11/15.
 */

import BaseStoreGroup from "./baseStoreGroup.js";
import credentialsStore from "./credentialsStore.js";
import listStore from "./listStore.js";
import currentItemStore from "./currentItemStore.js";

class ItemsStoreGroup extends BaseStoreGroup {
    __getStores() {
        return [credentialsStore, listStore, currentItemStore];
    }
}

let storeGroup = new ItemsStoreGroup();

export default storeGroup;