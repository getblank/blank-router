/**
 * Created by kib357 on 01/02/16.
 */

import React from "react";
import preferencesStore from "../../stores/preferencesStore";
import configStore from "../../stores/configStore";
import preferencesActions from "../../actions/preferencesActuators";
import historyActions from "../../actions/historyActuators";

class LayoutToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    toggleView() {
        let views = this.props.storeDesc.display.split(",").map(d => d.trim());
        if (views.length <= 1) {
            return;
        }
        let currentView = preferencesStore.getUserPreference(this.props.storeName + "-display"), res;
        let index = views.indexOf(currentView);
        if (index <= 0) {
            res = views[1];
        } else {
            index = index < views.length - 1 ? index + 1 : 0;
            res = views[index];
        }
        preferencesActions.setPreference(this.props.storeName + "-display", res);
        var route = configStore.findRoute(this.props.storeName);
        historyActions.pushState(route);
    }

    render() {
        let views = this.props.storeDesc.display.split(",");
        return (
            views.length > 1 ?
                <button type="button" className="btn-icon dark" onClick={this.toggleView.bind(this)}>
                    <i className="material-icons text">view_carousel</i>
                </button> :
                null
        );
    }
}

LayoutToggle.propTypes = {};
LayoutToggle.defaultProps = {};

export default LayoutToggle;
