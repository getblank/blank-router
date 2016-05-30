/**
 * Created by kib357 on 19/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import { userActions } from "constants";

class PreferencesActuators {
    setPreference(preference, value) {
        dispatcher.dispatch({
            "actionType": userActions.SET_PREFERENCE,
            "preference": preference,
            "value": value,
        });
    }
}

let preferencesActions = new PreferencesActuators();

export default preferencesActions;