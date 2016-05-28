/**
 * Created by kib357 on 23/09/15.
 */

import React from "react";
import configStore from "../../stores/configStore.js";
import credentialsStore from "../../stores/credentialsStore.js";
import configActions from "../../actions/configActuators.js";
import credentialsActions from "../../actions/credentialsActuators.js";
import { storeEvents, lsKeys } from "constants";

var converter = new Map([["ru", "Русский"], ["en", "English"]]);

class Locales extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromStores();
        this._onChange = this._onChange.bind(this);
    }

    getStateFromStores() {
        var res = {"locales": [], "current": ""};
        var user = credentialsStore.getUser();
        res.current = user != null ? user.lang : localStorage.getItem(lsKeys.locale);
        res.locales = configStore.getLocales();
        if (!res.current) {
            res.current = configStore.getDefaultLocale();
        }
        return res;
    }

    setLocale(locale) {
        var user = credentialsStore.getUser();
        if (user == null) {
            configActions.setLocale(locale);
        } else {
            credentialsActions.setLocale(user, locale);
        }
    }

    convert(locale) {
        return converter.has(locale) ? converter.get(locale) : locale;
    }

    render() {
        var items = null;
        if (this.state.locales.length > 1) {
            items = this.state.locales.map((item, i) => (
                <button type="button"
                        key={item}
                        className={"btn-flat" + (i === 0 ? " first": "") + (i === this.state.locales.length - 1 ? " last": "")}
                        disabled={item === this.state.current}
                        onClick={this.setLocale.bind(this, item)}>
                    {this.convert(item)}
                </button>
            ));
        }
        return <div className="locales">{items}</div>;
    }

    componentWillMount() {
        configStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        configStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        this.setState(this.getStateFromStores());
    }
}

Locales.propTypes = {};
Locales.defaultProps = {};

export default Locales;
