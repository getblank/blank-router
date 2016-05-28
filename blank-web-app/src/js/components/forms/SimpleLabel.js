/**
 * Created by kib357 on 03/12/15.
 */

import React from "react";
import Tooltip from "../misc/Tooltip";

class SimpleLabel extends React.Component {
    constructor(props) {
        super(props);
    }

    createMarkup(text) {
        return { __html: text };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.className !== this.props.className ||
            nextProps.text !== this.props.text ||
            nextProps.changed !== this.props.changed ||
            nextProps.tooltip !== this.props.tooltip;
    }

    render() {
        var cn = "simple-label" + (this.props.className ? " " + this.props.className : "");
        return (
            <div className={cn}>
                <label htmlFor={this.props.name ? `${this.props.name}-input` : null}
                    dangerouslySetInnerHTML={this.createMarkup(this.props.text) }>
                </label>
                {((this.props.text || "").trim() && this.props.changed) && <span className="change-indication"> *</span>}
                {this.props.tooltip && <Tooltip content={this.props.tooltip} storeName={this.props.storeName}/>}
            </div>
        );
    }
}

SimpleLabel.propTypes = {};
SimpleLabel.defaultProps = {};

export default SimpleLabel;
