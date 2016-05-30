/**
 * Created by kib357 on 16/08/15.
 */

import React from "react";
import ListView from "./ListView";
import TableView from "./TableView";
import HtmlView from "./HtmlView";
import Grid from "./GridView";
import Dashboard from "./Dashboard";
import Filters from "../filters/Filters";
import FiltersSummary from "../filters/FiltersSummary";
import FiltersToggle from "../filters/FiltersToggle";
import SideNavToggle from "../nav/SideNavToggle";
import LayoutToggle from "./LayoutToggle";
import ActionsMenu from "../actions/ActionsMenu";
import configStore from "../../stores/configStore";
import listStore from "../../stores/listStore";
import currentItemStore from "../../stores/currentItemStore";
import preferencesStore from "../../stores/preferencesStore";
import filtersStore from "../../stores/filtersStore";
import appState from "../../stores/appStateStore";
import i18n from "../../stores/i18nStore";
import history from "../../stores/historyStore";
import itemsStoreGroup from "../../stores/itemsStoreGroup";
import filtersActions from "../../actions/filtersActuators";
import template from "template";
import {storeTypes, storeDisplayTypes, storeEvents, previewMinWidth} from "constants";
import itemsActions from "../../actions/itemsActuators";

class StoreView extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromStore();
        this.state.store = listStore;
        this._onChange = this._onChange.bind(this);
        this._onPrefChange = this._onPrefChange.bind(this);
        this.searchTextChangedHandler = this.searchTextChangedHandler.bind(this);
    }

    getStateFromStore() {
        var state = {};
        state.counter = this.state ? this.state.counter + 1 : 0;
        //console.log("Counter: ", state.counter);
        state.storeName = appState.store;
        state.storeDesc = configStore.getConfig(state.storeName);
        state.filters = filtersStore.getFilters(state.storeName, true);
        state.searchText = state.filters._default || "";
        state.order = filtersStore.getOrder(state.storeName, state.storeDesc.orderBy);
        state.item = currentItemStore.get();
        state.itemId = appState.getCurrentItemId();
        state.ready = listStore.isReady();
        state.items = state.ready ? listStore.get() : [];
        state.newItems = state.ready ? listStore.getNewItems(true) : [];
        if (state.storeDesc && state.storeDesc.type === storeTypes.process && state.ready) {
            state.counters = listStore.getCounters();
        }
        Object.assign(state, this.getUserPrefs(state));
        return state;
    }

    getUserPrefs(useState) {
        let state = useState || this.state;
        var newState = {};
        let showFiltersPref = preferencesStore.getUserPreference(state.storeName + "-show-filters");
        let filtersCount = 0;
        for (let filterName of Object.keys(state.storeDesc.filters || {})) {
            if (filterName.indexOf("_") !== 0) {
                filtersCount++;
            }
        }
        let displayPref = preferencesStore.getUserPreference(state.storeName + "-display");
        let views = (state.storeDesc.display || "").split(",").map(d => d.trim());
        if (views.indexOf(displayPref) < 0) {
            newState.display = views[0];
        } else {
            newState.display = displayPref;
        }
        newState.showFilters = showFiltersPref === true;// showFiltersPref !== null ? showFiltersPref : (filtersCount > 0);
        return newState;
    }

    componentDidMount() {
        itemsStoreGroup.on(storeEvents.CHANGED, this._onChange);
        preferencesStore.on(storeEvents.CHANGED, this._onPrefChange);
    }

    componentWillUnmount() {
        itemsStoreGroup.removeListener(storeEvents.CHANGED, this._onChange);
        preferencesStore.removeListener(storeEvents.CHANGED, this._onPrefChange);
    }

    shouldComponentUpdate(nextProps, nextState) {
        //let shouldUpdate = listStore.hasChanged() || currentItemStore.hasChanged();
        let shouldUpdate = this.state.counter != nextState.counter;
        // if (!shouldUpdate) {
        //     console.log("StoreView update cancelled");
        // }
        return shouldUpdate;
    }

    _onPrefChange() {
        this.setState(Object.assign({ "counter": this.state.counter + 1 }, this.getUserPrefs()));
    }

    _onChange() {
        //console.log("StoreView_onChange");
        this.setState(this.getStateFromStore());
    }

    requestItems(offset) {
        if (listStore.needLoadItems(offset)) {
            itemsActions.loadItems(offset);
        }
    }

    searchTextChangedHandler(e) {
        var filter = e.target.value;
        clearTimeout(this.state.timer);
        let timer = setTimeout(() => {
            filtersActions.setFilter(this.state.storeName, "_default", filter);
        }, 500);
        this.setState({ "timer": timer, "searchText": filter, "counter": this.state.counter - 1 });
    }

    render() {
        if (!this.state.storeDesc.type) {
            return null;
        }
        let titleText = this.state.storeDesc.label || "";
        let filters = filtersStore.getFilters(this.state.storeName, true);
        if (filters._state) {
            let stateDesc = this.state.storeDesc.states[filters._state];
            titleText += " – " + stateDesc.label;
        }
        let title = template.render(titleText, { "$i18n": i18n.getForStore(this.state.storeName) }) || "?";
        let component, componentProps = {
                "ref": "itemsView",
                "storeName": this.state.storeName,
                "storeDesc": this.state.storeDesc,
                "ready": this.state.ready,
                "store": this.state.store,
                "actions": itemsActions,
                "items": this.state.items,
                "item": this.state.item,
                "newItems": this.state.newItems,
                "itemId": this.state.itemId,
                "counters": this.state.counters,
                "saveDraft": this.saveDraft,
                "requestItems": this.requestItems.bind(this),
                "disableAutoSelect": this.state.storeDesc.disableAutoSelect || (window.innerWidth <= previewMinWidth),
                "title": title
            };
        let listView = false;
        switch (this.state.display) {
            case storeDisplayTypes.table:
                component = TableView;
                break;
            case storeDisplayTypes.grid:
                component = Grid;
                break;
            case storeDisplayTypes.html:
                component = HtmlView;
                break;
            case storeDisplayTypes.dashboard:
                component = Dashboard;
                break;
            default:
                component = ListView;
                listView = true;
                break;
        }
        var itemsContainer = React.createElement(component, componentProps);
        let showBackLink = this.state.display === storeDisplayTypes.grid ||
            this.state.display === storeDisplayTypes.table ||
            window.innerWidth <= previewMinWidth,
            preview = !showBackLink;
        let child = history.createChild(this, {
            storeDesc: this.state.storeDesc || {},
            storeName: this.state.storeName,
            ready: this.state.ready,
            item: this.state.item,
            actions: itemsActions,
            showBackLink: showBackLink
        });
        let showList = !this.state.itemId || (listView && (window.innerWidth > previewMinWidth)),
            showItem = this.state.itemId || (listView && (window.innerWidth > previewMinWidth)),
            showFilters = (!showItem || preview) && (this.state.showFilters);
        return (
            <div className="flex row fill relative">
                <div className="flex column fill relative">
                    {showList &&
                        <div className="store-header">
                            <div className="wrapper">
                                <div className="menu-btn">
                                    <SideNavToggle/>
                                </div>
                                <span className="headline">{title}</span>
                                <div className="search-input">
                                    <input type="text"
                                        id="store-quicksearch"
                                        className={"form-control dark input-sm" + (this.state.searchText ? " open" : "")}
                                        onChange={this.searchTextChangedHandler}
                                        value={this.state.searchText}
                                        placeholder={i18n.get("filters.enterSearchText") }/>
                                    <label htmlFor="store-quicksearch">
                                        <i className="material-icons text">search</i>
                                    </label>
                                </div>
                                <div className="fill"></div>
                                <FiltersToggle storeName={this.state.storeName}/>
                                <LayoutToggle storeDesc={this.state.storeDesc}
                                    storeName={this.state.storeName}/>
                                <ActionsMenu storeDesc={this.state.storeDesc}
                                    storeName={this.state.storeName}
                                    actions={itemsActions}
                                    forStore={true}/>
                            </div>
                        </div>}
                    <FiltersSummary storeName={this.state.storeName}
                        filters={this.state.filters}
                        filtersDesc={this.state.storeDesc.filters}/>

                    <div className="flex row fill">
                        {showList ? itemsContainer : null}
                        {showItem && this.state.ready ? (child ||
                            <div className="flex column fill relative">
                                <div className="item-header no-shrink">
                                    <div className="container item-name"><h2>{i18n.get("form.emptyPreview") }</h2></div>
                                </div>
                            </div>) : null }
                    </div>
                </div>
                <Filters storeName={this.state.storeName} show={showFilters}/>
            </div>
        );
    }
}

StoreView.propTypes = {};
StoreView.defaultProps = { "subscribe": true };

export default StoreView;
