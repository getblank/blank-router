/**
 * Created by kib357 on 08/02/16.
 */

import React from 'react';

class NumberRange extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    isValidValue(v) {
        return v.length === 0 || (!isNaN(parseFloat(v)) && isFinite(v));
    }

    handleChange(e) {
        let from = this.refs.from.value.replace(',', '.'),
            to = this.refs.to.value.replace(',', '.');
        if (!this.isValidValue(from) || !this.isValidValue(to)) {
            return;
        }
        if (from.length === 0 && to.length === 0) {
            console.log("nullllll");
            this.props.onChange(null);
            return;
        }
        this.props.onChange([from, to]);
    }

    render() {
        let from, to;
        if (Array.isArray(this.props.value)) {
            from = this.props.value[0];
            to = this.props.value[1];
        }
        return (
            <div className="flex align-center">
                <input type="text"
                       ref="from"
                       value={from}
                       onChange={this.handleChange.bind(this)}
                       className="form-control"
                       disabled={this.props.disabled}
                       style={{"textAlign": "right", "overflow": "hidden"} /*overflow:hidden fixes FF bug*/}/>
                <span>&nbsp;&mdash;&nbsp;</span>
                <input type="text"
                       ref="to"
                       value={to}
                       onChange={this.handleChange.bind(this)}
                       className="form-control"
                       disabled={this.props.disabled}
                       style={{"overflow": "hidden"}}/>
            </div>
        );
    }
}

NumberRange.propTypes = {};
NumberRange.defaultProps = {};

export default NumberRange;
