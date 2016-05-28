module.exports = function Enum() {
    let res = {};
    for (let i = 0; i < arguments.length; i++) {
        res[arguments[i]] = arguments[i];
    }
    return res;
};