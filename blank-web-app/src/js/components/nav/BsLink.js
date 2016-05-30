/**
 * Created by kib357 on 16/05/15.
 */
import React from 'react';
import history from '../../stores/historyStore';
import historyActions from '../../actions/historyActuators';

class Link extends React.Component {
    constructor(props) {
        super(props);
        this.state = {"hover": false};
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    handleClick(path, e) {
        e.preventDefault();
        historyActions.pushState(path);
        if (typeof this.props.onClick === 'function') {
            this.props.onClick();
        }
    }

    onMouseEnter() {
        this.setState({"hover": true});
    }

    onMouseLeave() {
        this.setState({"hover": false});
    }

    render() {
        var isActive = !this.props.inactive && history.isActive(this.props.to);
        var style = isActive ? this.props.activeStyle : this.props.style;
        if (!isActive && this.props.hoverStyle && this.state.hover) {
            style = this.props.hoverStyle;
        }
        return (
            <li className={(this.props.className || '') + (isActive ? ' active' : '')}>
                <a href={"#" + this.props.to}
                   title={this.props.children}
                   onMouseEnter={this.props.hoverStyle != null ? this.onMouseEnter : null}
                   onMouseLeave={this.props.hoverStyle != null ? this.onMouseLeave : null}
                   style={style}
                   onClick={this.handleClick.bind(this, this.props.to)}>
                    {this.props.children}
                </a>
            </li>
        );
    }
}

export default Link;