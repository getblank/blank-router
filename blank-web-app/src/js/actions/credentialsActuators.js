/**
 * Created by kib357 on 17/05/15.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import client from "../wamp/client";
import alerts from "../utils/alertsEmitter";
import i18n from "../stores/i18nStore";
import find from "utils/find";
import {serverActions} from "constants";

var updateUserData = function (data) {
    dispatcher.dispatch({
        "actionType": serverActions.UPDATE_USER,
        "rawMessage": data,
    });
};

module.exports = {
    subscribe: function (user) {
        console.log("Subscribe action for user credentials");
        client.subscribe("com.users", updateUserData, () => {
        }, (error) => {
            alerts.error(i18n.getError(error));
        }, { "_ownerId": user._id });
    },
    unsubscribe: function () {
        console.log("Unsubscribe action for user credentials");
        client.unSubscribe("com.users");
    },
    signIn: function (login, password) {
        if (typeof login !== "string") {
            password = login.password;
            login = login.login;
        }
        return new Promise((resolve, reject) => {
            client.call("com.sign-in",
                (data, error) => {
                    dispatcher.dispatch({
                        "actionType": serverActions.SIGN_IN,
                        "user": data ? data.user : null,
                        "key": data ? data.key : null,
                        "error": error,
                    });
                    if (error == null) {
                        resolve();
                    }
                    else {
                        if (login != "$userKey$") {
                            switch (error.desc) {
                                case "NOT_FOUND":
                                    alerts.error(i18n.get("signIn.error"), 2);
                                    break;
                                default:
                                    alerts.error(i18n.getError(error));
                                    break;
                            }
                        }
                        reject();
                    }
                },
                login, password);
        });
    },
    signOut: function () {
        client.call("com.sign-out", (data, error) => {
            dispatcher.dispatch({
                "actionType": serverActions.SIGN_OUT,
                "state": (typeof error === "undefined" || error === null) ? "RESULT" : "ERROR",
                "rawMessage": data,
                "error": error,
            });
        });
    },
    signUp: function (data, succesText) {
        return new Promise((resolve, reject) => {
            client.call("com.sign-up",
                (data, error) => {
                    if (error == null) {
                        alerts.info(succesText, 15);
                        if (data && data.user) {
                            dispatcher.dispatch({
                                "actionType": serverActions.SIGN_IN,
                                "rawMessage": data,
                            });
                        } else {
                            window.location.hash = "#";
                        }
                    }
                    else {
                        switch (error.desc) {
                            case "USER_EXISTS":
                                alerts.error(i18n.get("registration.emailError"), 2);
                                break;
                            case "WRONG_EMAIL":
                            case "WRONG_LOGIN":
                            case "NO_LOGIN_AND_EMAIL":
                            case "WRONG_PASSWORD":
                            default:
                                alerts.error(i18n.getError(error));
                                break;
                        }
                    }
                    resolve();
                }, data);
        });
    },
    sendResetLink: function (mail) {
        return new Promise((resolve, reject) => {
            client.call("com.send-reset-link",
                (data, error) => {
                    if (error == null) {
                        alerts.info(i18n.get("signIn.restoreLinkSent"), 5);
                        window.location.hash = "#";
                    }
                    else {
                        alerts.error(i18n.getError(error));
                    }
                    resolve();
                },
                mail);
        });
    },
    resetPassword: function (data) {
        return new Promise((resolve, reject) => {
            client.call("com.reset-password",
                (data, error) => {
                    if (error == null) {
                        alerts.info(i18n.get("profile.passwordSaved"), 5);
                        setTimeout(() => {
                            window.location = location.protocol + "//" + location.host + location.pathname;
                        }, 3000);
                    }
                    else {
                        alerts.error(i18n.getError(error));
                    }
                    resolve();
                },
                data, find.urlParam("token"));
        });
    },
    checkUser: function (value) {
        return new Promise((resolve, reject) => {
            client.call("com.check-user",
                (data, error) => {
                    if (error == null) {
                        resolve(data);
                    }
                    else {
                        alerts.error(i18n.getError(error));
                        reject(error);
                    }
                }, value);
        });
    },
};