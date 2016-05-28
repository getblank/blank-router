/**
 * Created by kib357 on 05/11/15.
 */

import handlebars from "handlebars";
import moment from "moment";
import find from "utils/find";

handlebars.registerHelper("moment", function (context, block) {
    if (context && context.hash) {
        block = JSON.parse(JSON.stringify(context));
        context = undefined;
    }
    var date = moment(context);

    //// Reset the language back to default before doing anything else
    //date.lang('en');

    for (var i in block.hash) {
        if (date[i]) {
            date = date[i](block.hash[i]);
        } else {
            console.log("moment.js does not support \"" + i + "\"");
        }
    }
    return date;
});

handlebars.registerHelper("i18n", function (context, block) {
    let res = find.property(block.data.root.$i18n, context);
    return res;
});

handlebars.registerHelper("round", function (context, block) {
    return Math.round(context);
});

handlebars.registerHelper("toFixed", function (context, decimals, block) {
    return parseFloat(context).toFixed(decimals || 2);
});

handlebars.registerHelper("ifEquals", function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

handlebars.registerHelper("switch", function (value, options) {
    this._switch_value_ = value;
    var html = options.fn(this); // Process the body of the switch block
    delete this._switch_value_;
    return html;
});

handlebars.registerHelper("case", function (value, options) {
    if (value == this._switch_value_) {
        return options.fn(this);
    }
});

handlebars.registerHelper("or", function (value, options) {
    return value || options;
});

export default class TemplateEngine {
    static render(template, model, noEscape) {
        return handlebars.compile(template, { "noEscape": noEscape })(model);
    }

    static compile(template, noEscape) {
        return handlebars.compile(template, { "noEscape": noEscape });
    }
}