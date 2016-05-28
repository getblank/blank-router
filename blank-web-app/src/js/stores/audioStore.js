/**
 * Created by kib357 on 18/10/15.
 */

import BaseStore from "./baseStore";
import {serverActions, userActions} from "constants";

class AudioStore extends BaseStore {
    constructor() {
        super();
        this.src = null;
        this.state = null;
    }

    get() {
        return {
            "src": this.src,
            "state": this.state,
        };
    }

    __onDispatch(payload) {
        switch (payload.actionType) {
            case serverActions.DISCONNECTED_EVENT:
                this.src = null;
                break;
            case userActions.AUDIO_PLAY:
                this.src = payload.src;
                this.state = "playing";
                break;
            case userActions.AUDIO_STOP:
                this.state = "stopped";
                break;
            case userActions.AUDIO_PAUSE:
                this.state = "paused";
                break;
        }
        this.__emitChange();
    }
}
let store = new AudioStore();
export default store;