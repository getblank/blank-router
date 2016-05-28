/**
 * Created by kib357 on 09/10/15.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import randomColors from '../../../../utils/colors.js';
import classNames from 'classnames';

var colors = new randomColors();

class ColorPicker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.isValid = true;
        this.errorText = '';
        this.state.opened = false;
        this.toggle = this.toggle.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    handleChange(e) {
        if (!this.props.disableCustomInput) {
            this.props.onChange(e.target.value);
        }
    }

    handleColorChange(value) {
        this.props.onChange(value);
    }

    toggle(show) {
        if (this.props.disabled) {
            return;
        }
        var res = show == null ? !this.state.opened : show;
        this.setState({"opened": res}, this.manageListeners);
    }

    focusInput() {
        this.refs.input.focus();
    }

    render() {
        var usedColors = this.props.colors || colors.getAll();
        let colorControls = usedColors.map(c =>
                <div key={c}
                     className="color-item"
                     onClick={this.handleColorChange.bind(this, c)}
                     style={{"backgroundColor": c}}>
                </div>
        );
        let cn = classNames("color-picker", {
            "pointer": this.props.disableCustomInput
        });
        return (
            <div className={cn} ref="root">
                <input ref="input"
                       type="text"
                       className={this.props.className}
                       value={this.props.value}
                       onChange={this.handleChange}
                       onFocus={this.props.onFocus}
                       onBlur={this.props.onBlur}
                       disabled={this.props.disabled}
                       onFocus={this.toggle.bind(this, true)}
                       pattern={"(#([0-9a-fA-F]{3}){1,2}|(rgba|hsla)\\(\\d{1,3}%?(,\\s?\\d{1,3}%?){2},\\s?(1|0?\\.\\d+)\\)|(rgb|hsl)\\(\\d{1,3}%?(,\\s?\\d{1,3}%?){2}\\))"}/>
                <span className="error">{this.state.errorText}</span>

                <div className="preview-back"></div>
                <div className="preview"
                     style={{"backgroundColor": this.props.value}}
                     onClick={this.focusInput.bind(this)}>
                </div>
                { this.state.opened ?
                    <div className="pd-picker">
                        {colorControls}
                    </div> : null }
            </div>
        );
    }

    handleDocumentClick(e) {
        var rootRef = this.refs['root'];
        if (rootRef == null) {
            this.toggle();
            return;
        }
        var root = ReactDOM.findDOMNode(rootRef);
        if (e.target === root || root.contains(e.target)) {
            return;
        }
        this.toggle();
    }

    manageListeners() {
        if (this.state.opened) {
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }
}

ColorPicker.propTypes = {};
ColorPicker.defaultProps = {};

export default ColorPicker;
