/**
 * Created by kib357 on 25/09/15.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Calendar from './Calendar.js';
import i18n from '../../../../stores/i18nStore.js';
import moment from 'moment';

class DatePicker extends React.Component {
    constructor(props) {
        super(props);
        this.moment = this.props.utc ? moment.utc : moment;
        this.state = {};
        this.state.format = moment.localeData().longDateFormat('L');
        this.state.isValid = true;
        this.errorText = '';
        this.state.opened = false;
        this.state.value = this.moment(this.props.value).isValid() ? this.moment(this.props.value).format('L') : '';
        this.toggle = this.toggle.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleCalendarChange = this.handleCalendarChange.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (JSON.stringify(this.props.value) !== JSON.stringify(nextProps.value)) {
            this.setState({"value": this.moment(nextProps.value).isValid() ? this.moment(nextProps.value).format('L') : ''});
        }
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    componentWillUpdate(nextProps, nextState) {
        var isValid = this.moment(nextState.value, this.state.format, true).isValid() || (!nextProps.required && nextState.value.length === 0);
        var errorText = '';
        if (!isValid) {
            errorText = i18n.get('common.datePattern');
            if (nextProps.required && nextState.value.length === 0) {
                errorText = i18n.get('errors.requiredField');
            }
        }
        if (nextState.isValid !== isValid || nextState.errorText !== errorText) {
            this.setState({"isValid": isValid, "errorText": errorText});
        }
    }

    handleChange(e) {
        var newValue = e.target.value;
        this.setState({"value": newValue}, () => {
            var m = this.moment(newValue, this.state.format, true);
            var res = this.props.value;
            if (newValue.length === 0) {
                res = null;
            }
            if (m.isValid()) {
                res = m.toISOString();
            }
            this.props.onChange(res);
        });
    }

    handleCalendarChange(value) {
        this.props.onChange(value.toISOString());
        this.toggle(false);
    }

    toggle(show) {
        if (this.props.disabled) {
            return;
        }
        var res = typeof show === "boolean" ? show : !this.state.opened;
        if (res) {
            if (typeof this.props.onFocus === 'function') {
                this.props.onFocus();
            }
        } else {
            if (typeof this.props.onBlur === 'function') {
                this.props.onBlur();
            }
        }
        this.setState({"opened": res}, this.manageListeners);
    }

    render() {
        return (
            <div className="date-picker" ref="root">
                <input type="text"
                       className={this.props.className}
                       value={this.state.value}
                       onChange={this.handleChange}
                       onFocus={this.toggle.bind(this, true)}
                       pattern={this.state.isValid ? '.*' : '(?!.*)'}
                       disabled={this.props.disabled}
                       placeholder={i18n.get('common.datePattern')}/>
                <span className="error">{this.state.errorText}</span>
                { this.state.opened ?
                    <div className="pd-picker">
                        <Calendar onChange={this.handleCalendarChange}
                                  utc={this.props.utc}
                                  selected={this.moment(this.state.value, this.state.format, true)}/>
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

DatePicker.propTypes = {};
DatePicker.defaultProps = {};

export default DatePicker;
