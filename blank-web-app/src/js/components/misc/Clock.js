/**
 * Created by kib357 on 31/08/15.
 */

import React from 'react';
import moment from 'moment';

class Clock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.time = moment();
    }

    componentDidMount() {
        var interval = setInterval(() => {
            this.setState({"time": moment()});
        }, this.props.interval || 1000);
        this.setState({"interval": interval});
    }

    componentWillUnmount() {
        clearInterval(this.state.interval);
    }

    render() {
        return (
            <span className={this.props.className}>{this.state.time.format(this.props.format || "HH:mm")}</span>
        );
    }
}

Clock.propTypes = {};
Clock.defaultProps = {};

export default Clock;
