/**
 * Created by kib357 on 29/10/15.
 */

import React from 'react';
import i18n from '../../../../stores/i18nStore';
import credentialsActions from '../../../../actions/credentialsActuators';
import Loader from '../../../misc/Loader';
import classnames from 'classnames';

class NewUsername extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.loading = false;
        this.state.ok = false;
    }

    handleChange(e) {
        this.props.onChange(e.target.value);
    }

    componentWillReceiveProps(nextProps) {
        if (!nextProps.invalid && nextProps.value && nextProps.value !== this.props.value) {
            this.setState({"loading": true, "ok": false}, () => {
                var email = nextProps.value;
                credentialsActions.checkUser(email).then((res) => {
                    if (email === this.props.value) {
                        this.setState({"loading": false, "ok": res !== "USER_EXISTS"});
                    }
                }, (error) => {
                    this.setState({"loading": false});
                });
            });
        }
    }

    render() {
        let errorText = (!this.state.ok && !this.state.loading) && i18n.get("signUp.loginInUse");
        return (
            <div className="new-username">
                <input type="text"
                       id={this.props.id}
                       onChange={this.handleChange.bind(this)}
                       onFocus={this.props.onFocus}
                       onBlur={this.props.onBlur}
                       value={this.props.value}
                       required={this.props.required}
                       placeholder={this.props.placeholder}
                       pattern={this.state.ok ? this.props.pattern : '(?!.*)'}
                       minLength={this.props.minLength}
                       maxLength={this.props.maxLength}
                       className={classnames("form-control", {"dirty": this.props.changed})}/>
                {this.state.loading ?
                    <Loader className="xs"/> :
                    (this.props.invalid ? null :
                        <i className={"material-icons state-icon" + (this.state.ok ? "" : " error")}
                            toolTip={errorText}>
                            {this.state.ok ? "check_circle" : "not_interested"}
                        </i>)
                }
            </div>
        );
    }
}

NewUsername.propTypes = {};
NewUsername.defaultProps = {};

export default NewUsername;
