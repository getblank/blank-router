/**
 * Created by kib357 on 22/01/16.
 */

export default class copy {
    static arrayStructure(target, source, exclude) {
        if (!Array.isArray(target) || !Array.isArray(source)) {
            throw new TypeError('copy.arrayStructure cannot be called with not arrays');
        }

        for (let index = 0; index < source.length; index++) {
            if (typeof source[index] === 'object' && !Array.isArray(source[index])) {
                target[index] = {};
                copy.objectStructure(target[index], source[index], exclude);
                continue;
            }
            if (Array.isArray(source[index])) {
                target[index] = [];
                copy.arrayStructure(target[index], source[index], exclude);
                continue;
            }
            target[index] = null;
        }
        return target;
    }

    static objectStructure(target, source, exclude) {
        if (target == null || source == null) {
            throw new TypeError('copy.objectStructure cannot be called with null or undefined');
        }

        for (let key of Object.keys(source)) {
            if (exclude instanceof RegExp && exclude.test(key)) {
                continue;
            }
            if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = {};
                copy.objectStructure(target[key], source[key], exclude);
                continue;
            }
            if (Array.isArray(source[key])) {
                target[key] = [];
                copy.arrayStructure(target[key], source[key], exclude);
                continue;
            }
            target[key] = null;
        }
        return target;
    }
}
