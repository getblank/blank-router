/**
 * Created by kib357 on 18/12/15.
 */

import React from 'react';
import Actions from './Actions.js';
import i18n from '../../stores/i18nStore.js';
import credentialsStore from '../../stores/credentialsStore.js';
import configStore from '../../stores/configStore.js';

class ActionsMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.relative = true;
        this.state.opened = false;

        this.deleteHandler = this.deleteHandler.bind(this);
        this.toggle = this.toggle.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.manageListeners = this.manageListeners.bind(this);
        this.currentActionChangedHandler = this.currentActionChangedHandler.bind(this);
    }

    deleteHandler() {
        if (typeof this.props.onDelete === 'function') {
            this.props.onDelete();
        }
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    toggle(e) {
        if (e) {
            e.preventDefault();
        }
        this.setState({ "opened": !this.state.opened }, function() {
            this.manageListeners();
        });
    }

    handleDocumentClick(e) {
        this.toggle();
    }

    manageListeners() {
        if (this.state.opened) {
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }

    currentActionChangedHandler(action) {
        //console.log("currentActionChangedHandler");
        let newState = { "relative": action == null };
        this.setState(newState)
    }

    performAction(actionId, data) {
        if (this.refs.actions != null) {
            this.refs.actions.performAction(actionId, data);
        } else {
            console.warn("HeaderActions: Cannot execute action - actions component not found");
        }
    }

    render() {
        let style = { "display": (this.state.opened || !this.state.relative ? 'inline-block' : 'none') };
        if (!this.state.relative) {
            Object.assign(style, {
                "position": "inherit",
                "height": 0,
                "width": 0,
                "minWidth": 0,
                "overflow": "hidden"
            });
        }
        let user = credentialsStore.getUser();
        let actionsDesc = configStore.getActions(this.props.storeName, { "$user": user, "$item": this.props.item }, this.props.forStore);
        let hideDelete = this.props.forStore || this.props.disableDelete,
            hideToggle = actionsDesc.filter(a => !a.hideInHeader).length === 0 && hideDelete;

        return (
            <div style={{ "display": "inline-block" }} className={this.state.relative ? "relative" : ""}>
                {!hideToggle &&
                    <button type="submit"
                        tabIndex="-1"
                        className="btn-icon dark"
                        onClick={this.toggle}>
                        <i className="material-icons text">more_vert</i>
                    </button>
                }
                <div className="pd-dropdown-menu left-side"
                    style={style} onClick={this.clickHandler}>
                    <Actions item={this.props.forStore ? { "$state": "ready" } : this.props.item}
                        storeName={this.props.storeName}
                        storeDesc={this.props.storeDesc}
                        actionsDesc={actionsDesc}
                        execute={this.props.forStore ? this.props.actions.performStoreAction : this.props.actions.performAction}
                        forHeader={true}
                        modalFormActions={true}
                        onCurrentChanged={this.currentActionChangedHandler}
                        className="header-view"
                        buttonsClassName="btn-fw"
                        forStore={this.props.forStore}
                        ref="actions"/>

                    {this.props.forStore || hideDelete ? null :
                        <div>
                            { actionsDesc.filter(a => !a.hideInHeader).length > 0 ? <hr/> : null }
                            <button type="button" className="btn-flat btn-fw"
                                onClick={this.deleteHandler}>
                                <i className="fa fa-trash m-r-8"/>
                                {i18n.get("form.delete") + (this.props.text ? ' ' + this.props.text : '') }
                            </button>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

ActionsMenu.propTypes = {};
ActionsMenu.defaultProps = {};

export default ActionsMenu;
