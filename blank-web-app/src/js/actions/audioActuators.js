/**
 * Created by kib357 on 18/10/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import { userActions } from "constants";

export default {
    play: function (src) {
        dispatcher.dispatch({
            "actionType": userActions.AUDIO_PLAY,
            "src": src,
        });
    },
    stop: function () {
        dispatcher.dispatch({
            "actionType": userActions.AUDIO_STOP,
        });
    },
    pause: function () {
        dispatcher.dispatch({
            "actionType": userActions.AUDIO_PAUSE,
        });
    }
};