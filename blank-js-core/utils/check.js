/**
 * Created by kib357 on 22/05/15.
 */

import find from 'utils/find';
import template from 'template';

var _all = function (items, condition) {
        if (typeof condition !== 'function') {
            return false
        }
        for (var i = 0; i < items.length; i++) {
            if (!condition(items[i])) {
                return false;
            }
        }
        return true;
    },
    _any = function (items, condition) {
        if (typeof condition !== 'function') {
            return false
        }
        for (var i = 0; i < items.length; i++) {
            if (condition(items[i])) {
                return true;
            }
        }
        return false;
    },
    _conditions = function (conditions, dataMap, useOr) {
        var res = useOr ? false : true;
        if (!Array.isArray(conditions)) {
            return false;
        }
        for (var condition of conditions) {
            var propertyValue = find.property(dataMap, condition.property);
            var conditionValue = condition.value;
            if (typeof condition.value === 'string' && condition.value.indexOf('{') >= 0) {
                conditionValue = template.render(condition.value, dataMap);
            }

            if (condition.operator === "notContains" || condition.operator === "contains" ||
                condition.operator === "notContain" || condition.operator === "contain") {
                if (propertyValue && typeof propertyValue.toLowerCase === 'function') {
                    propertyValue = propertyValue.toLowerCase();
                }
                if (conditionValue && typeof conditionValue.toLowerCase === 'function') {
                    conditionValue = conditionValue.toLowerCase();
                }
            }
            var operator = condition.operator;
            if (typeof propertyValue === 'string' &&
                propertyValue[0] === '=' &&
                (operator === 'notContains' || operator === 'contains' || operator === 'notContain' || operator === 'contain')) {
                operator = '=';
                propertyValue = propertyValue.slice(1);
            }

            switch (operator) {
                case "notContains":
                    res = (propertyValue == null || typeof propertyValue.indexOf !== 'function' ||
                    propertyValue.indexOf(conditionValue) < 0);
                    break;
                case "contains":
                    res = (propertyValue != null && typeof propertyValue.indexOf === 'function' &&
                    propertyValue.indexOf(conditionValue) >= 0);
                    break;
                case "notContain":
                    res = (conditionValue == null || typeof conditionValue.indexOf !== 'function' ||
                    conditionValue.indexOf(propertyValue) < 0);
                    break;
                case "contain":
                    res = (conditionValue != null && typeof conditionValue.indexOf === 'function' &&
                    conditionValue.indexOf(propertyValue) >= 0);
                    break;
                case "=":
                case "==":
                    res = (propertyValue == conditionValue);
                    break;
                case "!=":
                    res = (propertyValue != conditionValue);
                    break;
                case ">=":
                    res = (propertyValue >= conditionValue);
                    break;
                case "<=":
                    res = (propertyValue <= conditionValue);
                    break;
                case ">":
                    res = (propertyValue > conditionValue);
                    break;
                case "<":
                    res = (propertyValue < conditionValue);
                    break;
                case "inRange":
                    if (Array.isArray(conditionValue) && conditionValue.length > 1) {
                        if (conditionValue[0] !== "" && propertyValue < conditionValue[0]) {
                            res = false;
                            break;
                        }
                        if (conditionValue[1] !== "" && propertyValue > conditionValue[1]) {
                            res = false;
                            break;
                        }
                        res = true;
                        break;
                    }
                    res = false;
                    break;
                default:
                    res = false;
            }
            if (useOr) {
                if (res === true) {
                    return res;
                }
            } else {
                if (res === false) {
                    return res;
                }
            }
        }
        return res;
    };

export default {
    all: _all,
    any: _any,
    conditions: _conditions
};