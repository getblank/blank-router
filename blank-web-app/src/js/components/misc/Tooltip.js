/**
 * Created by kib357 on 19/10/15.
 */

import React from "react";
import i18n from "../../stores/i18nStore";
import classNames from "classnames";

class Tooltip extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
            enter: false,
            top: false,
            left: false,
            showTimer: null,
            hideTimer: null,
            text: this.props.content({"$i18n": i18n.getForStore(this.props.storeName)}),
        };
        this.enterHandler = this.enterHandler.bind(this);
        this.leaveHandler = this.leaveHandler.bind(this);
    }

    createMarkup(text) {
        return {__html: this.state.text};
    }

    enterHandler() {
        clearTimeout(this.state.hideTimer);
        clearTimeout(this.state.showTimer);
        let box = this.refs.actuator.getBoundingClientRect();
        let newState = {
            show: true,
        };
        let showOnTop = window.innerHeight - box.top - box.height < box.top,
            showOnLeft = window.innerWidth - box.left - box.width < box.left;
        newState.style = {};
        newState.style[showOnTop ? "bottom" : "top"] = showOnTop ? window.innerHeight - box.top - box.height : box.top;
        newState.style[showOnLeft ? "right" : "left"] = showOnLeft ? window.innerWidth - box.left - box.width : box.left;
        newState.showTimer = setTimeout(() => {
            this.setState({"enter": true, "showTimer": null});
        });
        this.setState(newState);
    }

    leaveHandler(e) {
        if (e.relatedTarget !== this.refs.actuator &&
            e.relatedTarget !== this.refs.content) {
            clearTimeout(this.state.hideTimer);
            let hideTimer = setTimeout(() => {
                this.setState({show: false});
            }, 250);
            this.setState({"hideTimer": hideTimer, enter: false});
        }
    }

    componentWillUnmount() {
        clearTimeout(this.state.showTimer);
        clearTimeout(this.state.hideTimer);
    }

    render() {
        let cn = classNames("content", {
            "enter": this.state.enter,
            "top": this.state.top,
            "left": this.state.left,
        });
        return (
            <div className="tooltip">
                <i ref="actuator"
                   className="material-icons text md-18 actuator"
                   onMouseEnter={this.enterHandler}
                   onMouseLeave={this.leaveHandler}>
                    help_outline
                </i>
                {this.state.show && <div ref="content"
                                         className={cn}
                                         style={this.state.style}
                                         onMouseLeave={this.leaveHandler}
                                         onMouseEnter={this.enterHandler}
                                         dangerouslySetInnerHTML={this.createMarkup()}>
                </div>}
            </div>
        );
    }
}

Tooltip.propTypes = {};
Tooltip.defaultProps = {};

export default Tooltip;
