/**
 * Created by kib357 on 25/09/15.
 */

import React from 'react';
import moment from 'moment';
import classNames from 'classnames';

class Calendar extends React.Component {
    constructor(props) {
        super(props);
        this.moment = this.props.utc ? moment.utc : moment;
        this.state = Object.assign({"year": this.moment().year(), "month": this.moment().month()}, this.getStateFromProps());
        this.handleSelect = this.handleSelect.bind(this);
        this.handleMonthChange = this.handleMonthChange.bind(this);
        this.handleYearChange = this.handleYearChange.bind(this);
        this.getWeekDays = this.getWeekDays.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getStateFromProps(nextProps));
    }

    getStateFromProps(nextProps) {
        var props = nextProps || this.props;
        var res = {};
        res.selected = moment.isMoment(props.selected) && props.selected.isValid() ? props.selected : null;
        if (Array.isArray(props.selected) && props.selected.length === 2) {
            res.selected = props.selected;
        }
        if (moment.isMoment(res.selected)) {
            res.year = res.selected.year();
            res.month = res.selected.month();
        }
        if (moment.isMoment(props.show) && props.show.isValid()) {
            res.year = props.show.year();
            res.month = props.show.month();
        }
        return res;
    }

    handleSelect(e) {
        var date = e.target.getAttribute('data-date');
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(this.moment(date));
        }
    }

    handleMonthChange(e) {
        this.setState({"month": parseInt(e.target.value)});
    }

    handleYearChange(e) {
        this.setState({"year": parseInt(e.target.value)});
    }

    getWeekDays() {
        return [1, 2, 3, 4, 5, 6, 7].map(d => (
            <div className={"week-day" + (d === 7 ? " last" : "")}
                 key={'dw-' + d}>
                {this.moment().isoWeekday(d).format('dd')}
            </div>
        ));
    }

    getMonthOptions() {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
            <option value={m} key={"m-" + m}>{this.moment().month(m).format('MMMM')}</option>
        ));
    }

    getYearOptions() {
        var diff = 10;
        var res = [];
        for (let i = Math.max(this.state.year - diff, 0); i < this.state.year + diff; i++) {
            res.push((
                <option value={i} key={"y-" + i}>{i}</option>
            ));
        }
        return res;
    }

    render() {
        var refStart = this.moment([this.state.year, this.state.month]);
        var start = this.moment(refStart);
        var month = start.month();
        start.isoWeekday(1);
        var controls = [];
        var week = null;
        for (let i = 0; i < 42; i++) {
            if (i % 7 === 0) {
                week = []
            }
            var selectable = start.month() === month;
            var cn = classNames("calendar-day", {
                "mute": start.month() !== month,
                "holiday": start.isoWeekday() > 5,
                "today": start.isSame(this.moment(), 'day'),
                "range-start": Array.isArray(this.state.selected) &&
                start.isSame(this.state.selected[0], 'day'),
                "in-range": Array.isArray(this.state.selected) &&
                this.state.selected[0] != null &&
                this.state.selected[1] != null &&
                (start.isBetween(this.state.selected[0], this.state.selected[1]) ||
                start.isSame(this.state.selected[0]) ||
                start.isSame(this.state.selected[1])),
                "selected": start.isSame(this.state.selected, 'day'),
                "selectable": selectable,
                "last": start.isoWeekday() === 7
            });
            week.push(
                <div className={cn}
                     data-date={start.toISOString()}
                     onClick={selectable ? this.handleSelect : null}
                     key={'d-' + i % 7}>
                    {start.date()}
                </div>
            );
            if (i % 7 === 6) {
                controls.push(
                    <div key={'w-' + Math.floor(i / 7)}>
                        {week}
                    </div>
                )
            }
            start.add(1, 'days');
        }
        return (
            <div className="calendar">
                {this.props.hideHeader ? null :
                    <div className="header">
                        <div className="select">
                            <select name="month"
                                    value={this.state.month}
                                    onChange={this.handleMonthChange}
                                    className="form-control select-month">
                                {this.getMonthOptions()}
                            </select>
                            <i className="material-icons arrow">arrow_drop_down</i>
                        </div>
                        <div className="select">
                            <select name="year"
                                    value={this.state.year}
                                    onChange={this.handleYearChange}
                                    className="form-control select-year">
                                {this.getYearOptions()}
                            </select>
                            <i className="material-icons arrow">arrow_drop_down</i>
                        </div>
                    </div> }

                <div>
                    {this.getWeekDays()}
                </div>
                {controls}
            </div>
        );
    }
}

Calendar.propTypes = {};
Calendar.defaultProps = {};

export default Calendar;
