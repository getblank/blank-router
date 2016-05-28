/**
 * Created by kib357 on 06/09/15.
 */

import React from 'react';
import { displayTypes } from 'constants';
import ValueConverter from './ValueConverter';
import i18n from '../../stores/i18nStore';
import filtersActions from '../../actions/filtersActuators';
import moment from 'moment';
import classNames from 'classnames';

class FiltersSummary extends React.Component {
    clear(e) {
        e.preventDefault();
        filtersActions.clearFilter(this.props.storeName);
        if (typeof this.props.onClear === 'function') {
            this.props.onClear();
        }
    }

    render() {
        // if (prefsStore.getUserPreference(this.props.storeName + '-show-filters')) {
        //     return null;
        // }
        var filters = Object.keys(this.props.filters).map((filterName) => {
            var filter = this.props.filters[filterName];
            var desc = this.props.filtersDesc[filterName];
            if (desc == null || filterName === '_state') {
                return null;
            //     if (prefsStore.getUserPreference(this.props.storeName + '-show-filters')) {
            //         return null;
            //     }
            //     let config = configStore.getConfig(this.props.storeName);
            //     let label = template.render((config.states[filter] || {}).label || '', {"$i18n": i18n.getForStore(this.props.storeName)});
            //     return (<span className="m-r-14" key={filterName}>{label}</span>);
            }
            switch (desc.display) {
                case displayTypes.searchBox:
                    return (<ValueConverter key={filterName} value={filter} storeName={desc.store}/>);
                case displayTypes.dateRange:
                    return (<span key={filterName}>
                        {moment(filter[0]).format('L') + ' - ' + moment(filter[1]).format('L')}
                    </span>);
                case displayTypes.numberRange:
                    return (<span key={filterName}>
                        {(filter[0] || '...') + ' - ' + (filter[1] || '...')}
                    </span>);
                default:
                    return (<span className="m-r-14" key={filterName}>{filter}</span>);
            }
        });
        filters = filters.filter(f => f != null);
        let show = filters.length > 0;
        let cn = classNames("pd-filters-summary relative no-shrink", {
            "show": show,
        });
        return (
            <div className={cn}>
                <span>{i18n.get("filters.title") + ':'}</span>{filters}
                { show ?
                    <button onClick={this.clear.bind(this)}
                            className="btn-icon first last close">
                        <i className="material-icons text md-18">close</i>
                    </button> : null }
            </div>
        );
    }
}

FiltersSummary.propTypes = {};
FiltersSummary.defaultProps = {};

export default FiltersSummary;
