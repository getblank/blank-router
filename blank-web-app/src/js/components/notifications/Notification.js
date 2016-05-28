/**
 * Created by kib357 on 04/09/15.
 */

import React from 'react';
import Actions from '../actions/Actions';
import notificationsStore from '../../stores/notificationsStore';
import configStore from '../../stores/configStore';
import notificationsActions from '../../actions/notificationsActuators';
import preferencesActions from '../../actions/preferencesActuators';
import alertsEmitter from '../../utils/alertsEmitter';
import {userPreferences} from 'constants';
import moment from 'moment';
import classNames from 'classnames';
import find from 'utils/find';

class Notification extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.deleting = false;
        this.close = this.close.bind(this);
        this.openNotifications = this.openNotifications.bind(this);
        this.performAction = this.performAction.bind(this);
    }

    performAction(item, actionId, actionData) {
        notificationsActions.performAction(this.props.item.group, item, actionId, actionData || {});
        alertsEmitter.removeNotification(this.props.item._id);
    }

    close(e) {
        e.preventDefault();
        if (this.state.deleting) {
            return;
        }
        this.setState({"deleting": true}, () => {
            notificationsActions.delete(this.props.item.group, this.props.item._id).then((res) => {
                alertsEmitter.removeNotification(this.props.item._id);
            }, (error) => {
                this.setState({"deleting": false});
            });
        });
    }

    openNotifications() {
        if (this.props.container === 'toast') {
            preferencesActions.setPreference(userPreferences.SHOW_NOTIFICATIONS, true);
            notificationsActions.highlight(this.props.item._id);
        }
    }

    render() {
        var timeFormat = this.props.timeFormat || "DD-MM HH:mm",
            notification = this.props.item,
            container = this.props.container,
            groupDesc = notificationsStore.getGroupDesc(notification.group),
            icon = notification.icon || groupDesc.icon, abbr = '';
        if (!icon) {
            abbr = find.abbr(groupDesc.label || notification.group);
        }
        var relatedObjects = (notification.relatedObjects || []).map((relatedObject, index) => {
            if (this.props.container === 'toast' && index > 0 && !notification.showAllRelated) {
                return (index === 1 ? <i className="material-icons text m-l-8 md-16">more_vert</i> : null);
            }
            switch (relatedObject.mode) {
                case "link":
                    if (!relatedObject.store) {
                        return null;
                    }
                    var to = configStore.findRoute(relatedObject.store) + (configStore.isSingle(relatedObject.store) ? '' : ('/' + relatedObject._id));
                    return (
                        <a href={'#' + to}
                           key={relatedObject._id}
                           onMouseUp={this.preventNotificationsOpen}
                           className="related-object">
                            {relatedObject.name}
                            {container !== 'toast' ?
                                <i className="material-icons text md-15 m-l-4">arrow_forward</i> : null }
                        </a>
                    );
                    break;
                default:
                    return null;
            }
        });
        var cn = classNames('notification-card', this.props.container, {
            "highlight": notification.highlight
        });
        return (
            <div className={cn}>
                {icon ? <i className="icon material-icons text md-16">{icon}</i> :
                    <i className="icon round-avatar">{abbr}</i> }
                {container !== 'toast' ?
                    <span className="created">{moment(notification.createdAt).format(timeFormat)}</span> : null }
                {container !== 'toast' ?
                    <i onClick={this.close} className="close material-icons text md-16">
                        {this.state.deleting ? 'query_builder' : 'close'}
                    </i> : null}
                <span className={"message" + (container === 'toast' && !notification.notOpenNC ? " pointer" : "")}
                      title={notification.message}
                      onClick={notification.notOpenNC ? null : this.openNotifications}>
                    {notification.message}
                </span>
                {notification.details && container !== 'toast' ?
                    <span className="details">{notification.details}</span> : null }
                {relatedObjects}
                {notification.group != null &&
                <Actions item={notification}
                         storeName={notification.group}
                         storeDesc={groupDesc}
                         execute={this.performAction}
                         dontCheckReady={true}
                         dark={true}
                         onMouseUp={this.preventNotificationsOpen}/>
                }
            </div>
        );
    }
}

Notification.propTypes = {};
Notification.defaultProps = {};

export default Notification;
