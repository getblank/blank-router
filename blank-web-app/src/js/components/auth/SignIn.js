/**
 * Created by kib357 on 16/05/15.
 */

import React from "react";
import Locales from "./Locales";
import Loader from "../misc/Loader";
import SimpleForm from "../forms/SimpleForm";
import i18n from "../../stores/i18nStore";
import config from "../../stores/configStore";
import actions from "../../actions/credentialsActuators";
import configHelpers from "../../utils/configHelpers";

let sceneAliases = new Map([["", 1], ["#", 1], ["#login", 1], ["#register", 2], ["#send-reset-link", 3], ["#reset-password", 4]]);

export default class SignIn extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.data = {"$state": "new"};
        this.state.scene = sceneAliases.get(window.location.hash) || 1;
        this.state.emailError = "";
        this.state.sceneDescs = {
            "signIn": {"access": "ru", "props": this._getProps("signInProps")},
            "signUp": {"access": "ru", "props": this._getProps("signUpProps")},
            "resetPassword": {"access": "ru", "props": this._getProps("resetPasswordProps")},
            "sendResetLink": {"access": "ru", "props": this._getProps("resetPasswordRequestProps")},
        };
        for (let sceneDescName of Object.keys(this.state.sceneDescs)) {
            configHelpers.prepareProps(this.state.sceneDescs[sceneDescName], sceneDescName);
        }

        this.onHashChange = this.onHashChange.bind(this);
        this.setScene = this.setScene.bind(this);
    }

    componentDidMount() {
        if (!window.location.hash) {
            window.location.hash = "#";
        }
        window.addEventListener("hashchange", this.onHashChange);
    }

    componentWillUnmount() {
        window.removeEventListener("hashchange", this.onHashChange);
        clearTimeout(this.state.sceneTimer);
    }

    onHashChange() {
        var scene = sceneAliases.get(window.location.hash) || this.state.scene;
        if (scene !== this.state.scene) {
            this.setState({"scene": scene, "data": {}});
        }
    }

    setScene(e) {
        if (this.state.sceneTimer != null) {
            return;
        }
        var scene = e.currentTarget.getAttribute("data-scene");
        let timer = setTimeout(() => {
            window.location.hash = "#" + scene;
            this.setState({"sceneTimer": null});
        }, 300);
        this.setState({"sceneTimer": timer});
        e.preventDefault();
    }

    handleDataChange(data) {
        this.setState({"data": data});
    }

    setDataTouched() {
        this.state.data.$touched = true;
        this.setState({"data": this.state.data});
    }

    performAction(acionName) {
        let action = actions[acionName];
        this.setState({"data": Object.assign(this.state.data, {"$state": "saving"})}, () => {
            var successMessage = i18n.get("signUp.success" + (config.isUserActivationNeeded() ? "NeedActivation" : ""));
            let data = Object.assign({}, this.state.data);
            delete data.$state;
            action(data, successMessage).then((res) => {
                if (acionName !== "signIn") {
                    this.setState({"data": {"$state": "new"}});
                }
            }, (err) => {
                this.setState({"data": Object.assign(this.state.data, {"$state": "new"})});
            });
        });
    }

    render() {
        if (this.state.loading) {
            return <Loader className="center"/>;
        }
        let scene = this.state.scene;
        let sceneTimer = this.state.sceneTimer;
        let logo = config.getParameter("signInLogo");
        let logoHref = config.getParameter("signInLogoHref") || config.getParameter("titleHref");
        return (
            <div className="sign-in-container">
                <Locales/>

                <div className="sign-in-logo">
                    {logo ? (logoHref ? <a href={logoHref} target="_blank"><img src={logo} alt="logo"/></a> :
                        <img src={logo} alt="logo"/>) :
                        null}
                </div>
                <div className="scenes">
                    <div className={"scene" + (scene === 1 && sceneTimer == null ? " scene-show-delayed" : "")}
                         ref="scene-1">
                        {scene === 1 ? this._getScene("signIn") : null}
                    </div>

                    <div className={"scene" + (scene === 2 && sceneTimer == null ? " scene-show-delayed" : "")}
                         ref="scene-2">
                        {scene === 2 ? this._getScene("signUp") : null}
                    </div>

                    <div className={"scene" + (scene === 3 && sceneTimer == null ? " scene-show-delayed" : "")}
                         ref="scene-3">
                        {scene === 3 ? this._getScene("sendResetLink") : null}
                    </div>

                    <div className={"scene" + (scene === 4 && sceneTimer == null ? " scene-show-delayed" : "")}
                         ref="scene-3">
                        {scene === 4 ? this._getScene("resetPassword") : null}
                    </div>
                </div>
            </div>
        );
    }

    _getProps(formName) {
        var props = config.getParameter(formName);
        for (var propName of Object.keys(props)) {
            props[propName].groupAccess = "ru";
        }
        return props;
    }

    _getScene(sceneName) {
        let disableReset = config.getParameter("resetPasswordDisabled"),
            disableSignUp = config.getParameter("signUpDisabled");
        if ((disableReset && sceneName == "sendResetLink") ||
            (disableReset && sceneName == "resetPassword") ||
            (disableSignUp && sceneName == "signUp")) {
            return null;
        }
        return (
            <div className="scene-content">
                <h1 align="center"><span>{i18n.get(sceneName + ".title")}</span></h1>

                <div>
                    <SimpleForm storeDesc={this.state.sceneDescs[sceneName]}
                                storeName={sceneName}
                                disableAutoComplete={sceneName === "signUp" || sceneName === "resetPassword"}
                                onSubmit={this.performAction.bind(this, sceneName)}
                                onSubmitError={this.setDataTouched.bind(this)}
                                item={this.state.data} actions={{}}
                                onChange={this.handleDataChange.bind(this)}
                                directWrite={true} hideCancel={true} hideDelete={true}
                                buttonsContainerClassName="buttons-right"
                                saveText={i18n.get(sceneName + ".action")}
                                saveClass="btn-flat btn-accent first last"/>
                    <span className="error">{this.state.error}</span>
                </div>
                {sceneName === "resetPassword" || (disableReset && disableSignUp) ? null :
                    <div className="scene-controls">
                        {sceneName === "signUp" || disableSignUp ? null :
                            <button type="button"
                                    className="btn-flat first"
                                    data-scene="register"
                                    onClick={this.setScene}>
                                {i18n.get("signUp.link") || i18n.get("signUp.title")}
                            </button> }
                        {sceneName === "signIn" ? null :
                            <button type="button"
                                    className={"btn-flat" + (sceneName === "signUp" ? " first": "") + (sceneName === "sendResetLink" ? " last": "")}
                                    data-scene="login"
                                    onClick={this.setScene}>
                                {i18n.get("signIn.link") || i18n.get("signIn.title")}
                            </button> }
                        {sceneName === "sendResetLink" || disableReset ? null :
                            <button type="button"
                                    className={"btn-flat" + (sceneName === "signUp" ? " last": "") + (sceneName === "signIn" ? " last": "")}
                                    data-scene="send-reset-link"
                                    onClick={this.setScene}>
                                {i18n.get("sendResetLink.link") || i18n.get("sendResetLink.title")}
                            </button> }
                    </div>
                }
            </div>
        );
    }
}