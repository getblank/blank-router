import React from 'react';
import SimpleInput from '../forms/inputs/SimpleInput';
import PinToggle from '../misc/Pin';
import i18n from '../../stores/i18nStore';
import filtersStore from '../../stores/filtersStore';
import filtersActions from'../../actions/filtersActuators.js';
import preferencesActions from '../../actions/preferencesActuators';
import configStore from '../../stores/configStore.js';
import credentialsStore from '../../stores/credentialsStore';
import {storeEvents, displayTypes} from 'constants';
import order from 'utils/order';
import classnames from 'classnames';

export default class Filters extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.filtersDesc = configStore.getConfig(this.props.storeName).filters || [];
        this.state.filters = filtersStore.getFilters(this.props.storeName);
        this.state.pin = false;
        this.state.overflow = "auto";
        this._onFilterChange = this._onFilterChange.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    handleFilterChange(filterName, value) {
        filtersActions.setFilter(this.props.storeName, filterName, value);
    }

    clear(e) {
        e.preventDefault();
        filtersActions.clearFilter(this.props.storeName);
        if (typeof this.props.onClear === 'function') {
            this.props.onClear();
        }
    }

    pin(e) {
        this.setState({"pin": !this.state.pin});
    }

    handleFocus(fieldDisplay) {
        if (fieldDisplay === displayTypes.dateRange) {
            this.setState({"overflow": "visible"});
        }
    }

    handleBlur(fieldDisplay) {
        if (fieldDisplay === displayTypes.dateRange) {
            this.setState({"overflow": "auto"});
        }
    }

    render() {
        var filters = Object.keys(this.state.filtersDesc).map((filterName) => {
            var filter = Object.assign({}, this.state.filtersDesc[filterName]);
            filter.name = filterName;
            return filter;
        });
        order.by(filters, 'formOrder');
        let user = credentialsStore.getUser();
        var filterControls = filters.map((filter, index) => {
            if (filter.hidden(user, this.state.filters) || filter.display === 'none' || filter.name.indexOf('_') === 0) {
                return null;
            }
            return (
                <SimpleInput fieldName={filter.name}
                             key={filter.name + '-' + index}
                             field={filter}
                             storeName={this.props.storeName}
                             item={this.state.filters}
                             timeout={1000}
                             onChange={this.handleFilterChange.bind(this)}
                             value={this.state.filters[filter.name]}
                             onFocus={this.handleFocus.bind(this, filter.display)}
                             onBlur={this.handleBlur.bind(this, filter.display)}
                             className="filter">
                </SimpleInput>
            )
        });
        var cn = classnames("filters",
            {
                "show": this.props.show,
                "pinned": this.state.pin,
            });
        return (
            <div className={cn} ref="root" style={{"overflow": this.state.overflow}}>
                <div className="relative">
                    <PinToggle onClick={this.pin.bind(this)} pinned={this.state.pin}/>
                </div>
                <div style={{"margin": "14px 0 0 20px", "flexShrink": "0"}}>
                                <span className="subheading light-secondary">
                                    {i18n.get("filters.title")}
                                </span>
                </div>
                <div className="pd-filters">
                    <div>{(this.props.show || this.state.pin) && filterControls}</div>
                </div>
                <div style={{"margin": "7px 20px"}}>
                    <button onClick={this.clear.bind(this)}
                            tabIndex="-1"
                            className="btn-flat first">
                        {i18n.get("filters.clear")}
                    </button>
                </div>
            </div>
        );
    }

    handleDocumentClick(e) {
        if (this.props.show && !this.state.pin) {
            var root = this.refs['root'];
            if (e.target === root || root.contains(e.target) || e.defaultPrevented) {
                return;
            }
            preferencesActions.setPreference(this.props.storeName + '-show-filters', false);
        }
    }

    componentDidMount() {
        filtersStore.on(storeEvents.CHANGED, this._onFilterChange);
        if (this.props.show) {
            document.addEventListener('click', this.handleDocumentClick);
        }
    }

    componentWillUnmount() {
        filtersStore.removeListener(storeEvents.CHANGED, this._onFilterChange);
        document.removeEventListener('click', this.handleDocumentClick);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.storeName !== nextProps.storeName) {
            this.setState({
                "filtersDesc": configStore.getConfig(nextProps.storeName).filters || [],
                "filters": filtersStore.getFilters(nextProps.storeName)
            });
        }
        if (nextProps.show && !this.props.show) {
            document.addEventListener('click', this.handleDocumentClick);
        }
        if (!nextProps.show && this.props.show) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }

    _onFilterChange() {
        this.setState({"filters": filtersStore.getFilters(this.props.storeName)});
    }
}

Filters.propTypes = {
    "storeName": React.PropTypes.string.isRequired,
    "show": React.PropTypes.bool,
    "onClear": React.PropTypes.func
};
Filters.defaultProps = {};

export default Filters;