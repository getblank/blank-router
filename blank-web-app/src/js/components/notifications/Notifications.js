/**
 * Created by kib357 on 27/08/15.
 */

import React from 'react';
import Clock from '../misc/Clock';
import Notification from './Notification';
import notificationsStore from '../../stores/notificationsStore';
import notificationsActions from '../../actions/notificationsActuators';
import preferencesStore from '../../stores/preferencesStore';
import preferencesActions from '../../actions/preferencesActuators';
import configStore from '../../stores/configStore';
import i18n from '../../stores/i18nStore';
import { storeEvents, userPreferences } from 'constants';
import moment from 'moment';

class Notifications extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromStore();
        this._onChange = this._onChange.bind(this);
        this.toggle = this.toggle.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    getStateFromStore() {
        var state = {};
        state.items = notificationsStore.getAll();
        var TODAY = moment().startOf('day');
        var YESTERDAY = moment().subtract(1, 'days').startOf('day');
        state.today = [];
        state.yesterday = [];
        state.old = [];
        for (let notification of state.items) {
            var group = state.old;
            if (moment(notification.createdAt).isSame(TODAY, 'd')) {
                group = state.today;
            }
            if (moment(notification.createdAt).isSame(YESTERDAY, 'd')) {
                group = state.yesterday;
            }
            group.push(notification);
        }
        return state;
    }

    componentDidMount() {
        notificationsStore.on(storeEvents.CHANGED, this._onChange);
        setTimeout(() => {
            let notificationStoresNames = configStore.getNotificationStoresNames();
            notificationsActions.subscribe(notificationStoresNames);
        });
    }

    componentWillUnmount() {
        notificationsStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    componentWillReceiveProps(nextProps) {
        this.manageListeners();
    }

    _onChange() {
        this.setState(this.getStateFromStore());
    }

    clear(interval) {
        var items = this.state[interval];
        var stores = new Map();
        for (let item of items) {
            if (!stores.has(item.group)) {
                stores.set(item.group, []);
            }
            stores.get(item.group).push(item._id);
        }
        for (let [key, value] of stores) {
            notificationsActions.unsafeDelete(key, value);
        }
    }

    render() {
        var today = this.state.today.map((notification) => {
            return (
                <Notification item={notification} timeFormat="HH:mm" key={notification._id} container="center"/>
            )
        });
        var yesterday = this.state.yesterday.map((notification) => {
            return (
                <Notification item={notification} timeFormat="DD-MM HH:mm" key={notification._id} container="center"/>
            )
        });
        var old = this.state.old.map((notification) => {
            return (
                <Notification item={notification} timeFormat="DD-MM HH:mm" key={notification._id} container="center"/>
            )
        });
        return (
            <div className="notifications" ref="root">
                <div className="notifications-header">
                    <Clock interval="3000" format="dd, D MMMM HH:mm"></Clock>
                </div>
                <div className="notifications-list">
                    {this.state.items.length > 0 ? null :
                        <div className="notifications-group">
                            <span className="group-title">{i18n.get("notifications.empty")}</span>
                        </div>
                    }
                    {today.length === 0 ? null :
                        <div className="notifications-group today">
                            <div className="group-title">
                                <span>{i18n.get("common.today")}</span>
                                <button type="button" className="btn-icon sm dark last clear-range"
                                        onClick={this.clear.bind(this, "today")}>
                                    <i className="material-icons text">close</i>
                                </button>
                            </div>

                            <div>
                                {today}
                            </div>
                        </div> }
                    {yesterday.length === 0 ? null :
                        <div className="notifications-group">
                            <div className="group-title">
                                <span>{i18n.get("common.yesterday")}</span>
                                <button type="button" className="btn-icon sm dark last clear-range"
                                        onClick={this.clear.bind(this, "yesterday")}>
                                    <i className="material-icons text">close</i>
                                </button>
                            </div>

                            <div>
                                {yesterday}
                            </div>
                        </div> }
                    {old.length === 0 ? null :
                        <div className="notifications-group">
                            <div className="group-title">
                                <span>{i18n.get("notifications.previously")}</span>
                                <button type="button" className="btn-icon sm dark last clear-range"
                                        onClick={this.clear.bind(this, "old")}>
                                    <i className="material-icons text">close</i>
                                </button>
                            </div>

                            <div>
                                {old}
                            </div>
                        </div> }
                </div>
            </div>
        );
    }

    toggle() {
        preferencesActions.setPreference(userPreferences.SHOW_NOTIFICATIONS, !preferencesStore.getUserPreference(userPreferences.SHOW_NOTIFICATIONS));
    }

    handleDocumentClick(e) {
        let root = this.refs.root;
        if (root == null || e.target === root || root.contains(e.target)) {
            return;
        }
        this.toggle();
    }

    manageListeners() {
        if (preferencesStore.getUserPreference(userPreferences.SHOW_NOTIFICATIONS)) {
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }
}

Notifications.propTypes = {};
Notifications.defaultProps = {};

export default Notifications;