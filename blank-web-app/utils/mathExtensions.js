/**
 * Created by kib357 on 20/03/15.
 */

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

var round10 = function (value, exp) {
    return decimalAdjust('round', value, exp);
};

var floor10 = function (value, exp) {
    return decimalAdjust('floor', value, exp);
};

var ceil10 = function (value, exp) {
    return decimalAdjust('ceil', value, exp);
};

module.exports = {
    "round10": round10,
    "floor10": floor10,
    "ceil10": ceil10
}