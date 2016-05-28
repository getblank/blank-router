/**
 * Created by kib357 on 16/08/15.
 */

import React from 'react';
import DataTable from '../misc/DataTable';
import FloatingButton from './FloatingButton';
import Loader from '../misc/Loader';
import filtersStore from '../../stores/filtersStore';
import filtersActions from '../../actions/filtersActuators';
import historyActions from '../../actions/historyActuators';
import configStore from '../../stores/configStore';

class TableView extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getState();
        this.navigationHandler = this.navigationHandler.bind(this);
        this.floatingClickHandler = this.floatingClickHandler.bind(this);
    }

    floatingClickHandler() {
        if (this.props.newItems.length < 1) {
            this.props.actions.create();
        } else {
            let item = this.props.newItems[0];
            historyActions.pushState(configStore.findRoute(item.$store) + '/' + item._id);
        }
    }

    getState(nextProps) {
        var props = nextProps || this.props;
        var state = {};
        return state;
    }

    navigationHandler(page, pageSize, newOrder) {
        let order = filtersStore.getOrder(this.props.storeName, this.props.storeDesc.orderBy);
        if (newOrder && order !== newOrder) {
            filtersActions.setOrder(this.props.storeName, newOrder);
        } else {
            this.props.requestItems(page * pageSize);
        }
    }

    render() {
        return (
            <div className="fill flex column layout-table relative">
                <div className="scroll fill">
                    <div className="table-wrapper">
                    {this.props.ready ?
                        <DataTable storeDesc={this.props.storeDesc}
                                   storeName={this.props.storeName}
                                   items={this.props.items}
                                   order={filtersStore.getOrder(this.props.storeName, this.props.storeDesc.orderBy)}
                                   onNavigation={this.navigationHandler}>
                        </DataTable> :
                        <Loader/>
                    }
                    </div>
                </div>
                {this.props.ready && this.props.storeDesc.groupAccess.indexOf('c') >= 0 &&
                    <FloatingButton onClick={this.floatingClickHandler} icon="add"/>}
            </div>
        );
    }
}

TableView.propTypes = {};
TableView.defaultProps = {};

export default TableView;
