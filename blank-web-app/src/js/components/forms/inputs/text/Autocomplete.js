/**
 * Created by kib357 on 04/02/16.
 */

import React from 'react';
import ReactDOM from 'react-dom';

const splitChars = [' ', ',', ';'];

class Autocomplete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.opened = false;
        this.state.i = 0;
        this.state.options = this.getOptions(props);
        this.toggle = this.toggle.bind(this);
        this.open = this.open.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    getOptions(props) {
        props = props || this.props;
        let index = 0,
            value = (props.value != null ? props.value.toString() : '');
        for (let char of splitChars) {
            //console.log(value);
            let i = value.lastIndexOf(char);
            if (i > 0) {
                index = Math.max(index, i + 1);
            }
        }
        value = value.slice(index);
        let res = props.options.filter(o => !props.value || o.label.indexOf(value) === 0);
        return res;
    }

    componentWillReceiveProps(nextProps) {
        let options = [];
        if (this.state.opened) {
            options = this.getOptions(nextProps);
        }
        this.setState({ "options": options, "i": 0 });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.i !== this.state.i) {
            let root = this.refs.root;
            if (root) {
                let elements = root.getElementsByClassName("option selected");
                if (elements && elements.length > 0) {
                    let selected = elements[0];
                    let parent = selected.parentElement;
                    if (parent.scrollTop >= selected.offsetTop ||
                        selected.offsetTop >= (parent.scrollTop + parent.offsetHeight)) {
                            if (typeof selected.scrollIntoView === 'function') {
                                selected.scrollIntoView(true);
                            }
                    }
                }
            }
        }
    }

    handleSelect(value) {
        this.addValue(value);
    }

    handleChange(e) {
        if (!this.state.opened) {
            this.toggle(true);
        }
        this.props.onChange(e.target.value);
    }

    handleBlur(e) {
        clearTimeout(this.state.timer);
        let timer = setTimeout(() => {
            this.toggle(false);
        }, 100);
        this.setState({ "timer": timer });
    }

    onKeyDown(event) {
        let i;
        //console.log(event);
        switch (event.code) {
            case 'ArrowDown':
            case 'ArrowUp':
                if (this.state.options.length > 0) {
                    event.preventDefault();
                    i = this.state.i + (event.code === 'ArrowDown' ? 1 : -1);
                    if (i > this.state.options.length) {
                        i = 1;
                    }
                    if (i < 1) {
                        i = this.state.options.length;
                    }
                    this.setState({ "i": i });
                }
                break;
            case 'Enter':
                if (this.state.i > 0) {
                    event.preventDefault();
                    this.addValue(this.state.options[this.state.i - 1].value);
                    this.toggle();
                }
                break;
            case 'Escape':
                this.toggle();
                break;
        }
    }

    addValue(newValue) {
        let value = '';
        for (let char of splitChars) {
            if (this.props.value && this.props.value[this.props.value.length - 1] === char) {
                value += this.props.value;
                break;
            }
        }
        this.props.onChange(value + newValue);
    }

    render() {
        let options = [];
        if (this.state.opened) {
            for (let i = 0; i < this.state.options.length; i++) {
                let option = this.state.options[i];
                options.push(
                    <div className={"option" + (i + 1 === this.state.i ? " selected" : "") }
                        key={i}
                        onClick={this.handleSelect.bind(this, option.value) }>
                        <span>
                            {option.label}
                        </span>
                    </div>
                );
            }
        }
        return (
            <div className="autocomplete" ref="root">
                <input
                    ref="input"
                    autoComplete="false"
                    onChange={this.handleChange}
                    value={this.props.value}
                    onFocus={this.toggle}
                    onBlur={this.handleBlur}
                    className="form-control"
                    placeholder={this.props.placeholder}
                    disabled={this.props.disabled}
                    type="text"/>
                { this.state.opened && <div className="pd-picker">{options}</div> }
            </div>
        );
    }

    open() {
        this.toggle(true);
    }

    toggle(show) {
        if (this.props.disabled) {
            return;
        }
        let newState = { "i": 0 };
        var res = typeof show === "boolean" ? show : !this.state.opened;
        newState.opened = res;
        if (res) {
            newState.options = this.getOptions();
            if (typeof this.props.onFocus === 'function') {
                this.props.onFocus();
            }
        } else {
            if (typeof this.props.onBlur === 'function') {
                this.props.onBlur();
            }
        }
        this.setState(newState, this.manageListeners);
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

    componentWillUnmount() {
        clearTimeout(this.state.timer);
        this.refs.input.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('click', this.handleDocumentClick);
    }

    manageListeners() {
        if (this.state.opened) {
            this.refs.input.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            this.refs.input.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }
}

Autocomplete.propTypes = {};
Autocomplete.defaultProps = {};

export default Autocomplete;
