/**
 * Created by kib357 on 22/01/16.
 */

export default class mask {
    constructor(mask, digit, alphabetical, anySymbol) {
        this.mask = mask;
        this.digit = digit || "|";
        this.alphabetical = alphabetical || "§";
        this.anySymbol = anySymbol || "~";
    }

    maskValue(val) {
        var res = '', value = val || '';
        var valueIndex = 0;
        for (var i = 0; i < this.mask.length; i++) {
            var regText = '';
            switch (this.mask[i]) {
                case this.digit:
                    regText = '([0-9])';
                    break;
                case this.alphabetical:
                    regText = '([A-Za-z])';
                    break;
                case this.anySymbol:
                    regText = '([A-Za-z0-9])';
                    break;
            }
            if (regText) {
                if (!value[valueIndex] || value[valueIndex].match(new RegExp(regText)) === null) {
                    //console.log("masked: ", res);
                    return res;
                }
                res += value[valueIndex];
                valueIndex++;
            } else {
                res += this.mask[i];
            }
        }
        //console.log("masked: ", res);
        return res;
    }

    unmaskVlaue(val) {
        let res = '';
        for (var i = 0; i < val.length; i++) {
            switch (this.mask[i]) {
                case this.digit:
                case this.alphabetical:
                case this.anySymbol:
                    res += val[i];
                    break;
            }
        }
        //console.log("unmasked: ", res);
        return res;
    }

    isValid(value) {
        let masked = this.maskValue(value);
        return masked.length === 0 || masked.length === this.mask.length;
    }
}