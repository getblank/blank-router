/**
 * Created by kib357 on 28/02/16.
 */

import React from "react";
import appState from "../../stores/appStateStore";
import configStore from "../../stores/configStore";
import preferencesStore from "../../stores/preferencesStore";
import uiActions from "../../actions/uiActuators";
import {storeTypes} from "constants";

class SideNavToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    showSideNav() {
        uiActions.showSideNav();
    }

    render() {
        let currentStoreDesc;
        if (appState.store) {
            currentStoreDesc = configStore.getConfig(appState.store);
        }
        let render = appState.navGroup || (currentStoreDesc && currentStoreDesc.type === storeTypes.process),
            show = preferencesStore.getUserPreference((appState.navGroup || appState.store) + "-sidenav-auto-hide") === true;
        return (render &&
            <button type="button" className={"btn-icon first last dark" + (show ? " show" : "")}
                    onClick={this.showSideNav.bind(this)}
                    style={{"margin": "0 auto"}}>
                <i className="material-icons text">menu</i>
            </button>
        );
    }
}

SideNavToggle.propTypes = {};
SideNavToggle.defaultProps = {};

export default SideNavToggle;
