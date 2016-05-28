import React from "react";
import filtersActions from "../../actions/filtersActuators";
import i18n from "../../stores/i18nStore";
import order from "utils/order";
import template from "template";

var ProcessStates = React.createClass({
    selectState: function (e) {
        e.preventDefault();
        var itemsState = e.currentTarget.getAttribute("data-items-state");
        filtersActions.setFilter(this.props.storeName, "_state", itemsState || null);
        if (typeof this.props.onClick === "function") {
            this.props.onClick(itemsState);
        }
    },
    render: function () {
        var states = Object.keys(this.props.states).map((stateName) => {
            return Object.assign({"name": stateName}, this.props.states[stateName]);
        });
        states = order.by(states, "navOrder");
        var links = states.map((state) => {
            let label = template.render(state.label || "", {"$i18n": i18n.getForStore(this.props.storeName)});
            return (
                <li key={state.name}>
                    <a data-items-state={state.name} href="#" onClick={this.selectState}
                       className={this.props.itemsState === state.name ? "active" : ""}>
                        {label}
                        {this.props.counters != null ?
                            <span className="process-counter">{this.props.counters[state.name]}</span> : null }
                    </a>
                </li>
            );
        });
        return (
            <li>
                <a data-items-state="" href="#" onClick={this.selectState}
                   className="active">
                    <span style={{"fontWeight": 500}}>{this.props.children}</span>
                    {this.props.counters != null ?
                        <span className="process-counter">{this.props.counters["all"]}</span> : null }
                </a>
                <ul className="relative">
                    {links}
                </ul>
            </li>
        );
    }
});

export default ProcessStates;