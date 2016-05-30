/**
 * Created by kib357 on 13/09/15.
 */

import React from 'react';
import notificationsStore from '../../stores/notificationsStore';
import preferencesStore from '../../stores/preferencesStore';
import preferencesActions from '../../actions/preferencesActuators';
import { userPreferences, storeEvents } from 'constants';

class NotificationsToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.count = 0;
        this._onChange = this._onChange.bind(this);
    }

    componentDidMount() {
        notificationsStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        notificationsStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        this.setState({"count": notificationsStore.getCount()});
    }

    toggleNotifications(e) {
        e.preventDefault();
        preferencesActions.setPreference(userPreferences.SHOW_NOTIFICATIONS, !preferencesStore.getUserPreference(userPreferences.SHOW_NOTIFICATIONS));
    }

    render() {
        return (
            <a href="#" onClick={this.toggleNotifications} className="notifications-toggle">
                <i className="material-icons text md-16">sms</i>
                <span className="counter">{this.state.count > 0 ? this.state.count : null}</span>
            </a>
        );
    }
}

NotificationsToggle.propTypes = {};
NotificationsToggle.defaultProps = {};

export default NotificationsToggle;
