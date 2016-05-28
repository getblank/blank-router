/**
 * Created by kib357 on 27/02/16.
 */

import React from "react";

class Pin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="pin-toggle">
                <i className={"fa fa-thumb-tack" + (this.props.pinned ? "" : " unpinned")}
                   onClick={this.props.onClick}/>
            </div>
        );
    }
}

Pin.propTypes = {
    "pinned": React.PropTypes.bool,
    "onClick": React.PropTypes.func.isRequired,
};
Pin.defaultProps = {};

export default Pin;
