/**
 * Created by kib357 on 13/01/16.
 */

import React from "react";
import i18n from "../../../stores/i18nStore.js";
import credentialsStore from "../../../stores/credentialsStore.js";
import changesProcessor from "../../../utils/changesProcessor";

class InputBase extends React.Component {
    constructor(props) {
        super(props);
    }

    getTemplateModel() {
        return {
            "$i18n": i18n.getForStore(this.props.storeName),
            "$item": this.props.item,
            "$user": this.props.user,
        };
    }

    getValue(props) {
        let {field, fieldName, item, storeName} = (props || this.props),
            value = null;
        if (item) {
            if (field.type === "virtual/client") {
                item = JSON.parse(JSON.stringify(item));
                changesProcessor.combineItem(item);
                var valueFn = new Function("$item", "$i18n", "$user", "$index", field.load);
                value = valueFn(item, i18n.getForStore(storeName), credentialsStore.getUser(), this.props.index);
            } else {
                let changedProps = item.$changedProps;
                if (changedProps && changedProps.hasOwnProperty(fieldName)) {
                    value = changedProps[fieldName];
                } else {
                    value = item[fieldName];
                }
            }
        }
        return value;
    }

    isChanged(props) {
        let {fieldName, item} = (props || this.props);
        return item.$changedProps && item.$changedProps.hasOwnProperty(fieldName);
    }

    isDirty(props) {
        let {fieldName, item} = (props || this.props);
        return item.$dirtyProps && item.$dirtyProps.hasOwnProperty(fieldName);
    }

    render() {
        return (
            <div>InputBase</div>
        );
    }
}

InputBase.propTypes = {};
InputBase.defaultProps = {};

export default InputBase;
