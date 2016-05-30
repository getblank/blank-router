/**
 * Created by kib357 on 04/02/16.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import {userActions} from "constants";

class CurrentActionActuators {
    saveDraft(data) {
        dispatcher.dispatch({
            "actionType": userActions.ACTION_SAVE_DRAFT,
            "data": data,
        });
    }

    selectCurrentAction(storeName, itemId, actionId, data) {
        dispatcher.dispatch({
            "actionType": userActions.ACTION_SELECT,
            "storeName": storeName,
            "itemId": itemId,
            "actionId": actionId,
            "data": data,
        });
    }

    cancel() {
        dispatcher.dispatch({
            "actionType": userActions.ACTION_SELECT,
            "storeName": null,
            "itemId": null,
            "actionId": null,
            "data": null,
        });
    }
}

export default new CurrentActionActuators();