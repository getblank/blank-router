/**
 * Created by kib357 on 01/10/15.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Calendar from './Calendar.js';
import i18n from '../../../../stores/i18nStore.js';
import moment from 'moment';

class DateRange extends React.Component {
    constructor(props) {
        super(props);
        this.moment = this.props.utc ? moment.utc : moment;
        this.state = Object.assign({
            "format": moment.localeData().longDateFormat('L'),
            "startErrorText": '',
            "endErrorText": '',
            "index": 0,
            "isStartValid": true,
            "isEndValid": true,
            "opened": false,
            "showAtLeft": false,
        }, this.getStateFromProps());

        this.toggle = this.toggle.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleCalendarChange = this.handleCalendarChange.bind(this);
        this.handlePresetChange = this.handlePresetChange.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.setLimits = this.setLimits.bind(this);
        this.getShowDate = this.getShowDate.bind(this);
        this.checkPosition = this.checkPosition.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getStateFromProps(nextProps));
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.opened && prevState.opened !== this.state.opened) {
            this.refs.startInput.focus();
        }
        this.checkPosition();
    }

    componentDidMount() {
        this.checkPosition();
    }

    checkPosition() {
        let root = this.refs.root;
        if (root) {
            let {width} = document.body.getBoundingClientRect(),
                {left, right} = root.getBoundingClientRect();
            let showAtLeft = left > (width - right);
            if (showAtLeft !== this.state.showAtLeft) {
                this.setState({"showAtLeft": showAtLeft});
            }
        }
    }

    getStateFromProps(nextProps) {
        let defaultCalendars = 3;
        if (window.innerWidth < 1000) {
            defaultCalendars = 2;
        }
        if (window.innerWidth < 420) {
            defaultCalendars = 1;
        }
        let props = nextProps || this.props;
        let state = {
            "start": '',
            "startDate": null,
            "end": '',
            "endDate": null,
            "calendars": this.props.calendars || defaultCalendars,
            "years": this.props.years || 4
        };
        if (Array.isArray(props.value) && props.value.length === 2) {
            let start = this.moment(props.value[0]);
            let end = this.moment(props.value[1]);
            if (start.isValid()) {
                state.startDate = start;
                state.start = start.format('L');
            }
            if (end.isValid()) {
                state.endDate = end;
                state.end = end.format('L');
            }
        }
        state.showDate = this.getShowDate(state);
        return state;
    }

    getShowDate(useState) {
        var state = useState || this.state;
        var showDate = this.moment().subtract(Math.floor(state.calendars / 2), 'M');
        if (state.startDate != null && state.startDate.isBefore(showDate, 'month')) {
            showDate = this.moment(state.startDate);
        }
        showDate.startOf('month');
        return showDate;
    }

    setLimits(start, end, updateShowDate) {
        if (moment.isMoment(start) && start.isAfter(end)) {
            var tmp = this.moment(end);
            end = this.moment(start);
            start = this.moment(tmp);
        }
        var newState = {
            "startDate": start,
            "endDate": end
        };
        if (moment.isMoment(newState.startDate)) {
            newState.startDate.startOf('day');
            newState.start = newState.startDate.format('L');
        }
        if (moment.isMoment(newState.endDate)) {
            newState.endDate.endOf('day');
            newState.end = newState.endDate.format('L');
        }
        if (updateShowDate) {
            newState.showDate = this.getShowDate(Object.assign({}, this.state, newState));
        }
        this.setState(newState);
    }

    handleChange(e) {
        var limit = e.target.getAttribute('data-limit'), newState = {};
        let start = limit === 'start' ? e.target.value : this.state.start;
        let end = limit === 'end' ? e.target.value : this.state.end;
        newState[limit] = e.target.value;
        this.setState(newState, () => {
            let startDate = this.moment(start, this.state.format, true);
            let endDate = this.moment(end, this.state.format, true);
            this.setLimits(startDate.isValid() ? startDate : null, endDate.isValid() ? endDate : null);
        });
    }

    handlePresetChange(e) {
        var preset = e.target.getAttribute('data-preset');
        let start, end;
        switch (preset) {
            case 'today':
                start = this.moment().startOf('day');
                end = this.moment().endOf('day');
                break;
            case 'yesterday':
                start = this.moment().subtract(1, 'd').startOf('day');
                end = this.moment().subtract(1, 'd').endOf('day');
                break;
            case 'week':
                start = this.moment().subtract(1, 'w').add(1, 'days').startOf('day');
                end = this.moment().endOf('day');
                break;
            case 'month':
                start = this.moment().subtract(1, 'M').add(1, 'days').startOf('day');
                end = this.moment().endOf('day');
                break;
        }
        this.setLimits(start, end, true);
    }

    handleCalendarChange(value) {
        let start = null, end = null;
        let limit = !moment.isMoment(this.state.startDate) || moment.isMoment(this.state.endDate) ? 'start' : 'end';
        if (limit === 'start') {
            start = value;
            end = null;
        } else {
            start = this.state.startDate;
            end = value;
        }
        this.setLimits(start, end);
        var input = limit === 'start' ? this.refs.endInput : this.refs.startInput;
        input.focus();
    }

    increaseShowDate() {
        this.setState({"showDate": this.moment(this.state.showDate).add(1, 'months')});
    }

    decreaseShowDate() {
        this.setState({"showDate": this.moment(this.state.showDate).subtract(1, 'months')});
    }

    toggle(show) {
        if (this.props.disabled) {
            return;
        }
        var res = typeof show === "boolean" ? show : !this.state.opened;
        var newState = {"opened": res};
        if (res) {
            if (typeof this.props.onFocus === 'function') {
                this.props.onFocus();
            }
            newState.showDate = this.getShowDate();
        } else {
            if (typeof this.props.onBlur === 'function') {
                this.props.onBlur();
            }
        }
        this.setState(newState, this.manageListeners);
    }

    cancel(e) {
        e.preventDefault();
        this.setState(this.getStateFromProps(), this.toggle);
    }

    apply(e) {
        e.preventDefault();
        this.props.onChange([this.state.startDate, this.state.endDate]);
        this.toggle();
    }

    render() {
        var start = this.state.startDate, end = this.state.endDate;
        var tmpMonth = this.moment(this.state.showDate);
        var tmpYear = this.moment(this.state.showDate).subtract(Math.ceil(this.state.years / 2), 'years').startOf('year');
        var calendars = [], years = [];
        for (let i = 0; i < this.state.calendars; i++) {
            calendars.push(
                <div className="month" key={'m-' + i}>
                    <p>{tmpMonth.format('MMMM')}</p>
                    <Calendar onChange={this.handleCalendarChange}
                              show={this.moment(tmpMonth)}
                              selected={[this.state.startDate, this.state.endDate]}
                              hideHeader={true}
                              utc={this.props.utc}/>
                </div>
            );
            tmpMonth.add(1, 'months');
        }
        let lensWidth = 100 / this.state.years * (this.state.calendars / 12);
        for (let i = 0; i < this.state.years + 1; i++) {
            let style = {
                "minWidth": 100 / this.state.years + '%'
            };
            if (i === 0) {
                style.marginLeft = '-' + (100 / this.state.years / 12 * this.state.showDate.month() + (lensWidth / 2)).toFixed(2) + '%';
            }
            let selectedRange = null;
            if (start != null && end != null &&
                tmpYear.year() >= start.year() && tmpYear.year() <= end.year()) {
                let daysCount = tmpYear.isLeapYear() ? 366 : 365;
                let highlightStyle = {
                    "left": (start.year() === tmpYear.year() ? Math.floor(100 * (start.dayOfYear() - 1) / daysCount) : 0) + '%',
                    "right": (end.year() === tmpYear.year() ? Math.floor(100 * (daysCount - end.dayOfYear()) / daysCount) : 0) + '%'
                };
                selectedRange = (
                    <div className="highlight" style={highlightStyle}></div>
                )
            }
            years.push(
                <div className="year" key={'y-' + i} style={style}>
                    <p>{tmpYear.format('YYYY')}</p>
                    {selectedRange}
                </div>
            );
            tmpYear.add(1, 'years');
        }
        return (
            <div className="date-range" ref="root">
                <div className={"summary form-control" + (this.state.opened ? " opened" : "")} onClick={this.toggle}>
                    {Array.isArray(this.props.value) ?
                    this.moment(this.props.value[0]).format('L') + ' - ' + this.moment(this.props.value[1]).format('L') :
                        <span>&nbsp;</span>}
                    <i className="material-icons md-16 icon">event</i>
                </div>
                { this.state.opened ?
                    <div className={"pd-picker fixed" + (this.state.showAtLeft ? " left-side" : "")}>
                        <button type="button" className="btn-icon first last close" onClick={this.cancel.bind(this)}>
                            <i className="material-icons md-16 text">close</i>
                        </button>

                        <div className="header">
                            <div className="input-container">
                                <input type="text"
                                       className="form-control"
                                       data-limit="start"
                                       value={this.state.start}
                                       pattern={this.state.isStartValid ? '.*' : '(?!.*)'}
                                       onChange={this.handleChange}
                                       ref="startInput"/>
                                <span className="error">{this.state.startErrorText}</span>
                            </div>

                            <span>—</span>

                            <div className="input-container">
                                <input type="text"
                                       className="form-control"
                                       data-limit="end"
                                       value={this.state.end}
                                       pattern={this.state.isEndValid ? '.*' : '(?!.*)'}
                                       onChange={this.handleChange}
                                       ref="endInput"/>
                                <span className="error">{this.state.endErrorText}</span>
                            </div>

                            <div className="actions">
                                <button type="button" className="btn-flat"
                                        data-preset="today" onClick={this.handlePresetChange}>
                                    {i18n.get('common.today')}
                                </button>
                                <button type="button" className="btn-flat"
                                        data-preset="yesterday" onClick={this.handlePresetChange}>
                                    {i18n.get('common.yesterday')}
                                </button>
                                <button type="button" className="btn-flat"
                                        data-preset="week" onClick={this.handlePresetChange}>
                                    {i18n.get('common.week')}
                                </button>
                                <button type="button" className="btn-flat"
                                        data-preset="month" onClick={this.handlePresetChange}>
                                    {i18n.get('common.month')}
                                </button>
                            </div>
                        </div>
                        <div className="range">
                            <button type="button" className="btn-icon prev"
                                    onClick={this.decreaseShowDate.bind(this)}>
                                <i className="material-icons text md-16">chevron_left</i>
                            </button>
                            {years}
                            <button type="button" className="btn-icon next"
                                    onClick={this.increaseShowDate.bind(this)}>
                                <i className="material-icons text md-16">chevron_right</i>
                            </button>
                            <div className="lens" style={{"width": lensWidth + '%'}}></div>
                        </div>
                        {calendars}
                        <div className="footer">
                            <button type="button"
                                    className="btn-flat btn-accent"
                                    disabled={this.state.startDate == null || this.state.endDate == null}
                                    onClick={this.apply.bind(this)}>
                                {i18n.get('common.apply')}
                            </button>
                        </div>
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

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }
}

DateRange.propTypes = {};
DateRange.defaultProps = {};

export default DateRange;
