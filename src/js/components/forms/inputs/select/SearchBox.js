/**
 * Created by kib357 on 24/05/15.
 */

import React from "react";
import configStore from "../../../../stores/configStore";
import searchActions from "../../../../actions/searchActuators";
import check from "utils/check";
import find from "utils/find";
import template from "template";
import classnames from "classnames";

var SearchBox = React.createClass({
    getDefaultProps: function () {
        return { "optionsOnPage": 5, "pages": true, "viewProp": "name" };
    },
    getInitialState: function () {
        return {
            "selectedOptions": null,
            "searching": false,
            "options": this.props.options || [],
            "optionsCount": this.props.options ? this.props.options.length : 0,
            "searchText": "",
            "searchPage": 0,
            "i": 0,
        };
    },
    focus: function (e) {
        if (this.props.disabled) {
            return;
        }
        if (e.target.classList.contains("search-box")) {
            this.refs["input"].focus();
        }
    },
    onFocus: function (e) {
        this.open();
        if (typeof this.props.onFocus === "function") {
            this.props.onFocus();
        }
    },
    onBlur: function (e) {
        if (typeof this.props.onBlur === "function") {
            this.props.onBlur();
        }
    },
    searchHandle: function (e) {
        var value = e.target.value;
        this.setState({ "searchText": value, "searchPage": 0, "i": 0 }, this.search);
    },
    next: function (e) {
        if (this.nextEnabled()) {
            this.setState({ "searchPage": this.state.searchPage + 1, "i": 0 }, this.search);
        }
    },
    nextEnabled: function () {
        return this.state.optionsCount / this.props.optionsOnPage > (this.state.searchPage + 1);
    },
    prev: function (e) {
        if (this.prevEnabled()) {
            this.setState({ "searchPage": this.state.searchPage - 1, "i": 0 }, this.search);
        }
    },
    prevEnabled: function () {
        return this.state.searchPage > 0;
    },
    search: function () {
        var self = this,
            searchText = this.state.searchText + (this.props.searchText ? " " + this.props.searchText : "");
        this.setState({ "searching": true }, function () {
            var take, skip;
            if (this.props.pages) {
                take = this.props.optionsOnPage;
                skip = this.state.searchPage * this.props.optionsOnPage;
            }
            searchActions.search(this.props.entityName, searchText, this.props.searchFields, take, skip).then(function (res) {
                if (res.text !== self.state.searchText + (self.props.searchText ? " " + self.props.searchText : "")) {
                    return;
                }
                if (self.isMounted()) {
                    self.setState({ "optionsCount": res.count, "options": res.items, "searching": false });
                }
            }, function (error) {
                console.log("Search error");
                console.log(error);
            });
        });
    },
    open: function () {
        if (this.props.disabled) {
            return;
        }
        this.setState({ "opened": true }, function () {
            this.manageListeners();
            this.search();
        });
    },
    close: function () {
        this.setState({ "opened": false, "searchText": "", "i": 0 }, this.manageListeners);
    },
    onKeyDown: function (event) {
        //console.log(event);
        switch (event.code) {
            case "ArrowLeft":
                event.preventDefault();
                this.prev();
                break;
            case "ArrowRight":
                event.preventDefault();
                this.next();
                break;
            case "ArrowDown":
            case "ArrowUp":
                if (this.state.options.length > 0) {
                    event.preventDefault();
                    this.setKeyboardIndex(0, event.code === "ArrowDown");
                }
                break;
            case "Enter":
                if (this.state.i > 0) {
                    event.preventDefault();
                    this.select(this.state.options[this.state.i - 1]);
                }
                break;
            case "Backspace":
                if (!this.state.searchText &&
                    Array.isArray(this.props.value) && this.props.value.length > 0) {
                    this.unSelect({ "_id": this.props.value[this.props.value.length - 1] });
                }
                break;
            case "Escape":
            case "Tab":
                this.close();
                break;
        }
    },
    setKeyboardIndex: function (iteration, inc, baseIndex) {
        if (iteration > this.state.options.length) {
            return;
        }
        baseIndex = baseIndex == null ? this.state.i : baseIndex;
        let i = baseIndex + (inc ? 1 : -1);
        if (i > this.state.options.length) {
            i = 1;
        }
        if (i < 1) {
            i = this.state.options.length;
        }
        var item = this.state.options[i - 1];
        var goNext = check.any(this.state.selectedOptions, function (_item) {
            return _item._id === item._id;
        }) || (this.props.disabledOptions && this.props.disabledOptions.indexOf(item._id) >= 0);
        if (goNext) {
            this.setKeyboardIndex(++iteration, inc, i);
        } else {
            this.setState({ "i": i });
        }
    },
    select: function (item, e) {
        if (e) {
            e.preventDefault();
        }
        var id = item._id;
        if (typeof this.props.onChange === "function") {
            if (this.props.multi === true) {
                var propsValue = this.props.value;
                if (!Array.isArray(this.props.value)) {
                    propsValue = [];
                }
                var selectedOptions = propsValue.slice();
                if (propsValue.indexOf(id) < 0) {
                    selectedOptions.push(id);
                }
                this.props.onChange(selectedOptions);
            } else {
                this.close();
                this.props.onChange(id, item);
            }
        }
    },
    unSelect: function (item, e) {
        if (e) {
            e.preventDefault();
        }
        var id = item._id;
        if (typeof this.props.onChange === "function") {
            if (this.props.multi === true) {
                if (!Array.isArray(this.props.value)) {
                    return;
                }
                var index = this.props.value.indexOf(id);
                var selectedOptions = this.props.value.slice();
                selectedOptions.splice(index, 1);
                this.props.onChange(selectedOptions);
            } else {
                this.props.onChange(null, null);
            }
        }
    },
    render: function () {
        var isEmpty = this.props.value == null || this.props.value.length === 0;
        var containerClass = "search-box" +
            (this.props.required && isEmpty && !this.props.disabled ? " required" : "") +
            (this.props.narrow ? " narrow" : "") +
            (this.props.wide ? " wide" : "") +
            (this.props.disabled ? " disabled" : "");
        if (this.state.selectedOptions === null) {
            return (
                <div className={containerClass}>
                    <i className="fa fa-spin fa-spinner" style={{ "margin": "7px 0" }}/>
                </div>
            );
        }
        var selected = this.state.selectedOptions.map(function (option) {
            let text = option[this.props.searchFields[0]],
                href = "#" + configStore.findRoute(this.props.entityName) + "/" + option._id;
            if (this.props.selectedTemplate) {
                text = template.render(this.props.selectedTemplate, option, true);
            }
            return (
                <div key={"sb-s-" + option._id} className="selected">
                    <a href={href} title={text} tabIndex="-1">{text}</a>
                    {this.props.disabled ? null :
                        <i className="fa fa-remove" onClick={this.unSelect.bind(this, option) }></i>}
                </div>
            );
        }, this);
        var options = this.state.options.map(function (item, index) {
            var active = check.any(this.state.selectedOptions, function (i) {
                return i._id === item._id;
            });
            var disabled = this.props.disabledOptions && this.props.disabledOptions.indexOf(item._id) >= 0;
            var info = this.props.searchFields.map(function (field) {
                return (<span key={"sb-sf-" + field}>{item[field] ? item[field] : "-"}</span>);
            });
            var cn = classnames("search-box-option", {
                "active": active,
                "disabled": disabled,
                "keyboard-hover": index + 1 === this.state.i,
            });
            return (
                <div key={"sb-o-" + item._id}
                    className={cn}
                    onClick={disabled ? null : this.select.bind(this, item) }>
                    {info}
                </div>
            );
        }, this);
        var from = Math.min(this.state.optionsCount, this.state.searchPage * this.props.optionsOnPage + 1),
            to = Math.min(this.state.optionsCount, (this.state.searchPage + 1) * this.props.optionsOnPage),
            prevEnabled = this.prevEnabled(),
            nextEnabled = this.nextEnabled();
        return (
            <div className={containerClass}
                ref="box"
                onClick={this.focus}>
                {selected}
                {this.props.disabled ? null :
                    <input className="search-box-input" type="text" ref="input" value={this.state.searchText}
                        onChange={this.searchHandle} onFocus={this.onFocus} onBlur={this.onBlur}/> }
                {this.state.opened ?
                    <div className="results">
                        <div>
                            {this.props.pages ?
                                <div className="header">
                                    <div className="current-items">{from}-{to}</div>
                                    &nbsp; /&nbsp;
                                    {this.state.optionsCount}&nbsp;
                                    <a className={prevEnabled ? "" : "disabled" }
                                        onClick={prevEnabled ? this.prev : null}>
                                        <i className="fa fa-chevron-left"/>
                                    </a>
                                    <a className={nextEnabled ? "" : "disabled" }
                                        onClick={nextEnabled ? this.next : null}>
                                        <i className="fa fa-chevron-right"/>
                                    </a>
                                    {this.state.searching ? <i className="fa fa-spin fa-spinner"/> : null }
                                </div> :
                                <div className="header">
                                    {this.state.optionsCount}
                                </div> }
                            <div className="options">
                                {this.state.searching ? <div className="overlay"></div> : null }
                                {options}
                            </div>
                        </div>
                    </div> : null}
            </div>
        )
            ;
    },
    handleDocumentClick: function (e) {
        var box = this.refs["box"];
        if (box == null) {
            this.close();
            return;
        }
        if (e.target === box || box.contains(e.target)) {
            return;
        }
        this.close();
    },
    manageListeners: function () {
        if (this.state.opened) {
            this.refs.input.addEventListener("keydown", this.onKeyDown);
            document.addEventListener("click", this.handleDocumentClick);
        } else {
            this.refs.input.removeEventListener("keydown", this.onKeyDown);
            document.removeEventListener("click", this.handleDocumentClick);
        }
    },
    componentWillReceiveProps: function (nextProps) {
        if (this.props.value !== nextProps.value) {
            this.loadSelectedOptions(nextProps);
        }
    },
    componentDidMount: function () {
        this.loadSelectedOptions();
    },
    componentWillUnmount: function () {
        if (this.refs.input) {
            this.refs.input.removeEventListener("keydown", this.onKeyDown);
        }
    },
    loadSelectedOptions: function (nextProps) {
        var props = nextProps || this.props;
        if (props.value != null && props.value.length !== 0) {
            var self = this;
            var selectedIds = [];
            if (Array.isArray(props.value)) {
                for (var i = 0; i < props.value.length; i++) {
                    selectedIds.push(this._getId(props.value[i]));
                }
            } else {
                selectedIds[0] = this._getId(props.value);
            }
            searchActions.searchByIds(props.entityName, selectedIds).then(function (res) {
                var selectedOptions = [];
                for (var i = 0; i < selectedIds.length; i++) {
                    var option = find.itemById(res, selectedIds[i]);
                    if (option == null) {
                        continue;
                    }
                    selectedOptions.push(option);
                }
                if (props.value === self.props.value) {
                    if (self.isMounted()) {
                        self.setState({ "selectedOptions": selectedOptions, "searchPage": 0, "i": 0 });
                    }
                    if (typeof self.props.onOptionsLoaded === "function") {
                        self.props.onOptionsLoaded(selectedOptions);
                    }
                }
            }, function (error) {
                console.log(error);
            });
        } else {
            this.setState({ "selectedOptions": [], "searchPage": 0, "i": 0 });
        }
    },
    _getId: function (item) {
        if (typeof item === "string") {
            return item;
        }
        if (typeof item === "object") {
            return item._id;
        }
        return null;
    }
})
    ;

export default SearchBox;
module.exports = SearchBox;