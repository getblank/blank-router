/**
 * Created by kib357 on 24/09/15.
 */

import find from "utils/find";

var ESCAPE_LOOKUP = {
    "&": "&amp;",
    ">": "&gt;",
    "<": "&lt;",
    "\"": "&quot;",
    "'": "&#x27;",
};

var ESCAPE_REGEX = /[&><"']/g;

function escaper(match) {
    return ESCAPE_LOOKUP[match];
}

export default class mustaches {
    static shave(text, dataMap, noSanitize) {
        text = text || "";
        var matches = text.match(/{.+?}/g);
        for (let match of (matches || [])) {
            var property = match.substring(1, match.length - 1);
            var value = find.propertyValue(property, dataMap);
            if (value == null) {
                value = "?";
            }
            if (!noSanitize) {
                value = ("" + value).replace(ESCAPE_REGEX, escaper);
            }
            text = text.replace(new RegExp(find.escapeRegExp(match)), value);
        }
        return text;
    }
}