/**
 * Created by kib357 on 02/09/15.
 */

import React from 'react';
import AudioControls from '../forms/viewers/audio/AudioControls';
import Html from '../forms/viewers/Html';
import config from '../../stores/configStore';
import i18n from '../../stores/i18nStore';
import cn from 'classnames';
import {propertyTypes, displayTypes} from 'constants';
import find from 'utils/find';
import moment from 'moment';

class DataTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.page = 0;
        this.state.itemsOnPage = props.itemsOnPage ? props.itemsOnPage * 1 : 10;
        this.state.orderBy = '';
        this.state.orderDesc = false;
        this.state.columns = props.storeDesc.tableColumns;
        this.state.items = [];
        this.state.length = 0;
        this.state.loading = true;
        if (props.order) {
            this.state.orderDesc = props.order.indexOf('-') === 0;
            this.state.orderBy = props.order.replace('-', '');
        }
        this.toggleSelect = this.toggleSelect.bind(this);
        this.toggleSelectAll = this.toggleSelectAll.bind(this);
    }

    componentDidMount() {
        this.getData(this.state.page, this.state.itemsOnPage, this.state.orderBy, this.state.orderDesc);
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (JSON.stringify(nextProps) !== JSON.stringify(this.props)) {
            this.getData(this.state.page, this.state.itemsOnPage, this.state.orderBy, this.state.orderDesc, nextProps);
        }
    }

    updateData() {
        this.getData(this.state.page, this.state.itemsOnPage, this.state.orderBy, this.state.orderDesc);
    }

    handleOrder(column) {
        var direction = this.state.orderBy === column ? !this.state.orderDesc : false;
        this.getData(this.state.page, this.state.itemsOnPage, column, direction);
    }

    handlePagination(plus) {
        var page = this.state.page;
        page += (plus ? 1 : -1);
        var length = this.props.items ? this.props.items.length : this.state.length;
        if (page >= 0 && page <= (length / this.state.itemsOnPage)) {
            this.getData(page, this.state.itemsOnPage, this.state.orderBy, this.state.orderDesc);
        }
    }

    handleItemsOnPageChange(e) {
        var value = e.target.value;
        this.getData(0, parseInt(value, 10), this.state.orderBy, this.state.orderDesc);
    }

    getData(page, itemsOnPage, orderBy, orderDesc, nextProps) {
        var props = nextProps || this.props;
        var newState = {
            "loading": false,
            "page": page,
            "itemsOnPage": itemsOnPage,
            "orderBy": orderBy,
            "orderDesc": orderDesc
        };
        var skip = page * itemsOnPage;
        if (props.items) {
            var max = Math.min(skip + itemsOnPage, props.items.length);
            var items = props.items.slice();
            newState.items = items.slice(skip, max);
            this.setState(newState, () => {
                if (typeof this.props.onNavigation === 'function') {
                    this.props.onNavigation(this.state.page, this.state.itemsOnPage, (orderDesc ? '-' : '') + orderBy);
                }
            });
        } else {
            this.setState({"loading": true}, () => {
                var order = (orderDesc ? "-" : "") + orderBy;
                this.props.getData(itemsOnPage, skip, order).then((res) => {
                    if (this.unmounted) {
                        return;
                    }
                    newState.items = res.items || [];
                    newState.length = res.fullCount;
                    this.setState(newState);
                }, (error) => {
                    if (this.unmounted) {
                        return;
                    }
                    this.setState({"loading": false});
                });
            });
        }
    }

    toggleSelect(e) {
        var id = e.currentTarget.getAttribute('data-id');
        var item = find.item(this.state.items, id);
        this.props.onSelect(item);
    }

    toggleSelectAll(e) {
        var clear = e.currentTarget.getAttribute('data-clear') === 'true';
        var items = this.state.items.filter(i => clear ? this.props.isSelected(i) : !this.props.isSelected(i));
        this.props.onSelect(items);
    }

    render() {
        let headerModel = {"$i18n": i18n.getForStore(this.props.storeName)};
        var header = this.state.columns.map((column, index) => {
            let className = cn({
                "number": column.type === propertyTypes.int || column.type === propertyTypes.float,
                "order": this.state.orderBy === column.prop,
                "desc": this.state.orderBy === column.prop && this.state.orderDesc,
                "sortable": !column.disableOrder
            });
            let label = column.label(headerModel);
            return (
                <th className={className} key={column.prop + '-' + index}
                    onClick={column.disableOrder || this.state.loading ? null : this.handleOrder.bind(this, column.prop)}>{label}</th>
            );
        });
        if (this.props.selectable) {
            var allSelected = false;
            for (let i of this.state.items) {
                allSelected = true;
                if (!this.props.isSelected(i)) {
                    allSelected = false;
                    break;
                }
            }
            header.unshift((
                <th key="$select-all" className="checkbox">
                    <button type="button"
                            data-clear={allSelected}
                            onClick={this.toggleSelectAll}
                            className="btn-icon first last">
                        <i className="material-icons light-secondary md-18 text">{allSelected ? "check_box" : "check_box_outline_blank"}</i>
                    </button>
                </th>
            ));
        }
        var length = this.props.items ? this.props.items.length : this.state.length;
        var data = [],
            skip = this.state.page * this.state.itemsOnPage,
            max = Math.min(skip + this.state.itemsOnPage, length);
        var items = this.state.items;
        for (var i = 0; i < items.length; i++) {
            var item = items[i] || {};
            var columns = this.state.columns.map((column) => {
                let text = '', className = '';
                if (column != null) {
                    switch (column.type) {
                        case propertyTypes.date:
                            if (item[column.prop]) {
                                var date = column.utc ? moment.utc(item[column.prop]) : moment(item[column.prop]);
                                text = date.format(column.format || 'DD.MM.YYYY - HH:mm:ss, dd');
                            }
                            break;
                        case propertyTypes.link:
                            text = (<i className="fa fa-download"></i>);
                            break;
                        default:
                            let res = item[column.prop];
                            if (column.options) {
                                for (let i = 0; i < column.options.length; i++) {
                                    if (res === column.options[i].value) {
                                        res = column.options[i].label({"$i18n": i18n.getForStore(this.props.storeName)});
                                    }
                                }
                            }
                            text = res;
                    }
                    switch (column.display) {
                        case displayTypes.audio:
                            text = <AudioControls src={item[column.prop]}/>;
                            break;
                        case displayTypes.html:
                            text = <Html html={column.html} model={{ "value": item[column.prop] }}/>
                    }
                    if (column.tableLink) {
                        text = <a href={'#' + config.findRoute(this.props.storeName) + '/' + item._id}>{text}</a>;
                    }
                    className = cn({
                        "number": column.type === propertyTypes.int || column.type === propertyTypes.float
                    });
                }
                return (
                    <td className={className} key={(item._id || i) + '-' + column.prop}>
                        {text}
                    </td>
                )
            });
            if (this.props.selectable) {
                columns.unshift((
                    <td className="table-check" key={(item._id || i) + '-' + "$select"}>
                        <button type="button"
                                data-id={item._id}
                                data-selected={item._selected ? 1 : 0}
                                onClick={this.toggleSelect}
                                className="btn-icon first last">
                            <i className="material-icons light-secondary md-18 text">
                                {this.props.isSelected(item) ? "check_box" : "check_box_outline_blank"}
                            </i>
                        </button>
                    </td>
                ));
            }
            data.push((
                <tr key={'r-' + (item._id || i)}>
                    {columns}
                </tr>
            ));
        }
        if (!this.props.dynamicHeight && (data.length < this.state.itemsOnPage)) {
            for (var i = data.length; i < this.state.itemsOnPage; i++) {
                data.push((
                    <tr key={'r-' + i}>
                    </tr>
                ));
            }
        }
        let className = cn({
            "pd-data-table": true,
            "loading": this.state.loading
        });
        return (
            <div className="relative">
                <div style={{"overflowX": "auto"}}>
                    <table className={className}>
                        <thead>
                        <tr>
                            {header}
                        </tr>
                        </thead>
                        <tbody>
                        {data}
                        </tbody>
                    </table>
                </div>
                <div className="pd-table-card-footer">
                    {this.state.loading ? <i className="loader fa fa-spinner fa-spin m-r-32"/> : null}
                    <span>{i18n.get('common.recordsOnPage')}</span>

                    <div className="select-control inline m-r-32 m-l-32">
                        <select className="form-control" value={this.state.itemsOnPage}
                                onChange={this.handleItemsOnPageChange.bind(this)}
                                disabled={this.state.loading}>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <i className="material-icons arrow">arrow_drop_down</i>
                    </div>
                    {this.state.items.length > 0 ? (skip + 1) : 0} - {max}&nbsp;/&nbsp;{length}
                    <button onClick={this.handlePagination.bind(this, false)}
                            disabled={this.state.page < 1 || this.state.loading}
                            className="btn-flat m-l-32">
                        <i className="fa fa-angle-left"></i>
                    </button>
                    <button onClick={this.handlePagination.bind(this, true)}
                            disabled={this.state.page >= (length / this.state.itemsOnPage - 1) || this.state.loading}
                            className="btn-flat m-r-14 m-l-24">
                        <i className="fa fa-angle-right"></i>
                    </button>
                </div>
            </div>
        );
    }
}

DataTable.propTypes = {};
DataTable.defaultProps = {};

export default DataTable;
