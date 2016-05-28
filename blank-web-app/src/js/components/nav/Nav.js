import React from 'react';
import BsLink from './BsLink';
import ProfileMenu from './ProfileMenu';
import NavMoreLinks from './NavMoreLinks';
import Labels from '../labels/Labels';
import Actions from '../actions/Actions';
import NotificationsToggle from '../notifications/NotificationsToggle';
import configStore from '../../stores/configStore';
import history from '../../stores/historyStore';
import i18n from '../../stores/i18nStore';
import profileStore from '../../stores/profileStore';
import historyActions from '../../actions/historyActuators';
import itemsActions from '../../actions/itemsActuators';
import {storeEvents, storeTypes, systemStores} from 'constants';
import order from 'utils/order';
import template from 'template';

class Nav extends React.Component {
    constructor(props) {
        super(props);
        this.timer = null;
        this.state = this.getStateFromStore();
        this.state.user = profileStore.get();
        this.state.opened = false;
        this.state.linksWidth = 0;
        this.state.widthList = [];
        this.state.updateIndicator = false;
        this._onUserChanged = this._onUserChanged.bind(this);
        this.configChangedHandler = this.configChangedHandler.bind(this);
    }

    getStateFromStore() {
        let stores = configStore.getConfig(), navGroups = [], links = [], profileLinks = [];
        let groupsDesc = stores._nav != null ? stores._nav.entries : {};
        Object.keys(stores).forEach((storeName) => {
            if ((stores[storeName].type !== storeTypes.directory && stores[storeName].type !== storeTypes.process) ||
                stores[storeName].display === 'none') {
                return;
            }
            var to = '/' + storeName,
                name = stores[storeName].navLabel || stores[storeName].label,
                style = stores[storeName].navLinkStyle || {},
                activeStyle = stores[storeName].navLinkActiveStyle || {},
                hoverStyle = stores[storeName].navLinkHoverStyle || {},
                order = stores[storeName].navOrder || 0;

            var groupName = stores[storeName].navGroup;
            if (groupName && groupName !== 'none') {
                if (groupName === 'profile') {
                    profileLinks.push({
                        "to": '/profile' + to,
                        "name": template.render(name || '', {"$i18n": i18n.getForStore(storeName)}) || '?',
                        "order": order,
                        "style": style,
                        "activeStyle": activeStyle,
                        "hoverStyle": hoverStyle
                    });
                    return;
                }
                if (navGroups.indexOf(groupName) >= 0) {
                    return;
                } else {
                    navGroups.push(groupName);
                    var group = groupsDesc[groupName];
                    //Если группы по какой-то причине нет в конфигурации - не показываем на нее ссылку
                    if (!group) {
                        return;
                    }
                    to = '/' + groupName;
                    name = group.label;
                    order = group.navOrder || 0;
                    style = group.style || {};
                    activeStyle = group.activeStyle || {};
                    hoverStyle = group.hoverStyle || {};
                }
            }
            links.push({
                "to": to,
                "name": template.render(name || '', {"$i18n": i18n.getForStore(storeName)}) || '?',
                "order": order,
                "style": style,
                "activeStyle": activeStyle,
                "hoverStyle": hoverStyle
            });
        });
        order.by(links, 'order');
        order.by(profileLinks, 'order');
        //console.log("Links: ", links);
        return {
            "links": links,
            "profileLinks": profileLinks,
        };
    }

    componentDidMount() {
        configStore.on(storeEvents.CHANGED, this.configChangedHandler);
        profileStore.on(storeEvents.CHANGED, this._onUserChanged);
        this.checkActiveLink();
        this.calculateLinksWidth();
    }

    componentWillUnmount() {
        configStore.removeListener(storeEvents.CHANGED, this.configChangedHandler);
        profileStore.removeListener(storeEvents.CHANGED, this._onUserChanged);
        clearTimeout(this.timer);
    }

    calculateLinksWidth() {
        let links = this.refs.links;
        if (links == null) {
            return;
        }
        let widthList = [], linksWidth = links.offsetWidth;// - 46;
        for (let i = 0; i < links.children.length; i++) {
            widthList[i] = links.children[i].offsetWidth;
        }
        if (JSON.stringify(this.state.widthList) !== JSON.stringify(widthList) ||
            this.state.linksWidth !== linksWidth) {
            let newState = {"widthList": widthList, "linksWidth": linksWidth};
            //console.log(newState);
            this.setState(newState);
        }
        this.timer = setTimeout(() => {
            this.calculateLinksWidth();
        }, 300);
    }

    _onUserChanged() {
        this.setState({"user": profileStore.get()});
    }

    checkActiveLink() {
        var anyActive = false, firstPath = '';
        var links = this.state.links.slice();
        links.push({"to": "/profile"});
        links.push({"to": "/__config"});
        for (var i = 0; i < links.length; i++) {
            var path = links[i].to;
            if (i == 0) {
                firstPath = path;
            }
            if (history.isActive(path)) {
                anyActive = true;
            }
        }
        if (!anyActive && firstPath) {
            historyActions.replaceState(firstPath);
        }
    }

    configChangedHandler() {
        let state = this.getStateFromStore();
        this.setState(state);
    }

    render() {
        let links = [], moreLinks = [], width = 0, navWidth = -1;
        for (let i = 0; i < this.state.links.length; i++) {
            let linkDesc = this.state.links[i], cn = '';
            width += this.state.widthList[i];
            if (width > this.state.linksWidth) {
                if (navWidth === -1) {
                    navWidth = width - this.state.widthList[i];
                }
                moreLinks.push(linkDesc);
                cn = 'invisible';
            }
            links.push(<BsLink key={linkDesc.to + "-" + linkDesc.name}
                               to={linkDesc.to}
                               style={linkDesc.style}
                               className={cn}
                               activeStyle={linkDesc.activeStyle}
                               hoverStyle={linkDesc.hoverStyle}>
                {linkDesc.name}
            </BsLink>);
        }
        var userStoreDesc = configStore.getConfig(systemStores.profile);
        return (
            <div role="navigation" className="navbar">
                <div className="nav-container relative">
                    {/*<button onClick={this.toggle} type="button" className="navbar-toggle btn-flat"
                     aria-expanded="false">
                     <span className="icon-bar"></span>
                     <span className="icon-bar"></span>
                     <span className="icon-bar"></span>
                     </button>*/}
                    <a href={configStore.getTitleHref()}
                       target={configStore.getTitleTarget()}
                       className="navbar-brand">
                        {configStore.getTitle()}
                    </a>
                    <div className="relative">
                        <div style={{"position": "absolute", "top": 0, "left": navWidth}}>
                            <NavMoreLinks links={moreLinks}/>
                        </div>
                    </div>
                    <ul className="nav links" ref="links" id="links">
                        {links}
                    </ul>
                    <div className="spacer"></div>
                    <ul className="nav no-shrink">
                        <li className="labels">
                            <Labels item={this.state.user} storeDesc={userStoreDesc} storeName={systemStores.profile}
                                    container="nav"/>
                        </li>
                        <li className="actions">
                            <Actions item={this.state.user}
                                     storeName={systemStores.profile}
                                     storeDesc={userStoreDesc}
                                     execute={itemsActions.performAction}
                                     dontCheckReady={true}
                                     modalFormActions={true}
                                     className="nav"/>
                        </li>
                        <li>
                            <ProfileMenu className="pd-navbar-link" links={this.state.profileLinks}/>
                        </li>
                        <li>
                            <NotificationsToggle/>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}

export default Nav;
