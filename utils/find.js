/**
 * Created by kib357 on 05.03.2015.
 */

var _getItemIndexById = function (items, id, idProperty, forIn) {
        if (typeof id === "undefined") {
            return -1;
        }
        if (forIn) {
            for (let i in items) {
                if (items[i] != null && items[i][idProperty || "_id"] === id) {
                    return i;
                }
            }
        } else {
            for (let i = 0; i < items.length; i++) {
                if (items[i] != null && items[i][idProperty || "_id"] === id) {
                    return i;
                }
            }
        }
        return -1;
    },
    _getItemById = function (items, id, idProperty, forIn) {
        if (forIn) {
            for (let i in items) {
                if (items[i] != null && items[i][idProperty || "_id"] === id) {
                    return items[i];
                }
            }
        } else {
            for (let i = 0; i < items.length; i++) {
                if (items[i] != null && items[i][idProperty || "_id"] === id) {
                    return items[i];
                }
            }
        }
        return null;
    },
    _treeItemById = function (items, id, nodesFieldName, idProperty, res) {
        if (typeof res !== "undefined") {
            return res;
        }
        if (typeof items === "undefined") {
            return null;
        }
        items.forEach(function (item) {
            if (item[idProperty || "_id"] == id) {
                res = item;
                return res;
            }
            if (typeof item[nodesFieldName || "nodes"] !== "undefined" && item[nodesFieldName || "nodes"].length > 0) {
                res = _treeItemById(item[nodesFieldName || "nodes"], id, nodesFieldName, idProperty, res);
            }
        });
        return res;
    },
    _escapeRegExp = function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },
    _getProperty = function (obj, prop) {
        if (obj == null) {
            return null;
        }
        if (!prop) {
            return obj;
        }
        var reg = /^(.+)\[(\d+)\]$/;
        var _index = prop.indexOf(".");
        var subProp = _index > -1 ? prop.substring(0, _index) : prop;
        var matches = reg.exec(subProp);
        if (matches) {
            if (obj[matches[1]] == null) {
                return null;
            }
            return _getProperty(obj[matches[1]][matches[2]], (_index > -1 ? prop.substr(_index + 1) : null));
        } else {
            return _getProperty(obj[subProp], (_index > -1 ? prop.substr(_index + 1) : null));
        }
    },
    _getPropertyValue = function (property, dataMap) {
        if (dataMap == null || typeof dataMap.get !== "function") {
            dataMap = new Map([["", dataMap]]);
        }
        let data = dataMap.get("");
        let propertyLink = property.match(/^\$\w+\./);
        if (propertyLink != null) {
            property = property.replace(propertyLink[0], "");
            data = dataMap.get(propertyLink[0].slice(0, -1));
        }
        return _getProperty(data, property);
    },
    _abbr = function (name) {
        var nameArray = name.split(" ");
        return nameArray.length > 1 ? nameArray[0][0] + nameArray[1][0] : name.substr(0, 2);
    },
    _getParameterByName = function (name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

module.exports = {
    indexById: _getItemIndexById,
    index: _getItemIndexById,
    itemById: _getItemById,
    item: _getItemById,
    treeItemById: _treeItemById,
    escapeRegExp: _escapeRegExp,
    property: _getProperty,
    propertyValue: _getPropertyValue,
    abbr: _abbr,
    urlParam: _getParameterByName,
};