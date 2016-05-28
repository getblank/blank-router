/**
 * Created by kib357 on 23/12/15.
 */

import React from "react";
import ActionActuator from "../../../actions/ActionActuator.js";
import i18n from "../../../../stores/i18nStore.js";
import configStore from "../../../../stores/configStore";
import credentialsStore from "../../../../stores/credentialsStore";
import find from "utils/find";

class ActionProperty extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    performAction(e) {
        e.preventDefault();
        var actionId = e.currentTarget.getAttribute("data-action");
        this.props.performAction(actionId);
    }

    render() {
        let {storeName, item} = this.props;
        let actions = this.props.propDesc.actions || [];
        if (!Array.isArray(actions)) {
            actions = [actions];
        }
        let actionsDescs = [],
            storeActions = configStore.getActions(storeName, { "$user": credentialsStore.getUser(), "$item": item });
        for (let action of actions) {
            if (typeof action === "string") {
                action = { "_id": action };
            }
            let desc = find.item(storeActions, action._id);
            if (desc != null) {
                actionsDescs.push(Object.assign({ "storeName": this.props.storeName }, desc, action));
            }
        }
        //console.warn("actions: ", actions, "actionsDescs: ", actionsDescs);
        let templateModel = {
            "$i18n": i18n.getForStore(storeName),
            "$item": item,
        };
        let actuators = actionsDescs.map((actionDesc, index) =>
            <ActionActuator key={actionDesc._id}
                actionDesc={actionDesc}
                item={this.props.item}
                templateModel={templateModel}
                first={index === 0}
                last={index === actionsDescs.length - 1}
                onClick={this.performAction.bind(this) }/>);
        let style = this.props.propDesc.style;
        return (
            <div className="form-field actions-control" style={style}>
                {actuators}
            </div>
        );
    }
}

ActionProperty.propTypes = {
    "storeName": React.PropTypes.string.isRequired,
    "item": React.PropTypes.object.isRequired,
    "propDesc": React.PropTypes.object.isRequired,
    "performAction": React.PropTypes.func.isRequired,
};
ActionProperty.defaultProps = {};

export default ActionProperty;
