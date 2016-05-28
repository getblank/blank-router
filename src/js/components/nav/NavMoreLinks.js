/**
 * Created by kib357 on 28/02/16.
 */

import React from 'react';
import BsLink from './BsLink';

class NavMoreLinks extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.toggle = this.toggle.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    toggle(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.setState({"opened": !this.state.opened}, this.manageListeners);
    }

    handleLinkClick() {
        this.setState({"opened": false}, this.manageListeners);
    }

    render() {
        return (
            <div className="more-link relative" ref="root">
                {this.props.links.length > 0 && <a href="#" onClick={this.toggle}>
                    <i className="material-icons text md-16">more_horiz</i>
                </a>}
                <ul className={"pd-dropdown-menu left-side" + ((this.props.links.length > 0) && this.state.opened ? " open" : "")}>
                    {this.props.links.map((linkDesc) => {
                        return (<BsLink key={linkDesc.to + "-" + linkDesc.name}
                                        to={linkDesc.to}
                                        style={linkDesc.style}
                                        activeStyle={linkDesc.activeStyle}
                                        hoverStyle={linkDesc.hoverStyle}
                                        onClick={this.handleLinkClick}>
                            {linkDesc.name}
                        </BsLink>)
                    })}
                </ul>
            </div>
        );
    }

    handleDocumentClick(e) {
        var root = this.refs['root'];
        if (root == null) {
            this.toggle();
            return;
        }
        if (e.target === root || root.contains(e.target)) {
            return;
        }
        this.toggle();
    }

    manageListeners() {
        if (this.state.opened) {
            document.addEventListener('click', this.handleDocumentClick);
        } else {
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }
}

NavMoreLinks.propTypes = {};
NavMoreLinks.defaultProps = {};

export default NavMoreLinks;
