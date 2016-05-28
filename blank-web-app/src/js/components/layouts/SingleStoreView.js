/**
 * Created by kib357 on 16/08/15.
 */

import React from 'react';
import ItemView from '../item/ItemView';
import configStore from '../../stores/configStore';
import currentItemStore from '../../stores/currentItemStore';
import preferencesStore from '../../stores/preferencesStore';
import appState from '../../stores/appStateStore';
import i18n from '../../stores/i18nStore';
import itemsStoreGroup from '../../stores/itemsStoreGroup';
import itemsActions from '../../actions/itemsActuators';
import { storeEvents } from 'constants';
import template from 'template';

class SingleStoreView extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromStore();
        this.state.store = currentItemStore;
        this._onChange = this._onChange.bind(this);
    }

    getStateFromStore() {
        var state = {};
        state.counter = this.state ? this.state.counter + 1 : 0;
        //console.log("Counter: ", state.counter);
        state.storeName = appState.store;
        state.storeDesc = configStore.getConfig(state.storeName);
        state.item = currentItemStore.get();
        state.itemId = appState.getCurrentItemId();
        return state;
    }

    componentDidMount() {
        itemsStoreGroup.on(storeEvents.CHANGED, this._onChange);
        preferencesStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        itemsStoreGroup.removeListener(storeEvents.CHANGED, this._onChange);
        preferencesStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    shouldComponentUpdate(nextProps, nextState) {
        let shouldUpdate = this.state.counter < nextState.counter;
        return shouldUpdate;
    }

    _onChange() {
        //console.log("SingleStoreView_onChange");
        this.setState(this.getStateFromStore());
    }

    render() {
        if (!this.state.storeDesc.type) {
            return null;
        }
        let title = template.render(this.state.storeDesc.label || '', {"$i18n": i18n.getForStore(this.state.storeName)}) || '?';
        return (
            <ItemView item={this.state.item}
                      title={title}
                      storeName={this.state.storeName}
                      storeDesc={this.state.storeDesc}
                      actions={itemsActions}
                      hideDelete={true}
                      singleStore={true}/>
        );
    }
}

SingleStoreView.propTypes = {};
SingleStoreView.defaultProps = {"subscribe": true};

export default SingleStoreView;
