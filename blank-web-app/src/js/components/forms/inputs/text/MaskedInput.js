/**
 * Created by kib357 on 24/05/15.
 */

import React from 'react';
import find from 'utils/find';
import {iso8601} from 'constants';
import Mask from 'mask';
import moment from 'moment';

var MaskedInput = React.createClass({
        propTypes: {
            mask: React.PropTypes.string.isRequired
        },
        getDefaultProps: function () {
            return {
                "digit": "|",
                "alphabetical": "§",
                "any": "~",
                "emptySymbol": "_"
            };
        },
        getInitialState: function () {
            var state = {};
            var value = this.props.value;
            if (this.props.plugin === "date" && iso8601.test(this.props.value)) {
                value = (moment(value).format("YYYYMMDD"));
            }
            state.modelValue = value;
            state.maskProcessor = new Mask(this.props.mask, this.props.digit, this.props.alphabetical, this.props.any);
            state.value = state.maskProcessor.maskValue(value);
            state.placeHolder = this.getPlaceHolder(state.value);
            return state;
        },
        inputHandler: function (e) {
            let value = e.target.value,
                mask = this.props.mask,
                res = '';

            if (value.length === (this.state.value.length - 1)) {
                //Backspace;
                for (let i = value.length; i >= 0; i--) {
                    if (mask[i] === this.props.digit || mask[i] === this.props.alphabetical || mask[i] === this.props.any) {
                        break;
                    }
                    value = value.substring(0, value.length - 1);
                }
            }

            for (let i = 0; i < mask.length; i++) {
                let re;
                switch (mask[i]) {
                    case this.props.digit:
                        re = '[0-9]';
                        break;
                    case this.props.alphabetical:
                        re = '[A-Za-z]';
                        break;
                    case this.props.any:
                        re = '[A-Za-z0-9]';
                        break;
                    default:
                        re = find.escapeRegExp(mask[i]);
                        if (value[0] !== mask[i]) {
                            value = mask[i] + value;
                        }
                        break
                }
                let index = value.search(re);
                if (index >= 0) {
                    res += value[index];
                    value = value.slice(index + 1);
                } else {
                    break;
                }

            }
            //console.log("RES: ", res);
            res = this.state.maskProcessor.unmaskVlaue(res);
            this.props.onChange(res);
        },
        getPlaceHolder: function (maskedValue) {
            var placeHolderReg = new RegExp(find.escapeRegExp(this.props.digit) + '|' +
                find.escapeRegExp(this.props.alphabetical) + '|' +
                find.escapeRegExp(this.props.any), 'g');
            var placeHolder = this.props.mask.replace(placeHolderReg, this.props.emptySymbol);
            placeHolder = maskedValue + placeHolder.substring(maskedValue.length);
            return placeHolder;
        },
        componentWillReceiveProps: function (nextProps) {
            var value = nextProps.value;
            if (this.props.plugin === "date" && iso8601.test(nextProps.value)) {
                value = (moment(value).format("YYYYMMDD"));
            }
            var newValue = this.state.maskProcessor.maskValue(value);
            this.setState({
                "modelValue": value,
                "value": newValue,
                "placeHolder": this.getPlaceHolder(newValue),
                "caret": this.refs.input.selectionStart
            });
        },
        componentDidUpdate: function (prevProps, prevState) {
            if (prevProps.value !== this.props.value) {
                //Place caret
                let caret = this.state.caret, mask = this.props.mask;
                if (caret > 0 && caret < mask.length) {
                    for (let i = caret; i < mask.length; i++) {
                        if (mask[i] === this.props.digit || mask[i] === this.props.alphabetical || mask[i] === this.props.any) {
                            break;
                        }
                        caret = i + 1;
                    }
                }
                this.refs.input.selectionStart = caret;
                this.refs.input.selectionEnd = caret;
            }
        },
        render: function () {
            var isInvalid = ((this.state.modelValue && this.state.modelValue.length > 0) || this.props.required)
                && this.state.value.length !== this.props.mask.length;
            //var errorText = isInvalid ? i18n.get('errors.invalidPattern') : "";
            //if (isInvalid && this.props.required) {
            //    errorText = i18n.get('errors.requiredField');
            //}
            var containerClass = "masked-input" +
                (this.props.small ? ' sm' : '') +
                (this.props.disabled ? ' disabled' : '');
            var symbols = [];
            var mask = this.props.mask, placeHolder = this.state.placeHolder;
            for (var i = 0; i < placeHolder.length; i++) {
                switch (mask[i]) {
                    case this.props.digit:
                    case this.props.alphabetical:
                    case this.props.any:
                        var value = placeHolder[i].replace(' ', '&ensp;');
                        symbols.push((
                            <span key={"symbol-" + i}
                                  dangerouslySetInnerHTML={{__html: value}}/>));
                        break;
                    default:
                        symbols.push((<span key={"symbol-" + i}
                                            className={"muted" + (i < this.state.value.length ? ' x2' : '')}>
                            {placeHolder[i]}
                        </span>));
                        break;
                }
            }
            return (
                <div className={containerClass}>
                    <div className="mask-view">
                        {symbols}
                    </div>
                    <input type="text"
                           ref="input"
                           className={"form-control" + (this.props.small ? ' input-sm' : '')}
                           value={this.state.value}
                           onChange={this.inputHandler}
                           onFocus={this.props.onFocus}
                           onBlur={this.props.onBlur}
                           required={this.props.required}
                           pattern={isInvalid ? '(?!.*)' : '.*'}
                           disabled={this.props.disabled}/>
                </div>
            )
                ;
        }
    })
    ;

export default MaskedInput;