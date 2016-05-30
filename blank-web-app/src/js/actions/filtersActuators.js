/**
 * Created by kib357 on 18/11/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import { userActions } from "constants";

class FilterActuators {
    setOrder(storeName, order)
    {
        dispatcher.dispatch({
            "actionType": userActions.SET_ORDER,
            "context": storeName,
            "storeName": storeName,
            "order": order,
        });
    }

    setFilter(storeName, property, filter)
    {
        dispatcher.dispatch({
            "actionType": userActions.SET_FILTER,
            "context": storeName,
            "storeName": storeName,
            "property": property,
            "filter": filter,
        });
    }

    clearFilter(storeName)
    {
        dispatcher.dispatch({
            "actionType": userActions.CLEAR_FILTER,
            "context": storeName,
            "storeName": storeName,
        });

    }
}

let filterActions = new FilterActuators();

export default filterActions;