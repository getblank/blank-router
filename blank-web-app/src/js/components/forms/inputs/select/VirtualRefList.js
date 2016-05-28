/**
 * Created by kib357 on 14/09/15.
 */

import React from "react";
import InputBase from "../InputBase";
import DataTable from "../../../misc/DataTable";
import Tabs from "../../../misc/Tabs";
import SimpleLabel from "../../SimpleLabel.js";
import configStore from "../../../../stores/configStore.js";
import updateSignalStore from "../../../../stores/updateSignalStore";
import i18n from "../../../../stores/i18nStore.js";
import {storeEvents} from "constants";

class VirtualRefList extends InputBase {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.value = this.copyValue(this.getValue(props));
        this.state.view = "selected";
        this.state.storeDesc = Object.assign({}, configStore.getConfig(this.props.field.store));
        this.state.storeDesc.tableColumns = this.props.field.tableColumns || this.state.storeDesc.tableColumns;
        this.state.storeName = this.props.field.store;
        this.changeView = this.changeView.bind(this);
        this.getData = this.getData.bind(this);
        this.toggleSelection = this.toggleSelection.bind(this);
        this.isSelected = this.isSelected.bind(this);
        this._onChange = this._onChange.bind(this);
    }

    componentDidMount() {
        updateSignalStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        updateSignalStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        //Reloading data
        this.changeView("selected");
    }

    copyValue(val) {
        return val != null && val.length === 2 ? [val[0].slice(), val[1].slice(0)] : [[], []];
    }

    componentWillReceiveProps(nextProps) {
        var value = this.copyValue(this.getValue(nextProps));
        var itemChanged = this.props.item._id !== nextProps.item._id;// || (this.props.value != null && nextProps.value == null);
        this.setState({"value": value}, () => {
            if (itemChanged) {
                this.changeView("selected");
            }
        });
    }

    changeView(view) {
        this.setState({"view": view}, () => {
            this.refs.table.updateData();
        });
    }

    getData(take, skip, order) {
        var query = {"take": take, "skip": skip, "orderBy": order};
        return this.props.actions.loadRefs(this.props.item._id, this.props.fieldName, this.state.view === "all", query);
        // var searchText = this.state.view === "selected" ? this.props.item._id : "о",
        //     searchFields = this.state.view === "selected" ? this.props.field.foreignKey : "name";
        //return searchActions.search(this.props.field.store, searchText, [searchFields], take, skip, order, loadProps);
    }

    isSelected(item) {
        var value = this.state.value.slice();
        var addedIndex = value[0].indexOf(item._id);
        var deletedIndex = value[1].indexOf(item._id);
        return deletedIndex < 0 && (addedIndex >= 0 || item._selected);
    }

    toggleSelection(items) {
        var added = this.state.value[0].slice();
        var deleted = this.state.value[1].slice();
        var res = [];
        if (!Array.isArray(items)) {
            items = [items];
        }
        for (var item of items) {
            var addedIndex = added.indexOf(item._id);
            var deletedIndex = deleted.indexOf(item._id);
            if (addedIndex >= 0) {
                added.splice(addedIndex, 1);
            }
            if (deletedIndex >= 0) {
                deleted.splice(deletedIndex, 1);
            }
            if (addedIndex < 0 && deletedIndex < 0) {
                if (item._selected) {
                    deleted.push(item._id);
                } else {
                    added.push(item._id);
                }
            }
        }
        if (added.length > 0 || deleted.length > 0) {
            res.push(added);
            res.push(deleted);
        }
        //console.log("Res: ", res);
        this.props.onChange(this.props.fieldName, res);
    }

    render() {
        let {field, user} = this.props;
        let labelText = field.label({"$i18n": i18n.getForStore(this.props.storeName)});
        let tabs = [
            {
                "_id": "selected",
                "label": i18n.get("form.selected"),
            },
            {
                "_id": "all",
                "label": i18n.get("form.all"),
            },
        ];
        let access = field.groupAccess + (user._id === this.props.item._ownerId ? field.ownerAccess : "");
        let disabled = field.disabled(user, this.props.combinedItem) ||
            this.props.readOnly ||
            access.indexOf("u") < 0;
        return (
            <div className="virtual-ref-list">
                <SimpleLabel text={labelText}
                             changed={this.isChanged()}
                             className={field.labelClassName}
                             tooltip={field.tooltip}
                             storeName={this.props.storeName}/>
                { !disabled &&
                    <Tabs value={this.state.view}
                          options={tabs}
                          onChange={this.changeView}/>}
                { field.store && configStore.getConfig(field.store) ?
                    <DataTable ref="table"
                               storeDesc={this.state.storeDesc}
                               storeName={this.state.storeName}
                               getData={this.getData}
                               selectable={!disabled}
                               isSelected={this.isSelected}
                               onSelect={this.toggleSelection}
                               itemsOnPage="5"
                               dynamicHeight="true">
                    </DataTable> :
                    <p>А где брать данные?</p>
                }
            </div>
        );
    }
}

VirtualRefList.propTypes = {};
VirtualRefList.defaultProps = {};

export default VirtualRefList;
