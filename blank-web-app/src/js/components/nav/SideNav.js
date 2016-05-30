/**
 * Created by kib357 on 26/02/16.
 */

import React from 'react';
import BsLink from './BsLink';
import ProcessStates from './ProcessStates';
import PinToggle from '../misc/Pin';
import configStore from '../../stores/configStore';
import filtersStore from '../../stores/filtersStore';
import listStore from '../../stores/listStore';
import appState from '../../stores/appStateStore';
import i18n from '../../stores/i18nStore';
import history from '../../stores/historyStore';
import historyActions from '../../actions/historyActuators';
import uiActions from '../../actions/uiActuators';
import {storeTypes, storeDisplayTypes, storeEvents} from 'constants';
import order  from 'utils/order';
import template from 'template';
import classNames from 'classnames';

class SideNav extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.show = false;
        this.state.links = this._getLinks();
        this._onFiltersChange = this._onFiltersChange.bind(this);
        this._onListStoreChange = this._onListStoreChange.bind(this);
        this._getLinks = this._getLinks.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.hide = this.hide.bind(this);
        this.show = this.show.bind(this);
        this.togglePin = this.togglePin.bind(this);
    }

    componentDidMount() {
        filtersStore.on(storeEvents.CHANGED, this._onFiltersChange);
        listStore.on(storeEvents.CHANGED, this._onListStoreChange);
        uiActions.on('showSideNav', this.show);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
        filtersStore.removeListener(storeEvents.CHANGED, this._onFiltersChange);
        listStore.removeListener(storeEvents.CHANGED, this._onListStoreChange);
        uiActions.removeListener('showSideNav', this.show);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.navGroup != nextProps.navGroup || this.props.storeName != nextProps.storeName) {
            this.setState({ "links": this._getLinks(nextProps), "disableAnimation": true }, () => {
                //this.show();
                setTimeout(() => {
                    this.setState({ "disableAnimation": false });
                });
                this.checkActiveLink();
            });
        } else {
            this.checkActiveLink();
        }
    }

    handleDocumentClick(e) {
        let root = this.refs.root;
        if (root == null || e.target === root || root.contains(e.target) || !this.state.show) {
            return;
        }
        this.hide();
    }

    hide() {
        if (this.state.show) {
            this.setState({ "show": false }, () => {
                this.manageListeners();
            });
        }
    }

    show() {
        if (!this.state.show) {
            this.setState({ "show": true }, () => {
                this.manageListeners();
            });
        }
    }

    togglePin() {
        this.props.onTogglePin();
        this.hide();
    }

    _onListStoreChange() {
        if (listStore.isReady()) {
            this.setState({ "counters": listStore.getCounters() });
        }
    }

    _onFiltersChange() {
        this.forceUpdate();
        //this.setState({"links": this._getLinks()});
    }

    _getLinks(props) {
        props = props || this.props;
        let mg = props.navGroup,
            stores = configStore.getByNavGroup(mg);
        if (!mg) {
            var storeDesc = configStore.getConfig(appState.store);
            if (storeDesc.type === storeTypes.process) {
                stores = {};
                stores[appState.store] = storeDesc;
                // if (listStore.isReady()) {
                //     newState.counters = listStore.getCounters();
                // }
            }
        }
        let links = Object.keys(stores).map((storeName, i) => {
            return {
                "to": (mg ? '/' + mg : '') + '/' + storeName,
                "name": template.render(stores[storeName].navLabel || stores[storeName].label || '', { "$i18n": i18n.getForStore(storeName) }) || '?',
                "order": stores[storeName].navOrder || 0,
                "process": stores[storeName].type === storeTypes.process && stores[storeName].display !== storeDisplayTypes.single,
                "states": stores[storeName].states,
            };
        });
        return order.by(links, 'order');
    }

    checkActiveLink() {
        var anyActive = false, firstPath = '';
        for (var i = 0; i < this.state.links.length; i++) {
            var path = this.state.links[i].to;
            if (i == 0) {
                firstPath = path;
            }
            if (history.isActive(path)) {
                anyActive = true;
            }
        }
        if (!anyActive && firstPath) {
            console.log("Redirecting");
            historyActions.replaceState(firstPath);
        }
    }

    render() {
        var bsLinks = [], hasProcess = false;
        for (let link of this.state.links) {
            if (link.process && history.isActive(link.to)) {
                hasProcess = true;
                let itemsState = '';
                let filters = filtersStore.getFilters(this.props.storeName, true);
                if (filters._state) {
                    itemsState = filters._state;
                }
                bsLinks.push(
                    <ProcessStates key={link.to + "-" + link.name}
                        counters={this.state.counters}
                        states={link.states}
                        itemsState={itemsState}
                        storeName={this.props.storeName}
                        onClick={this.hide}>
                        {link.name}
                    </ProcessStates>);
            } else {
                bsLinks.push(<BsLink key={link.to + "-" + link.name}
                    to={link.to}
                    onClick={this.hide}>
                    {link.name}
                </BsLink>);
            }
        }
        let wrapperCn = classNames("side-nav-wrapper flex column no-shrink", {
            "pinned": this.props.pinned,
        });
        let cn = classNames("side-nav flex column fill", {
            "show": this.state.show,
            "no-transition": this.state.disableAnimation,
        });
        return (bsLinks.length > 1 || hasProcess) &&
            <div className={wrapperCn}>
                {this.state.show && <div className="overlay"></div>}
                <div className={cn} ref="root">
                    <div className="relative">
                        <PinToggle onClick={this.togglePin} pinned={this.props.pinned}/>
                    </div>
                    <div className="list fill scroll">
                        <ul>
                            {bsLinks}
                        </ul>
                    </div>
                </div>
            </div>;
    }

    manageListeners() {
        if (this.state.show) {
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }
}

SideNav.propTypes = {};
SideNav.defaultProps = {};

export default SideNav;
