/**
 * Created by kib357 on 20/01/16.
 */

import React from "react";
import changesProcessor from "../../utils/changesProcessor.js";
import configStore from "../../stores/configStore";
import validation from "validation";
import check from "utils/check";
import order from "utils/order";
import find from "utils/find";
import {displayTypes, propertyTypes} from "constants";

class EditorBase extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    static isPropHidden(storeDesc, propDesc, user, item, tab) {
        let propAccess = propDesc.groupAccess + (user._id === item._ownerId ? propDesc.ownerAccess : "");
        let hidden = false;
        if (propDesc.type === propertyTypes.action) {
            let anyAction = false;
            for (let actionDescPart of propDesc.actions) {
                let actionDesc = find.item(storeDesc.actions || [], actionDescPart._id);
                if (actionDesc != null &&
                    !configStore.isActionHidden(actionDesc, user, item)) {
                    anyAction = true;
                    break;
                }
            }
            if (!anyAction) { hidden = true }
        }
        return propDesc.hidden(user, item) ||
            propAccess.indexOf("r") < 0 ||
            propDesc.display === "none" ||
            (tab != null && propDesc.formTab !== tab) ||
            hidden;
    }

    getItem(props) {
        props = props || this.props;
        let invalidProps = props.invalidProps || validation.validate(props.storeDesc.props, props.item, null, props.user);
        return Object.assign(props.item, { "$invalidProps": invalidProps });
    }

    getPropGroupsMap(storeDesc, dataModel) {
        //Creating map with groups of form elements
        var propGroups = new Map();
        if (!storeDesc.formGroupsOrder || storeDesc.formGroupsOrder.indexOf("") < 0) {
            propGroups.set("", []);
        }
        for (let propGroup of (storeDesc.formGroupsOrder || [])) {
            propGroups.set(propGroup, []);
        }
        //Sorting fields to their groups
        var propsDescs = storeDesc.props;
        for (let propName of Object.keys(propsDescs || {})) {
            let propDesc = propsDescs[propName];
            if (propDesc.display === displayTypes.none ||
                check.conditions(propDesc.hidden, dataModel)) {
                continue;
            }
            if (!propGroups.has(propDesc.formGroup || "")) {
                propGroups.set(propDesc.formGroup, []);
            }
            propGroups.get(propDesc.formGroup || "").push(Object.assign({}, propDesc, { "name": propName }));
        }
        for (let [key, value] of propGroups) {
            if (value.length === 0) {
                propGroups.delete(key);
            } else {
                order.by(value, "formOrder");
            }
        }
        return propGroups;
    }

    handleChange(property, value, directWrite) {
        //console.log("EditorBase.handleChange. Property: ", property, " Value: ", value);
        let item;
        if (this.props.directWrite || directWrite) {
            item = Object.assign({}, this.state.item);
            item[property] = value;
        } else {
            item = changesProcessor.handle(this.state.item, property, value);
        }
        item.$dirtyProps = item.$dirtyProps || {};
        item.$dirtyProps[property] = true;
        this.emitChange(item);
    }

    handleFocus(property) {

    }

    handleBlur(property) {
        let item = this.state.item;
        item.$touchedProps = item.$touchedProps || {};
        if (!item.$touchedProps.hasOwnProperty(property)) {
            item.$touchedProps[property] = true;
            this.emitChange(item);
        }
    }

    emitChange(item) {
        if (typeof this.props.onChange === "function") {
            this.props.onChange(item);
        }
    }

    render() {
        return (
            <div>EditorBase</div>
        );
    }
}

EditorBase.propTypes = {};
EditorBase.defaultProps = {};

export default EditorBase;
