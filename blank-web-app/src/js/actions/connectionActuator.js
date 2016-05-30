/**
 * Created by kib357 on 06/08/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import { serverActions } from "constants";

export default {
    connected: function () {
        dispatcher.dispatch({
            "actionType": serverActions.CONNECTED_EVENT,
        });
    },
    disconnected: function () {
        dispatcher.dispatch({
            "actionType": serverActions.DISCONNECTED_EVENT,
        });
    },
};