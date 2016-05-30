/**
 * Created by kib357 on 15/10/15.
 */

import React from "react";
import EditorBase from "../forms/EditorBase";
import ItemHeader from "./ItemHeader";
import Loader from "../misc/Loader";
import SimpleForm from "../forms/SimpleForm";
import configStore from "../../stores/configStore";
import credentialsStore from "../../stores/credentialsStore";
import i18n from "../../stores/i18nStore";
import filtersActions from "../../actions/filtersActuators";
import historyActions from "../../actions/historyActuators";
import changesProcessor from "../../utils/changesProcessor";
import template from "template";
import validation from "validation";
import {itemStates, displayTypes, propertyTypes} from "constants";
import find from "utils/find";

class ItemView extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getState(props);
        this.state.focusActuator = false;

        this.saveDraft = this.saveDraft.bind(this);
        this.save = this.save.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.cancel = this.cancel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    componentDidMount() {
        document.addEventListener("keydown", this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getState(nextProps));
    }

    getState(props) {
        let {storeDesc, storeName, item} = props,
            user = credentialsStore.getUser(),
            state = {
                "disableAutoComplete": false,
                "tabs": (this.state ? this.state.tabs : []),
                "currentTab": (this.state ? this.state.currentTab : null),
                "combinedItem": {},
            };

        if (item == null || ([itemStates.ready, itemStates.modified, itemStates.saving, itemStates.new]).indexOf(item.$state) < 0) {
            return state;
        }

        state.tabs = [];
        state.combinedItem = changesProcessor.combineItem(item, true, true);

        let model = Object.assign({ "$i18n": i18n.getForStore(storeName) }, item),
            usedTabsIds = [],
            changedTabsIds = [];

        for (let propName of Object.keys(storeDesc.props)) {
            let propDesc = storeDesc.props[propName];
            if (propDesc && (propDesc.display === displayTypes.password || propDesc.type === propertyTypes.password)) {
                state.disableAutoComplete = true;
                break;
            }
            if (!EditorBase.isPropHidden(storeDesc, propDesc, user, state.combinedItem) &&
                usedTabsIds.indexOf(propDesc.formTab) < 0) {
                usedTabsIds.push(propDesc.formTab);
            }
            if (item.$changedProps &&
                item.$changedProps.hasOwnProperty(propName) &&
                changedTabsIds.indexOf(propDesc.formTab) < 0) {
                changedTabsIds.push(propDesc.formTab);
            }
        }

        for (var i = 0; i < storeDesc.formTabs.length; i++) {
            let tabDesc = storeDesc.formTabs[i];
            if (usedTabsIds.indexOf(tabDesc._id) < 0 ||
                tabDesc.hidden(user, state.combinedItem)) {
                continue;
            }
            let changed = changedTabsIds.indexOf(tabDesc._id) >= 0;
            state.tabs.push({
                "_id": tabDesc._id,
                "label": template.render(tabDesc.label, model) + (changed ? " *" : "")
            });
        }

        if (state.tabs.length < 1) {
            state.currentTab = null;
        } else {
            if (state.currentTab == null || find.index(state.tabs, state.currentTab) < 0) {
                state.currentTab = state.tabs[0]._id;
            }
        }

        return state;
    }

    handleKeyDown(e) {
        if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
            e.preventDefault();
            this.save();
        }
    }

    handleDelete() {
        this.props.actions.delete(this.props.item);
    }

    handleShowStore() {
        var route = configStore.findRoute(this.props.storeName);
        historyActions.pushState(route);
    }


    clearFilter() {
        filtersActions.clearFilter(this.props.storeName);
    }

    saveDraft(item) {
        //console.log(item);
        this.props.actions.saveDraft(item);
    }

    save(e) {
        if (e) {
            e.preventDefault();
        }
        let invalidProps = validation.validate(this.props.storeDesc.props, this.props.item, null, credentialsStore.getUser());
        if (Object.keys(invalidProps).length > 0) {
            //Getting all store tabs ids
            let tabIds = this.props.storeDesc.formTabs.map(tabDesc => tabDesc._id);

            if (tabIds.length > 0) {
                let invalidTabIds = [], changeTab = true;
                for (let propName of Object.keys(invalidProps)) {
                    let tabId = this.props.storeDesc.props[propName].formTab;

                    // Focusing invalid control if it on current tab
                    if (tabId === this.state.currentTab) {
                        this.focusFirstInvalid();
                        changeTab = false;
                        break;
                    }

                    if (invalidTabIds.indexOf(tabId) < 0) {
                        invalidTabIds.push(tabId);
                    }
                }
                if (changeTab) {
                    //Selecting first invalid tab
                    for (let tabId of tabIds) {
                        if (invalidTabIds.indexOf(tabId) >= 0) {
                            this.setState({ "currentTab": tabId, "focusActuator": !this.state.focusActuator });
                        }
                    }
                }
            } else {
                this.focusFirstInvalid();
            }

            console.warn("Invalid props: ", validation.getPlainPropsNames(this.props.item.$invalidProps));
            let item = this.props.item;
            item.$touched = true;
            this.saveDraft(item);
        } else {
            this.props.actions.save(this.props.item);
        }
    }

    performAction(actionId, data) {
        if (actionId === "$save") {
            this.save();
            return;
        }
        if (this.refs.header != null) {
            this.refs.header.performAction(actionId, data);
        } else {
            console.warn("ItemView: Cannot perform action - header component not found");
        }
    }

    selectTab(tabId) {
        this.setState({ "currentTab": tabId });
    }

    cancel() {
        let item = this.props.item;
        item.$changedProps = {};
        item.$dirtyProps = {};
        item.$touchedProps = {};
        item.$touched = false;
        this.saveDraft(item);
    }

    focusFirstInvalid() {
        if (this.refs.form) {
            let invalid = this.refs.form.querySelector(".invalid input");
            if (invalid) {
                invalid.focus();
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.focusActuator !== prevState.focusActuator) {
            this.focusFirstInvalid();
        }
    }

    render() {
        let item = this.props.item;
        if (item == null) {
            return null;
        }

        let header = null, form = null;
        switch (item.$state) {
            case itemStates.ready:
            case itemStates.modified:
            case itemStates.saving:
            case itemStates.new:
                header = (
                    <ItemHeader ref="header"
                        item={this.props.item}
                        combinedItem={this.state.combinedItem}
                        onDelete={this.handleDelete}
                        onChange={this.saveDraft}
                        onSave={this.save}
                        onCancel={this.cancel}
                        onShowStore={this.handleShowStore.bind(this) }
                        actions={this.props.actions}
                        storeDesc={this.props.storeDesc}
                        storeName={this.props.storeName}
                        tabs={this.state.tabs}
                        tab={this.state.currentTab}
                        showBackLink={this.props.showBackLink}
                        onTabChange={this.selectTab.bind(this) }
                        singleStore={this.props.singleStore}/>
                );
                form = (
                    <div ref="form">
                        <SimpleForm id="item-view-form"
                            storeDesc={this.props.storeDesc}
                            storeName={this.props.storeName}
                            disableAutoComplete={this.state.disableAutoComplete}
                            item={item}
                            actions={this.props.actions}
                            onChange={this.saveDraft}
                            hideButtons={true}
                            tab={this.state.currentTab}
                            user={credentialsStore.getUser() }
                            performAction={this.performAction.bind(this) }/>
                    </div>
                );
                break;
            case itemStates.loading:
                header = <Loader/>;
                break;
            case itemStates.notMatchFilter:
                header = <div className="item-name"><h1>{this.props.item.name}</h1></div>;
                form = (
                    <div>
                        <h2>{i18n.get("form.filterNotMatch") }</h2>
                        <button onClick={this.clearFilter.bind(this) }
                            className="btn-flat first last">
                            {i18n.get("filters.clear") + " " + i18n.get("filters.title") }
                        </button>
                    </div>
                );
                break;
            case itemStates.deleted:
                header = <div className="item-name"><h1>{i18n.get("form.deleted") }</h1></div>;
                break;
            case itemStates.error:
                header = <div className="item-name"><h1>{item.$error}</h1></div>;
                break;
            default:
                header = (
                    <div className="item-name">
                        <p>{item.$state}</p>

                        <p>{item.$error}</p>
                    </div>
                );
                break;
        }


        return (
            <div className="item-view flex column fill relative">
                <div className={"item-header no-shrink" + (this.props.singleStore ? " single-store" : "") }>
                    <div className="container">
                        {header}
                    </div>
                </div>
                <div className="item-content">
                    <div className="container" style={{ "paddingTop": "14px" }}>
                        {form}
                    </div>
                </div>
            </div>
        );
    }
}

ItemView.propTypes = {};
ItemView.defaultProps = {};

export default ItemView;