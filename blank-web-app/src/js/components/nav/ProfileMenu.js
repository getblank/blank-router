/**
 * Created by kib357 on 01/06/15.
 */

import React from "react";
import BsLink from "./BsLink";
import credentialsActions from "../../actions/credentialsActuators";
import credentialsStore from "../../stores/credentialsStore";
import configStore from "../../stores/configStore.js";
import i18n from "../../stores/i18nStore.js";
import {ToggleMixin} from "../../utils/mixins.js";
import template from "template";

var SignOut = React.createClass({
    mixins: [ToggleMixin],
    getStateFromStores: function () {
        return credentialsStore.getState();
    },
    getInitialState: function () {
        var state = this.getStateFromStores();
        state.userSignedOut = false;
        state.opened = false;
        return state;
    },
    signOut: function (e) {
        e.preventDefault();
        this.setState({"userSignedOut": true}, () => {
            credentialsActions.signOut();
        });
    },
    render: function () {
        var user = credentialsStore.getUser();
        return (
            <div className={"sign-out " + (this.props.className || "")} style={{"position": "relative"}} ref="root">
                <a href="#"
                   onClick={this.toggle}>
                    <i className="material-icons text md-18 m-r-8">{configStore.getProfileIcon() || "account_box"}</i>
                        <span className="user-name">
                            {template.render(configStore.getProfileLabel(), user) || user.name}
                        </span>
                </a>
                <ul className="pd-dropdown-menu left-side"
                    style={{"display": (this.state.opened ? "block" : "none")}} onClick={this.clickHandler}>
                    {this.props.links.map(linkDesc =>
                        <BsLink key={linkDesc.to + "-" + linkDesc.name}
                                to={linkDesc.to}
                                style={linkDesc.style}
                                activeStyle={linkDesc.activeStyle}
                                hoverStyle={linkDesc.hoverStyle}
                                onClick={this.toggle}>
                            {linkDesc.name}
                        </BsLink>
                    )}
                    <li>
                        <a href="#"
                           onClick={this.signOut}>
                            <i className="fa fa-sign-out m-r-8"/>{i18n.get("signOut.action")}
                        </a>
                    </li>
                </ul>
            </div>
        );
    }
});

module.exports = SignOut;