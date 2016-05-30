/**
 * Created by kib357 on 16/08/15.
 */

import React from "react";
import Actions from "../actions/Actions";
import Labels from "../labels/Labels";
import Loader from "../misc/Loader";
import configStore from "../../stores/configStore";
import history from "../../stores/historyStore";
import historyActions from "../../actions/historyActuators";
import cn from "classnames";
import randomColors from "../../utils/colors";

var colors = new randomColors();

class GridView extends React.Component {
    selectItem(itemId) {
        var route = configStore.findRoute(this.props.storeName);
        route += (history.params.get("state") ? "/" + history.params.get("state") : "") + "/" + itemId;
        historyActions.pushState(route);
    }

    render() {
        colors.reset();
        var showLabels = this.props.storeDesc.labels && this.props.storeDesc.labels.some((l) => {
            return l.showInList > 0;
        });
        var cards = this.props.items.map((item, index) => {
            var mediaCn = cn("card-media", {
                "action": !this.props.storeDesc.listViewOnly,
                "changed": item.$state !== "ready"
            });
            var descCn = cn("card-desc", {
                "action": !this.props.storeDesc.listViewOnly
            });
            return (
                <div className="pd-card" key={"card-" + item._id}>
                    <div className={mediaCn} style={{"backgroundColor": colors.get()}}
                         onClick={this.props.storeDesc.listViewOnly ? null : this.selectItem.bind(this, item._id)}>
                        <span className="card-title">{item.name}</span>
                    </div>
                    {showLabels ?
                        <div className={descCn}
                             onClick={this.props.storeDesc.listViewOnly ? null : this.selectItem.bind(this, item._id)}>
                            <Labels item={item} storeDesc={this.props.storeDesc}
                                    storeName={this.props.storeName}/>
                        </div> : null }
                    <div className="card-actions">
                        <Actions item={item}
                                 storeName={this.props.storeName}
                                 storeDesc={this.props.storeDesc}
                                 execute={this.props.actions.performAction}
                                 modalFormActions={true}/>
                    </div>
                </div>
            );
        });
        return (
            <div className="fill relative flex column layout-grid">
                <div className="scroll fill">
                    <div className="grid-wrapper">
                        {this.props.ready ?
                            <div className="pd-grid">
                                {cards}
                                {this.props.storeDesc.groupAccess.indexOf("c") >= 0 ?
                                    <div className="pd-card" onClick={this.props.actions.create.bind(this, null)}>
                                        <div className="card-media action" style={{"backgroundColor": "#757575"}}>
                                            <div>
                                                <i className="material-icons md-36 m-r-8"
                                                   style={{"verticalAlign": "bottom"}}>add_circle_outline</i>
                                            <span
                                                className="card-title">{this.props.storeDesc.i18n.createLabel || this.props.storeDesc.i18n.singularLocal}</span>
                                            </div>
                                        </div>
                                    </div> : null }
                            </div> :
                            <Loader/>
                        }
                    </div>
                </div>
            </div>
        );
    }
}

GridView.propTypes = {};
GridView.defaultProps = {};

export default GridView;
