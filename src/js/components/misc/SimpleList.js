/**
 * Created by kib357 on 21/05/15.
 */

import React from "react";
import Labels from "../labels/Labels";
import configStore from "../../stores/configStore";
import i18n from "../../stores/i18nStore";
import historyActions from "../../actions/historyActuators";
import { itemStates } from "constants";
import find from "utils/find";
import classnames from "classnames";

var SimpleList = React.createClass({
    getInitialState: function () {
        return {
            itemHeight: this.getItemHeight(),
            itemsTopCount: 0,
            itemsBottomCount: 0,
            renderCount: 10,
            scrollTop: 0,
        };
    },

    getItemHeight: function (props) {
        props = props || this.props;
        var labels = props.config.labels || [], rows = new Set();
        for (let labelDesc of labels) {
            if (labelDesc.showInList && labelDesc.showInList > 0) {
                rows.add(labelDesc.showInList);
            }
        }
        var res = 45 + (20 * rows.size);
        return res;
    },

    getListHeight: function (itemsCount) {
        var container = this.refs.container;
        var containerHeight = container.clientHeight;
        var parentHeight = container.parentElement.clientHeight;
        var fullHeight = itemsCount * this.state.itemHeight;
        var res = Math.min(fullHeight, Math.min(containerHeight, parentHeight));
        //console.log("Height: ", res, " parentHeight: ", parentHeight);
        return res;
    },

    computePosition: function (cb, props) {
        props = props || this.props;
        var res = {};
        var listHeight = this.getListHeight(props.items.length);
        res.renderCount = Math.ceil(listHeight / this.state.itemHeight) + 1;
        res.itemsTopCount = Math.floor(this.state.scrollTop / this.state.itemHeight);
        res.itemsBottomCount = Math.max((props.items.length - res.itemsTopCount - res.renderCount), 0);
        this.setState(res, () => {
            if (typeof cb === "function") {
                cb();
            }
        });
    },

    scrollTo: function (index) {
        this.computePosition(() => {
            if (index < this.state.itemsTopCount || index > this.state.itemsTopCount + this.state.renderCount) {
                console.log("ScrollTo. Index: ", index, " itemsTopCount: ", this.state.itemsTopCount, " itemsBottomCount: ", this.state.itemsBottomCount);
                let scrollTop = this.state.itemHeight * index;
                this.refs.container.scrollTop = scrollTop;
                this.onScroll();
            }
        });
    },

    onScroll: function () {
        var container = this.refs.container;
        var scrollTop = container.scrollTop;
        this.setState({ "scrollTop": scrollTop }, () => {
            this.computePosition(() => {
                if (typeof this.props.onScroll === "function") {
                    this.props.onScroll(this.state.itemsTopCount);
                }
            });
        });
    },

    componentDidMount: function () {
        this.checkSelection();
        this.computePosition();
    },

    componentWillReceiveProps: function (nextProps) {
        let itemHeight = this.getItemHeight(nextProps);
        if (itemHeight !== this.state.itemHeight) {
            this.setState({
                "itemHeight": itemHeight
            }, () => {
                this.checkSelection(nextProps);
                this.computePosition(null, nextProps);
            });
        } else {
            this.checkSelection(nextProps);
            this.computePosition(null, nextProps);
        }
    },

    render: function () {
        var start = this.state.itemsTopCount;
        var end = this.state.itemsTopCount + this.state.renderCount;
        var currentId = this.props.currentId;
        //console.log("SimpleList render!!!! Start: ", start, " end: ", end);

        var data = this.props.items.slice(start, end);
        var items = [];
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            if (item == null) {
                items.push(<a key={"item-" + i}
                    style={{ "height": this.state.itemHeight }}
                    className={"item" + (this.props.multi ? " selectable" : "") }>
                    <i className="fa fa-spin fa-spinner"/>
                </a>
                );
                continue;
            }

            var name = configStore.getItemName(item, this.props.storeName);
            //Highlighting name if searchText
            if (name && item.$state !== itemStates.new && this.props.searchText) {
                var searchData = find.escapeRegExp(this.props.searchText).trim().split(" ");
                searchData = searchData.filter(i => i);
                var reg = new RegExp("(" + searchData.join("|") + ")", "ig");
                name = name.split(reg);
                for (let j = 1; j < name.length; j += 2) {
                    name[j] = <span key={j + "number"} className="highlight">{name[j]}</span>;
                }
            }
            items.push(<a key={item._id}
                style={{ "height": this.state.itemHeight }}
                className={"item" + (item._id === currentId ? " active" : "") + (this.props.multi ? " selectable" : "") }
                data-id={item._id}
                onClick={this.selectItem}>
                <div className="item-name">{name}</div>
                <div className="item-extra">
                    <Labels item={item} storeDesc={this.props.config} storeName={this.props.storeName} container="list"></Labels>
                </div>
                <span className={(item.$state !== "ready" ? "" : "hidden") }>*</span>
                {this.props.multi ?
                    <div className="item-selection-box" data-id={item._id} onClick={this.handleCheckedChange}>
                        <i className={"fa fa-fw " + (item.$selected ? "fa-check-square-o" : "fa-square-o") }/>
                    </div> : null}
            </a>);
        }

        var topStyle = { height: this.state.itemsTopCount * this.state.itemHeight };
        items.unshift(
            <div style={topStyle} key="top"></div>
        );

        var bottomStyle = { height: this.state.itemsBottomCount * this.state.itemHeight };
        items.push(
            <div style={bottomStyle} key="bottom"></div>
        );

        var cn = classnames("items-list", this.props.className);
        return (
            <div className={cn} ref="container"
                onScroll={this.onScroll}>
                {this.props.items.length > 0 ? items :
                    <i style={{ "display": "inline-block", "padding": "15px" }}>
                        {this.props.searchText ? i18n.get("lists.notFound") : i18n.get("lists.empty") }
                    </i>}
                {this.props.items.length > 0 &&
                    <div className="counter">
                        {start + 1} - {end - 1}&nbsp;/&nbsp;{this.props.items.length}
                    </div>
                }
            </div>
        );
    },
    selectItem: function (e) {
        var route = configStore.findRoute(this.props.storeName);
        var itemId = e.currentTarget.getAttribute("data-id");
        route += "/" + itemId;
        historyActions.pushState(route);
        if (typeof this.props.onSelected === "function") {
            this.props.onSelected(itemId);
        }
    },
    handleCheckedChange: function (e) {
        e.stopPropagation();
        if (typeof this.props.onChecked === "function") {
            var id = e.currentTarget.getAttribute("data-id");
            this.props.onChecked(id);
            //historyActions.pushState(this.props.itemRoute, {"itemId": 'multi', "state": this.params.get("state")});
        }
    },
    checkSelection: function (props) {
        props = props || this.props;
        if (props.autoSelect && props.currentId == null) {
            console.log("checkSelection, store: ", props.storeName);
            var items = props.items || [];
            items.every(item => {
                if (item.$state !== itemStates.deleted) {
                    var route = configStore.findRoute(props.storeName) + "/" + item._id;
                    historyActions.replaceState(route);
                    if (typeof props.onSelected === "function") {
                        props.onSelected(item._id);
                    }
                    return false;
                }
                return true;
            });
        }
    },
});

module.exports = SimpleList;