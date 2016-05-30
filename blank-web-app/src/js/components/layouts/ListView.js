/**
 * Created by kib357 on 09/06/15.
 */

import React from "react";
import SimpleList from "../misc/SimpleList";
import FloatingButton from "./FloatingButton";
import Loader from "../misc/Loader";
import filterActions from "../../actions/filtersActuators";
import filtersStore from "../../stores/filtersStore";
import {storeEvents} from "constants";
import find from "utils/find";
import classnames from "classnames";

class ListView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        let filters = filtersStore.getFilters(this.props.storeName);
        this.state.searchText = filters._default || "";
        this.floatingClickHandler = this.floatingClickHandler.bind(this);
        this.handleSearchTextChange = this.handleSearchTextChange.bind(this);
        this.onScrollHandler = this.onScrollHandler.bind(this);
        this._onFilterChange = this._onFilterChange.bind(this);
    }

    componentWillUnmount() {
        clearTimeout(this.state.timer);
        filtersStore.removeListener(storeEvents.CHANGED, this._onFilterChange);
    }

    componentWillReceiveProps(nextProps) {
        let filters = filtersStore.getFilters(nextProps.storeName);
        this.setState({"searchText": filters._default || ""});
    }

    floatingClickHandler() {
        if (this.props.newItems.length < 1) {
            this.props.actions.create();
        } else {
            this.props.actions.delete(this.props.newItems[0]);
        }
    }

    handleSearchTextChange(e) {
        var filter = e.target.value;
        clearTimeout(this.state.timer);
        let timer = setTimeout(() => {
            filterActions.setFilter(this.props.storeName, "_default", filter);
        }, 250);
        this.setState({"timer": timer, "searchText": filter});
    }

    onScrollHandler(topCount) {
        this.props.requestItems(topCount);
    }

    componentDidMount() {
        if (this.refs.list != null && this.props.item != null) {
            let index = find.index(this.props.items, this.props.item._id, "_id", true);
            this.refs.list.scrollTo(index);
        }
        filtersStore.on(storeEvents.CHANGED, this._onFilterChange);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.refs.list != null && this.props.item != null &&
            (prevProps.item == null || prevProps.item._id != this.props.item._id)) {
            let index = find.index(this.props.items, this.props.item._id, "_id", true);
            this.refs.list.scrollTo(index);
        }
    }

    _onFilterChange() {
        let filter = filtersStore.getFilters(this.props.storeName)._default;
        this.setState({"searchText": filter || ""});
    }

    render() {
        if (!this.props.storeDesc) {
            return (
                <h1 style={{"marginLeft": "50px"}}>Store config not found: {this.props.store.entityName}</h1>
            );
        }
        let floatingCn = classnames({
            "top": !this.props.items || this.props.items.length === 0,
            "add": this.props.newItems.length === 0,
            "cancel": this.props.newItems.length > 0,
        });
        return (
            <div className="list-view-container flex column no-shrink relative">
                {/*<div className="toolbar">
                    <div className="search-input">
                        <input type="text" className="form-control input-sm"
                               onChange={this.handleSearchTextChange}
                               value={this.state.searchText}
                               placeholder={i18n.get('filters.enterSearchText')}/>
                        <i className="fa fa-lg fa-search"/>
                    </div>
                </div>*/}
                {this.props.ready ?
                    <SimpleList ref="list"
                                items={this.props.items}
                                currentId={this.props.itemId}
                                currentItem={this.props.item}
                                storeName={this.props.storeName}
                                storeDesc={this.props.storeDesc}
                                config={this.props.storeDesc}
                                itemHeight={45}
                                autoSelect={!this.props.disableAutoSelect}
                                searchText={this.state.searchText}
                                onScroll={this.onScrollHandler}>
                    </SimpleList> :
                    <Loader/>
                }
                {this.props.ready && this.props.storeDesc.groupAccess.indexOf("c") >= 0 &&
                    <FloatingButton onClick={this.floatingClickHandler} className={floatingCn} icon="add"/>}
            </div>
        );
    }
}

export default ListView;