/**
 * Created by kib357 on 20/12/15.
 */

import React from 'react';
import Labels from '../labels/Labels.js';
import SideNavToggle from '../nav/SideNavToggle';
import ActionsMenu from '../actions/ActionsMenu';
import ItemName from './ItemName.js';
import Tabs from '../misc/Tabs';
import i18n from '../../stores/i18nStore.js';
import credentialsStore from '../../stores/credentialsStore';
import changesProcessor from '../../utils/changesProcessor.js';
import {storeTypes, storeDisplayTypes} from 'constants';

class ItemHeader extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    cancel() {
        let item = this.props.item;
        item.$changedProps = {};
        this.saveDraft(item);
    }

    performAction(actionId, data) {
        if (this.refs.actions != null) {
            this.refs.actions.performAction(actionId, data);
        } else {
            console.warn("ItemHeader: Cannot perform action - actions component not found");
        }
    }

    render() {
        let user = credentialsStore.getUser(), {item, storeDesc, storeName} = this.props;
        let access = storeDesc.groupAccess + (user._id === item._ownerId ? storeDesc.ownerAccess : '');
        let showButtons = access.indexOf('u') >= 0 || item.$state === 'new',
            disableDelete = (access.indexOf('d') < 0 && this.props.item.$state !== 'new') ||
                storeDesc.type === storeTypes.single ||
                storeDesc.display === storeDisplayTypes.single;

        return (
            <div>
                <div className="m-b-14">
                    <Labels item={item}
                        storeDesc={this.props.storeDesc}
                        storeName={this.props.storeName}
                        container="form"/>
                    <div className="flex controls">
                        {this.props.singleStore && <div className="menu-btn">
                            <SideNavToggle/>
                        </div>}
                        <ItemName storeDesc={this.props.storeDesc}
                            storeName={this.props.storeName}
                            item={item}
                            combinedItem={this.props.combinedItem}
                            onChange={this.props.onChange}/>
                        {showButtons && <button type="submit"
                            tabIndex="-1"
                            className="btn-icon dark save-btn relative"
                            form="item-view-form"
                            onClick={this.props.onSave}
                            disabled={!changesProcessor.canSave(this.props.item) }>
                            <i className="material-icons text">save</i>
                            <span>{i18n.get('form.save') }</span>
                        </button>}
                        {showButtons && <button type="button"
                            tabIndex="-1"
                            className="btn-icon dark cancel-btn"
                            onClick={this.props.onCancel}
                            disabled={!changesProcessor.canUndo(this.props.item) }>
                            <i className="material-icons text">undo</i>
                            <span>{i18n.get('form.cancel') }</span>
                        </button>}
                        <ActionsMenu ref="actions"
                            disableDelete={disableDelete}
                            storeDesc={this.props.storeDesc}
                            storeName={this.props.storeName}
                            item={item}
                            actions={this.props.actions}
                            onDelete={this.props.onDelete}>
                        </ActionsMenu>
                    </div>
                    <div className="relative">
                        {this.props.showBackLink &&
                            <button type="button" className="btn-icon dark back-link"
                                onClick={this.props.onShowStore}>
                                <i className="material-icons text">arrow_back</i>
                            </button>}
                    </div>
                    {/*<Delete handle={this.deleteHandler}/>*/}
                </div>
                <div className="tabs">
                    { this.props.tabs.length > 1 ?
                        <Tabs value={this.props.tab}
                            options={this.props.tabs}
                            dark={true}
                            onChange={this.props.onTabChange}/> : null }
                </div>
            </div>
        );
    }
}

ItemHeader.propTypes = {};
ItemHeader.defaultProps = {};

export default ItemHeader;
