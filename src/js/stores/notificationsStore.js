/**
 * Created by kib357 on 30/08/15.
 */

import BaseStore  from "./baseStore";
import {storeTypes, serverActions, userActions} from "constants";
import find from "utils/find";
import alerts from "../utils/alertsEmitter";

class NotificationsStore extends BaseStore {
    constructor() {
        super();
        this.groups = {};
    }

    getGroupDesc(groupName) {
        if (this.groups[groupName]) {
            return this.groups[groupName].desc;
        }
        return {};
    }

    getAll() {
        var res = [];
        for (let groupName of Object.keys(this.groups)) {
            var group = this.groups[groupName];
            for (let notification of group.items) {
                var notInserted = true;
                for (var i = 0; i < res.length; i++) {
                    if (notification.createdAt > res[i].createdAt) {
                        //console.log('111');
                        res.splice(i, 0, notification);
                        notInserted = false;
                        break;
                    }
                }
                if (notInserted) {
                    res.push(notification);
                }
            }
        }
        return res;
    }

    getCount() {
        var res = 0;
        for (let groupName of Object.keys(this.groups)) {
            var group = this.groups[groupName];
            res += group.items.length;
        }
        return res;
    }

    __onDispatch(payload) {
        switch (payload.actionType) {
            case userActions.NOTIFICATIONS_HIGHLIGHT:
                for (let groupName of Object.keys(this.groups)) {
                    var group = this.groups[groupName];
                    var item = find.itemById(group.items, payload.id);
                    if (item != null) {
                        item.highlight = true;
                        setTimeout(() => {
                            item.highlight = false;
                            //this.__emitChange();
                        }, 5000);
                        this.__emitChange();
                        break;
                    }
                }
                break;
            case serverActions.NOTIFICATIONS_UPDATE:
                var command = payload.rawMessage;
                if (this.groups[command.group] == null) {
                    return;
                }
                switch (command.event) {
                    case "init":
                        //this.groups[command.group].items.length = 0;
                        for (let item of (command.data || [])) {
                            item.group = command.group;
                            this.groups[command.group].items.push(item);
                            //todo: Display alert toast
                        }
                        break;
                    case "create":
                    case "update":
                        for (let item of command.data) {
                            let index = find.indexById(this.groups[command.group].items, item._id);
                            item.group = command.group;
                            alerts.notification(item);
                            if (index >= 0) {
                                Object.assign(this.groups[command.group].items[index], item);
                            } else {
                                this.groups[command.group].items.push(item);
                                //todo: Display alert toast
                            }
                        }
                        break;
                    case "delete":
                        for (let item of command.data) {
                            let index = find.indexById(this.groups[command.group].items, item._id);
                            if (index >= 0) {
                                this.groups[command.group].items.splice(index, 1);
                            }
                        }
                        break;
                }
                this.__emitChange();
                break;
            case serverActions.UPDATE_CONFIG:
                this.groups = {};
                var storesDesc = payload.data;
                for (var entry of Object.keys(storesDesc || {})) {
                    if (storesDesc[entry].type !== storeTypes.notification) {
                        continue;
                    }
                    this.groups[entry] = {
                        "items": [],
                        "desc": storesDesc[entry],
                    };
                }
                console.log("Notifications store ready: ", this.groups);
                break;
        }
    }
}

let store = new NotificationsStore();
export default store;