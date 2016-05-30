/**
 * Created by kib357 on 29/10/15.
 */

import React from 'react';

class Radio extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e) {
        this.props.onChange(e.target.value);
    }

    render() {
        var options = this.props.options.map((option, index) => {
            return (
                <div key={option.value + '-' + index} className="option">
                    <input type="radio"
                           id={this.props.name + '-' + option.value + '-' + index}
                           checked={option.value == this.props.value}
                           required={this.props.required}
                           value={option.value}
                           onChange={this.handleChange}
                           onFocus={this.props.onFocus}
                           onBlur={this.props.onBlur}
                           name={this.props.name}/>
                    <label htmlFor={this.props.name + '-' + option.value + '-' + index}>{option.label}</label>
                </div>
            )
        });
        return (
            <div className="radio-control m-t-14">{options}</div>
        );
    }
}

Radio.propTypes = {};
Radio.defaultProps = {};

export default Radio;
