/**
 * Created by kib357 on 28/10/15.
 */

import React from 'react';
import classnames from 'classnames';

class CheckBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.onInputChange = this.onInputChange.bind(this);
        this.onInputFocus = this.onInputFocus.bind(this);
        this.onInputBlur = this.onInputBlur.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    onInputChange(e) {
        if (!this.props.disabled) {
            this.props.onChange(e.target.checked);
        }
    }

    onInputFocus() {
        this.setState({"focused": true});
        if (typeof this.props.onFocus === 'function') {
            this.props.onFocus();
        }
    }

    onInputBlur() {
        this.setState({"focused": false});
        if (typeof this.props.onBlur === 'function') {
            this.props.onBlur();
        }
    }

    onChange() {
        if (!this.props.disabled) {
            this.props.onChange(!this.props.checked);
        }
    }

    render() {
        let cn = classnames("material-icons text checkbox", {
            "disabled": this.props.disabled,
            "focused": this.state.focused,
            "invalid": this.props.required && !this.props.checked
        });
        return (
            <span>
                <input type="checkbox"
                       id={this.props.id}
                       required={this.props.required}
                       onChange={this.onInputChange}
                       onFocus={this.onInputFocus}
                       onBlur={this.onInputBlur}
                       checked={this.props.checked}/>
                <i className={cn}
                   onClick={this.onChange}>
                    {this.props.checked ? "check_box" : "check_box_outline_blank"}
                </i>
            </span>
        );
    }
}

CheckBox.propTypes = {};
CheckBox.defaultProps = {};

export default CheckBox;
