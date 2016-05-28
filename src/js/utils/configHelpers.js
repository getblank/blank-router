/**
 * Created by kib357 on 21/01/16.
 */

import React from "react";
import find from "utils/find";
import { baseValidators, displayTypes } from "constants";
import i18n from "../stores/i18nStore";
import template from "template";
import validation from "validation";
import moment from "moment";

export default class configHelpers {
    static prepareFormTabs(storeDesc) {
        let tabs = [], pushMore = false;
        for (let tabDesc of storeDesc.formTabs || []) {
            let tab = {};
            if (typeof tabDesc === "string") {
                tab._id = tabDesc;
                tab.label = tabDesc;
            } else {
                tab._id = tabDesc._id;
                tab.label = tabDesc.label;
                tab.hidden = configHelpers.__getConditionFunction(tabDesc.hidden);
            }
            tabs.push(tab);
        }
        for (let propName of Object.keys(storeDesc.props || {})) {
            let propsDesc = storeDesc.props[propName];
            if (propsDesc.display === "none" ||
                propName === "name") {
                continue;
            }
            let tabId = propsDesc.formTab || "";
            if (find.index(tabs, tabId) < 0) {
                if (tabId) {
                    tabs.push({ "_id": tabId, "label": tabId, "hidden": this.__returnFalse });
                } else {
                    pushMore = true;
                }
            }
        }
        if (pushMore) {
            tabs.push({ "_id": "", "label": "<i class=\"material-icons text\">more_horiz</i>", "hidden": this.__returnFalse });
        }
        if (tabs.length === 0) {
            tabs.push({ "_id": "", "label": "", "hidden": this.__returnFalse });
        }
        storeDesc.formTabs = tabs;
    }

    static prepareActions(storeDesc, checkExists) {
        var descs = [].concat(storeDesc.actions || [], storeDesc.storeActions || []);
        for (let actionDesc of descs) {
            if (!checkExists || actionDesc.hidden) {
                actionDesc.hidden = configHelpers.__getConditionFunction(actionDesc.hidden);
            }
            if (!checkExists || actionDesc.disabled) {
                actionDesc.disabled = configHelpers.__getConditionFunction(actionDesc.disabled);
            }
            if (!checkExists || actionDesc.formLabel) {
                actionDesc.formLabel = template.compile(actionDesc.formLabel || actionDesc.label || "");
            }
            if (!checkExists || actionDesc.label) {
                actionDesc.label = template.compile(actionDesc.label || "", true);
            }
            if (!checkExists || actionDesc.icon) {
                actionDesc.icon = template.compile(actionDesc.icon || "", true);
            }
        }
    }

    static prepareTableView(storeDesc) {
        if (storeDesc.props == null) {
            return;
        }
        //If there is no tableColumns in storeDesc, creating default one
        if (storeDesc.tableColumns == null) {
            storeDesc.tableColumns = [{ "prop": "name" }];
        }
        configHelpers.__prepareTableColumns(storeDesc.tableColumns, storeDesc);
    }

    static __prepareTableColumns(columns, storeDesc) {
        for (let i = columns.length - 1; i >= 0; i--) {
            var columnDesc = columns[i];
            if (typeof columnDesc === "string") {
                columnDesc = { "prop": columnDesc };
            }
            let propName = columnDesc.prop,
                propDesc = null;
            if (storeDesc != null && storeDesc.props != null && storeDesc.props[propName] != null) {
                propDesc = storeDesc.props[propName];
            }
            if (propDesc == null) {
                columns.splice(i, 1);
            } else {
                if (columnDesc.label) {
                    columnDesc.label = template.compile(columnDesc.label, true);
                }
                configHelpers.__prepareOptions(columnDesc);
                columns[i] = Object.assign({}, propDesc, columnDesc);
            }
        }
    }

    static prepareLabels(storeDesc) {
        if (storeDesc.labels == null) {
            return;
        }
        for (let labelDesc of storeDesc.labels) {
            labelDesc.hidden = configHelpers.__getConditionFunction(labelDesc.hidden);
            labelDesc.text = template.compile(labelDesc.text || "", true);
            labelDesc.color = template.compile(labelDesc.color || "", true);
            labelDesc.icon = template.compile(labelDesc.icon || "");
        }
    }

    static prepareProps(storeDesc, storeName, config) {
        if (storeDesc.props == null) {
            return;
        }
        for (let propName of Object.keys(storeDesc.props)) {
            let propDesc = storeDesc.props[propName];
            if (propDesc.props != null) {
                configHelpers.prepareProps(propDesc, storeName);
            }
            //Property prepairing
            propDesc.hidden = configHelpers.__getConditionFunction(propDesc.hidden);
            propDesc.disabled = configHelpers.__getConditionFunction(propDesc.disabled);

            propDesc.label = template.compile(propDesc.label || (propDesc.display === displayTypes.headerInput ? "" : propName));
            if (propDesc.placeholder) {
                propDesc.placeholder = template.compile(propDesc.placeholder || "");
            }

            if (propDesc.tooltip) {
                propDesc.tooltip = template.compile(propDesc.tooltip || "", true);
            }

            for (let validatorName of Object.keys(baseValidators)) {
                propDesc[validatorName] = validation.getValidator(propDesc, validatorName, i18n.getForStore(storeName));
            }

            if (propDesc.tableColumns && propDesc.store && config) {
                configHelpers.__prepareTableColumns(propDesc.tableColumns, config[propDesc.store]);
            }

            if (propDesc.display === displayTypes.react) {
                var req = require.context("../components", true, /.+\.js(x)?$/);
                let loadComponent = new Function("React", "i18n", "moment", "require", propDesc.loadComponent);
                propDesc.$component = loadComponent(React, i18n, moment, req);
            }

            configHelpers.__prepareOptions(propDesc);

            if (propDesc.actions) {
                configHelpers.prepareActions(propDesc, true);
            }
        }
        if (storeDesc.filters != null) {
            configHelpers.prepareProps({ "props": storeDesc.filters }, storeName);
        }
        for (let actionDesc of (storeDesc.actions || [])) {
            if (actionDesc.props != null) {
                configHelpers.prepareProps(actionDesc, storeName);
            }
        }
        for (let actionDesc of (storeDesc.storeActions || [])) {
            if (actionDesc.props != null) {
                configHelpers.prepareProps(actionDesc, storeName);
            }
        }
    }

    static __prepareOptions(optionsWrapper) {
        if (Array.isArray(optionsWrapper.options)) {
            for (var i = 0; i < optionsWrapper.options.length; i++) {
                if (typeof optionsWrapper.options[i] === "string") {
                    optionsWrapper.options[i] = {
                        "value": optionsWrapper.options[i],
                        "label": optionsWrapper.options[i],
                    };
                }
                let option = optionsWrapper.options[i];
                option.label = template.compile(option.label || "");
            }
        }
    }

    static __returnFalse() {
        return false;
    }

    static __getConditionFunction(script) {
        if (!script) {
            return configHelpers.__returnFalse;
        }
        if (typeof script !== "string") {
            script = JSON.stringify(script);
        }
        return new Function("$user", "$item", "$baseItem", "$item = $item || {}; return " + script + ";");
    }
}