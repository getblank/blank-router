/**
 * Created by kib357 on 05/08/15.
 */

import React from 'react';
import serverStateActuators from '../../actions/serverStateActuator';
import License from './License';
import i18n from '../../stores/i18nStore';
import { storeEvents } from 'constants';

var _defaultLogin = 'root';

export default class Install extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.login = '';
        this.state.pass = '';
        this.state.mail = '';
        this.state.invalid = false;
        this.state.timers = {};
        this.state.loading = false;
        this.state.scene = -1;
        this.handleLoginChange = this.handleLoginChange.bind(this);
        this.handleMailChange = this.handleMailChange.bind(this);
        this.handlePasswordChange = this.handlePasswordChange.bind(this);
        this.handleNext = this.handleNext.bind(this);
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleConfirmLicense = this.handleConfirmLicense.bind(this);
    }

    componentDidMount() {
        this.checkView();
        this.checkValidity();
    }

    componentDidUpdate() {
        this.checkValidity();
    }


    componentWillUnmount() {
        clearTimeout(this.state.timers.hello);
        clearTimeout(this.state.timers.checkView);
    }

    checkView() {
        switch (this.props.serverState) {
            case 'install':
                this.setState({"scene": 1});
                var mail = this.refs.mail;
                mail.focus();
                break;
            default:
                this.state.timers.hello = setTimeout(() => {
                    //hello.className = 'content show';
                    this.setState({"scene": 0});
                    this.state.timers.checkView = setTimeout(() => {
                        this.checkView();
                    }, 1500);
                }, 200);
                break;
        }
    }

    handleLoginChange(e) {
        var value = e.target.value;
        this.setState({"login": value});
    }

    handlePasswordChange(e) {
        var value = e.target.value;
        this.setState({"pass": value});
    }

    handleMailChange(e) {
        var value = e.target.value;
        this.setState({"mail": value});
    }

    handleNext(e) {
        e.preventDefault();
        this.setState({"scene": this.state.scene + 1});
    }

    handleConfirm(e) {
        e.preventDefault();
        this.setState({"loading": true}, () => {
            serverStateActuators.setup({
                "email": this.state.mail,
                "login": this.state.login || _defaultLogin,
                "password": this.state.pass
            }).finally(() => {
                this.setState({"loading": false});
            });
        })
    }

    handleConfirmLicense(e) {
        e.preventDefault();
        this.setState({"scene": 2});
    }

    render() {
        var scene = this.state.scene;
        return (
            <div className="scenes">
                <div className={"scene" + (scene === 0 ? ' scene-show' : '')}>
                    <h1>{i18n.get("install.hello") || "Привет. Скоро начнем."}</h1>
                </div>

                <div className={"scene" + (scene === 1 ? ' scene-show-delayed' : '')}>
                    <h1>{i18n.get("install.license") || "Лицензионное соглашение"}</h1>

                    <div className="license-viewer">
                        <div className="shadow-top"></div>
                        <div className="license-text">
                            <License/>
                        </div>
                        <div className="shadow-bottom"></div>
                    </div>
                    <br/>
                    <button onClick={this.handleConfirmLicense}
                            className="btn-flat">
                        {i18n.get("install.accept") || "Принять"}&#160;
                        <i className="fa fa-fw fa-angle-right"/>
                    </button>
                </div>

                <div className={"scene" + (scene === 2 ? ' scene-show-delayed' : '')}>
                    <h1>{i18n.get("install.createRoot") || "Создание аккаунта администратора"}</h1>
                    <br/>

                    <form ref="editorForm">
                        <div className="form-field">
                            <label htmlFor="login">{i18n.get("common.userName") || "Имя пользователя"}</label>
                            <input id="login" className="form-control" type="text"
                                   placeholder={_defaultLogin}
                                   value={this.state.login}
                                   onChange={this.handleLoginChange}/>
                        </div>
                        <div className="form-field">
                            <label htmlFor="mail">{i18n.get("registration.email") || "E-mail"}</label>
                            <input id="mail" ref="mail" className="form-control" type="text"
                                   value={this.state.mail}
                                   onChange={this.handleMailChange}
                                   required={true}/>
                        </div>
                        <div className="form-field">
                            <label htmlFor="pass">{i18n.get("common.password") || "Пароль"}</label>
                            <input id="pass" className="form-control" type="password" pattern=".{1,}"
                                   value={this.state.pass}
                                   onChange={this.handlePasswordChange}
                                   required={true}/>
                        </div>
                        <button disabled={this.state.invalid || this.state.loading} onClick={this.handleConfirm}
                                className="btn-flat">
                            {i18n.get("install.next") || "Далее"}&#160;
                            <i className={"fa fa-fw " + (this.state.loading ? "fa-spin fa-spinner" : "fa-angle-right")}/>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    checkValidity() {
        var invalid = false;
        var form = this.refs.editorForm;
        var inputs = form.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
            if (!inputs[i].checkValidity()) {
                invalid = true;
                break;
            }
        }
        if (invalid !== this.state.invalid) {
            this.setState({"invalid": invalid});
        }
    }
};