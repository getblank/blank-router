/**
 * Created by kib357 on 29/03/15.
 */

import React from "react";
import ReactDOM from "react-dom";

function processObjectProperty(item, property, value) {
    if (!item.hasOwnProperty(property)) {
        if (Array.isArray(value)) {
            item[property] = [];
        } else {
            item[property] = {};
        }
    }
    if (JSON.stringify(item[property]) !== JSON.stringify(value)) {
        if (!item.$initialProps.hasOwnProperty([property])) {
            item.$initialProps[property] = item[property];
        } else {
            if (JSON.stringify(item.$initialProps[property]) === JSON.stringify(value)) {
                delete item.$initialProps[property];
            }
        }
        item[property] = value;
    }
}

function processProperty(item, property, value) {
    if (typeof value === "object") {
        console.log("processObjectProperty");
        processObjectProperty(item, property, value);
        return;
    }
    if (!item.hasOwnProperty(property)) {
        switch (typeof value) {
            case "string":
                item[property] = "";
                break;
            case "boolean":
                item[property] = false;
                break;
            case "number":
                item[property] = 0;
                break;
        }
    }
    if (item[property] !== value) {
        if (!item.$initialProps.hasOwnProperty([property])) {
            item.$initialProps[property] = item[property];
        } else {
            if (item.$initialProps[property] === value) {
                delete item.$initialProps[property];
            }
        }
        item[property] = value;
    }
}

var EditorMixin = {
    componentDidMount: function () {
        this.editorMixinValidate();
    },
    componentDidUpdate: function () {
        this.editorMixinValidate();
    },
    editorMixinValidate: function () {
        var form = ReactDOM.findDOMNode(this.refs.editorForm);
        if (form == null) {
            return;
        }
        var isInvalid = !form.checkValidity();
        if (isInvalid !== this.state.invalid) {
            this.setState({"invalid": isInvalid});
        }
    },
    handleChange: function (itemName, properties, values, cb) {
        var item = Object.assign({"$initialProps": {}}, this.state[itemName]);
        if (Array.isArray(properties) && Array.isArray(values) && properties.length === values.length) {
            for (var i = 0; i < properties.length; i++) {
                processProperty(item, properties[i], values[i]);
            }
        } else {
            processProperty(item, properties, values);
        }
        var newState = {};
        newState[itemName] = item;
        this.setState(newState, cb);
    },
    handleSimpleChange: function (e) {
        var input = e.target;
        this.handleChange(this.state.itemProperty || "currentItem", input.getAttribute("id").replace("-input", ""), input.value, this.saveDraft);
    },
    handleCheckboxChange: function (e) {
        var input = e.target;
        this.handleChange(this.state.itemProperty || "currentItem", input.getAttribute("id").replace("-input", ""), input.checked, this.saveDraft);
    },
    handleValueChange: function (property, value) {
        this.handleChange(this.state.itemProperty || "currentItem", property, value, this.saveDraft);
    },
};

var EditorActionsMixin = {
    getStateFromStore: function (overrideStore, nextProps) {
        var store = overrideStore || this.state.store;
        var props = nextProps || this.props;
        var itemId = props.itemId || this.props.params.itemId;
        return {"currentItem": store.get(itemId), "selected": store.getSelectedIds()};
    },
    componentWillReceiveProps: function (nextProps) {
        this.setState(this.getStateFromStore(null, nextProps));
    },
    componentDidMount: function () {
        this.state.store.addChangeListener(this._onChange);
    },
    componentWillUnmount: function () {
        this.state.store.removeChangeListener(this._onChange);
    },
    _onChange: function () {
        this.setState(this.getStateFromStore());
    },
    save: function () {
        if (typeof this.overrideSave === "function") {
            this.overrideSave();
            return;
        }
        this.state.actions.saveDraft(this.state.currentItem);
        this.state.actions.save(this.state.currentItem);
    },
    delete: function () {
        if (this.state.currentItem.$state === "new") {
            this.state.actions.cancelCreation(this.state.currentItem._id);
        } else {
            this.state.actions.delete(this.state.currentItem._id);
        }
        var currentParams = this.getParams();
        delete currentParams.itemId;
        this.transitionTo(this.state.entityName, currentParams);
    },
    cancel: function () {
        var item = this.state.currentItem;
        var initial = item.$initialProps;
        for (var prop in initial) {
            if (initial.hasOwnProperty(prop)) {
                item[prop] = initial[prop];
            }
        }
        item.$initialProps = {};
        this.state.actions.saveDraft(item);
    },
    saveDraft: function () {
        if (this.state.currentItem !== null) {
            this.state.actions.saveDraft(this.state.currentItem);
        }
    },
};

var ToggleMixin = {
    componentWillUnmount: function () {
        document.removeEventListener("click", this.handleDocumentClick);
    },
    toggle: function (e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({"opened": !this.state.opened}, function () {
            this.manageListeners();
        });
    },
    bubbleToggle: function (e) {
        this.setState({"opened": !this.state.opened}, function () {
            this.manageListeners();
        });
    },
    handleDocumentClick: function (e) {
        var rootRef = this.refs["root"];
        if (rootRef == null) {
            this.toggle();
            return;
        }
        var root = ReactDOM.findDOMNode(rootRef);
        if (e.target === root || root.contains(e.target)) {
            return;
        }
        this.toggle();
    },
    manageListeners: function () {
        if (this.state.opened) {
            document.addEventListener("click", this.handleDocumentClick);
        } else {
            document.removeEventListener("click", this.handleDocumentClick);
        }
    },
};

module.exports = {
    "EditorMixin": EditorMixin,
    "ToggleMixin": ToggleMixin,
    "EditorActionsMixin": EditorActionsMixin,
};