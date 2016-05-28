/**
 * Created by kib357 on 23/12/15.
 */

import React from "react";
import Icon from "../misc/Icon";
import credentialsStore from "../../stores/credentialsStore.js";
import configStore from "../../stores/configStore";
import filtersStore from "../../stores/filtersStore.js";
import classnames from "classnames";

class ActionActuator extends React.Component {
    constructor(props) {
        super(props);
        let {actionDesc, templateModel} = props;
        this.state = {
            "labelText": actionDesc.label(templateModel),
            "icon": actionDesc.icon(templateModel),
        };
    }

    createMarkup(text) {
        return { __html: text };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.actionDesc && nextProps.actionDesc.dynamicLabel) {
            this.setState({
                "labelText": nextProps.actionDesc.label(nextProps.templateModel),
                "icon": nextProps.actionDesc.icon(nextProps.templateModel)
            });
        }
    }

    render() {
        let user = credentialsStore.getUser();
        let {actionDesc, item, dark, first, last, dontCheckReady} = this.props;
        let http = actionDesc.type && actionDesc.type.toLowerCase() === "http" && actionDesc.props == null;
        let cn = classnames({
            "btn": http,
            "btn-flat": actionDesc.label && actionDesc.className == null,
            "btn-icon": !actionDesc.label && actionDesc.className == null,
            "dark": dark,
            "first": first, //index === 0,
            "last": last, //index === actionsDescs.length - 1
        }, actionDesc.className, this.props.className);

        let labelControl = (
            <span style={{ "opacity": (item.$state === "action-" + actionDesc._id ? 0 : 1) }}>
                <Icon icon={this.state.icon}/>
                {this.state.labelText}
            </span>
        );
        let disabled = (actionDesc.type !== "client" && !dontCheckReady && !actionDesc.disableItemReadyCheck && item.$state != "ready") ||
            actionDesc.disabled(user, item);
        if (http) {
            let href = configStore.getHttpActionHref(actionDesc.storeName, actionDesc, item._id, filtersStore, {});
            return (
                <a key={actionDesc._id} className={cn} disabled={disabled}
                    href={href} target="_blank" tabIndex="-1">
                    {labelControl}
                </a>
            );
        }
        return (
            <button type="button"
                key={actionDesc._id}
                className={cn}
                style={Object.assign(actionDesc.style || {}, this.props.style) }
                data-action={actionDesc._id}
                disabled={disabled}
                tabIndex="-1"
                onClick={this.props.onClick}>
                {labelControl}
            </button>
        );
    }
}

ActionActuator.propTypes = {};
ActionActuator.defaultProps = {};

export default ActionActuator;
