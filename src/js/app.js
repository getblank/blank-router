"use strict";

import React from "react";
import ReactDOM from "react-dom";
import Helmet from "./components/misc/Helmet";
import history from "./stores/historyStore";
import appState from "./stores/appStateStore";
import {storeEvents, userPreferences} from "constants";
import configStore from "./stores/configStore";
import Nav from "./components/nav/Nav";
import SideNav from "./components/nav/SideNav";
import NavGroup from "./components/layouts/NavGroup";
import Loader from "./components/misc/Loader";
import StoreView from "./components/layouts/StoreView";
import SingleStoreView from "./components/layouts/SingleStoreView";
import ItemView from "./components/item/ItemView";
import ConfigViewer from "./components/config/ConfigViewer";
import Notifications from "./components/notifications/Notifications";
import Install from "./components/install/Install";
import Alerts from "./components/notifications/Alerts";
import SignIn from "./components/auth/SignIn";
import ChangesTracker from "./components/forms/ChangesTracker";
import AudioPlayer from "./components/forms/viewers/audio/AudioPlayer";
import serverStateStore from "./stores/serverStateStore";
import credentialsStore from "./stores/credentialsStore";
import preferencesStore from "./stores/preferencesStore";
import configActions from "./actions/configActuators";
import preferencesActions from "./actions/preferencesActuators";
import classNames from "classnames";

var NotFoundHandler = React.createClass({
    render: function () {
        return (
            <div className="container">
                <h2>Страница не найдена</h2>
            </div>
        );
    },
});

//Registering route components from app.js to resolve circular dependency
history.__componentsMap = new Map([
    ["StoreView", StoreView],
    ["SingleStoreView", SingleStoreView],
    ["NavGroup", NavGroup],
    ["ItemView", ItemView],
    ["ConfigViewer", ConfigViewer],
    ["NotFoundHandler", NotFoundHandler],
]);

class App extends React.Component {
    constructor() {
        super();
        this.state = App.getStateFromStores();
        this._onChange = this._onChange.bind(this);
    }

    static getStateFromStores() {
        var state = serverStateStore.get();
        let credentials = credentialsStore.getState();
        state.signedIn = credentials.signedIn;
        state.pendingAutoLogin = credentials.pendingAutoLogin;
        state.baseConfigReady = configStore.isBaseReady();
        state.configReady = configStore.isReady();
        state.showNotifications = preferencesStore.getUserPreference(userPreferences.SHOW_NOTIFICATIONS);
        return state;
    }

    render() {
        var cn = classNames({
            "app": true,
            "sign-in": !this.state.signedIn,
            "show-notifications": this.state.showNotifications,
        });
        //console.log("APP_render: ", history.getCurrentPath());
        return (
            this.state.connected ?
                <div className={cn}>
                    <Alerts></Alerts>
                    <Helmet/>
                    {this.state.serverState == null || (this.state.pendingAutoLogin && this.state.serverState !== "install") ?
                        <Loader className="center"/> :
                        this.state.serverState !== "ready" ? <Install serverState={this.state.serverState}/> :
                            this.state.signedIn !== true ?
                                (this.state.baseConfigReady !== true ? <BaseConfigLoader/> : <SignIn></SignIn>) :
                                this.state.configReady !== true ? <Loader className="center"/> : <Home/>  }
                </div> :
                <Loader className="center"/>
        );
    }

    componentDidMount() {
        serverStateStore.on(storeEvents.CHANGED, this._onChange);
        credentialsStore.on(storeEvents.CHANGED, this._onChange);
        preferencesStore.on(storeEvents.CHANGED, this._onChange);
        appState.on(storeEvents.CHANGED, this._onChange);
        configStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        serverStateStore.removeListener(storeEvents.CHANGED, this._onChange);
        credentialsStore.removeListener(storeEvents.CHANGED, this._onChange);
        preferencesStore.removeListener(storeEvents.CHANGED, this._onChange);
        appState.removeListener(storeEvents.CHANGED, this._onChange);
        configStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        //console.log("APP_onChange");
        this.setState(App.getStateFromStores());
    }
}

class BaseConfigLoader extends React.Component {
    componentDidMount() {
        console.log("Loading base config...");
        configActions.getBaseConfig();
    }

    render() {
        return (
            <Loader className="center"/>
        );
    }
}

class Home extends React.Component {
    constructor(props) {
        super(props);
        this.toggleSideNavPin = this.toggleSideNavPin.bind(this);
        this.toggleNotificationsPin = this.toggleNotificationsPin.bind(this);
    }

    sideNavAutoHidePrefName() {
        return (appState.navGroup || appState.store) + "-sidenav-auto-hide";
    }

    toggleSideNavPin() {
        preferencesActions.setPreference(this.sideNavAutoHidePrefName(), !preferencesStore.getUserPreference(this.sideNavAutoHidePrefName()));
    }

    toggleNotificationsPin() {
        preferencesActions.setPreference("pin-notifications", !preferencesStore.getUserPreference("pin-notifications"));
    }

    render() {
        var cn = classNames("home");
        return (
            <div className={cn}>
                <Nav/>
                <div className="flex row fill relative">
                    <SideNav navGroup={appState.navGroup}
                             storeName={appState.store}
                             pinned={!preferencesStore.getUserPreference(this.sideNavAutoHidePrefName())}
                             onTogglePin={this.toggleSideNavPin}/>
                    {history.createChild()}
                </div>
                <Notifications onTogglePin={this.toggleNotificationsPin}
                               pinned={preferencesStore.getUserPreference("pin-notifications")}/>
                <ChangesTracker/>
                <AudioPlayer/>
            </div>
        );
    }
}

ReactDOM.render(<App/>, document.getElementById("app-container"));

if (!String.prototype.repeat) {
    String.prototype.repeat = function (count) {
        "use strict";
        if (this == null) {
            throw new TypeError("can't convert " + this + " to object");
        }
        var str = "" + this;
        count = +count;
        if (count != count) {
            count = 0;
        }
        if (count < 0) {
            throw new RangeError("repeat count must be non-negative");
        }
        if (count == Infinity) {
            throw new RangeError("repeat count must be less than infinity");
        }
        count = Math.floor(count);
        if (str.length == 0 || count == 0) {
            return "";
        }
        // Обеспечение того, что count является 31-битным целым числом, позволяет нам значительно
        // соптимизировать главную часть функции. Впрочем, большинство современных (на август
        // 2014 года) браузеров не обрабатывают строки, длиннее 1 << 28 символов, так что:
        if (str.length * count >= 1 << 28) {
            throw new RangeError("repeat count must not overflow maximum string size");
        }
        var rpt = "";
        for (; ;) {
            if ((count & 1) == 1) {
                rpt += str;
            }
            count >>>= 1;
            if (count == 0) {
                break;
            }
            str += str;
        }
        return rpt;
    };
}