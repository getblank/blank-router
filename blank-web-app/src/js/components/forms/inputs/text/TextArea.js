/**
 * Created by kib357 on 26/08/15.
 */

import React from 'react';

class TextArea extends React.Component {
    handleChange(e) {
        var input = e.target;
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(input.value);
        }
    }

    componentDidMount() {
        this.countRows();
    }

    componentDidUpdate(prevProps, prevState) {
        this.countRows();
    }

    render() {
        return (
            <textarea
                id={this.props.id}
                ref="input"
                className={this.props.className}
                placeholder={this.props.placeholder}
                disabled={this.props.disabled}
                minLength={this.props.minLength}
                maxLength={this.props.maxLength}
                onChange={this.handleChange.bind(this)}
                onFocus={this.props.onFocus}
                onBlur={this.props.onBlur}
                required={this.props.required}
                onKeyDown={this.props.onKeyDown}
                onKeyUp={this.props.onKeyUp}
                placeholder={this.props.placeholder}
                value={this.props.value}/>
        );
    }

    countRows() {
        var input = this.refs.input;
        input.rows = 1;
        var rows = Math.ceil((input.scrollHeight - this.props.basePadding) / this.props.baseLineHeight);
        rows = Math.max(rows, 1);
        rows = Math.min(rows, 10);
        input.rows = rows;
    }
}

TextArea.propTypes = {};
TextArea.defaultProps = {"baseLineHeight": 20, "basePadding": 12};

export default TextArea;