/**
 * Created by kib357 on 24/07/15.
 */

function processProperty(item, property, value) {
    if (typeof value === "object") {
        processObjectProperty(item, property, value);
        return;
    }
    if (!item.hasOwnProperty(property)) {
        item[property] = null;
    }

    //Boolean type
    if (value === false && item[property] == null) {
        delete item.$changedProps[property];
        return;
    }

    //Float type
    if (Number.isFinite(item[property])) {
        item[property] = item[property] + "";
    }

    //Other types
    if (item[property] !== value) {
        item.$changedProps[property] = value;
    } else {
        delete item.$changedProps[property];
    }
}

function isObjectPropChanged(original, changes) {
    if (original == null) {
        original = {};
    }
    if (changes == null) {
        changes = {};
    }
    original = changesProcessor.combineItem(original, true);
    changes = changesProcessor.combineItem(changes, true);
    for (let prop of Object.keys(changes)) {
        if (changes[prop] == null && !original.hasOwnProperty(prop)) {
            delete changes[prop];
        }
    }
    original = JSON.stringify(original);
    changes = JSON.stringify(changes);
    //console.log("L:", original);
    //console.log("R:", changes);
    //console.log(original === changes);
    return original === changes;
}

function processObjectProperty(item, property, value) {
    if (!item.hasOwnProperty(property)) {
        if (Array.isArray(value)) {
            item[property] = [];
        } else {
            item[property] = {};
        }
    }

    if (isObjectPropChanged(item[property], value)) {
        delete item.$changedProps[property];
    } else {
        item.$changedProps[property] = value;
    }
}

export default class changesProcessor {
    static handle(currentItem, properties, values) {
        var item = Object.assign({ "$changedProps": {} }, currentItem);
        if (Array.isArray(properties) && Array.isArray(values) && properties.length === values.length) {
            for (var i = 0; i < properties.length; i++) {
                processProperty(item, properties[i], values[i]);
            }
        } else {
            processProperty(item, properties, values);
        }
        //console.log(item);
        return item;
    }

    static combineItem(item, createCopy, noCleanUp) {
        if (typeof item !== "object" || item == null) {
            console.error("ChangeProcessor.combineItem must be called only with objects");
            return;
        }
        if (createCopy) {
            item = JSON.parse(JSON.stringify(item));
        }
        var res = Object.assign(item, item.$changedProps);
        for (let propName of Object.keys(item || {})) {
            let prop = item[propName];
            if (!noCleanUp && propName.indexOf("$") === 0) {
                delete item[propName];
                continue;
            }
            if (Array.isArray(prop)) {
                for (let i = 0; i < prop.length; i++) {
                    if (prop[i] != null && typeof prop[i] === "object") {
                        changesProcessor.combineItem(prop[i], false, noCleanUp);
                    }
                }
                continue;
            }
            if (prop != null && typeof prop === "object") {
                changesProcessor.combineItem(prop, false, noCleanUp);
            }
        }
        return res;
    }

    static canSave(item) {
        var disableSave =
            (item.$state && item.$state !== "new" && item.$state !== "ready" && item.$state !== "modified") ||
            (item.$state && item.$state !== "new" && item.$changedProps != null && Object.keys(item.$changedProps).length === 0);
        return !disableSave;
    }

    static canUndo(item) {
        var disableUndo = item.$state === "saving" || (item.$changedProps && Object.keys(item.$changedProps).length === 0);
        return !disableUndo;
    }
}