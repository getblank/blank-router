/**
 * Created by kib357 on 06/09/15.
 */

import React from 'react';
import preferencesStore from '../../stores/preferencesStore.js';
import preferencesActions from '../../actions/preferencesActuators.js';
import configStore from '../../stores/configStore.js';

class FiltersToggle extends React.Component {
    toggleFilters(e) {
        e.preventDefault();
        e.stopPropagation();
        var current = preferencesStore.getUserPreference(this.props.storeName + '-show-filters');
        //preferencesActions.setPreference(this.props.storeName + '-show-filters', current === null ? false : !current);
        preferencesActions.setPreference(this.props.storeName + '-show-filters', !current);
    }

    render() {
        var desc = configStore.getConfig(this.props.storeName);
        return (
            desc.filters && Object.keys(desc.filters).filter(fname => fname.indexOf('_') !== 0).length > 0 ?
                <button type="button" className="btn-icon first dark" onClick={this.toggleFilters.bind(this)}>
                    <i className="material-icons text">filter_list</i>
                </button> :
                null
        );
    }
}

FiltersToggle.propTypes = {};
FiltersToggle.defaultProps = {};

export default FiltersToggle;
