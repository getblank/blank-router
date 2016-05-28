/**
 * Created by kib357 on 14/09/15.
 */

import React from 'react';
import classNames from 'classnames';

class Tabs extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "left": 0,
            "width": 0
        }
    }

    handleClick(tabName) {
        this.props.onChange(tabName);
    }

    createMarkup(text) {
        return {__html: text};
    }

    componentDidMount() {
        this.computeIndicatorPosition();
    }

    componentDidUpdate(prevProps, prevState) {
        this.computeIndicatorPosition();
    }

    computeIndicatorPosition() {
        let tabs = this.refs.tabs.children;
        for (var i = 0; i < tabs.length; i++) {
            let tab = tabs[i];
            if (tab.className.indexOf('active') >= 0) {
                let left = tab.offsetLeft;
                let width = tab.offsetWidth;
                if (left !== this.state.left || width !== this.state.width) {
                    this.setState({
                        "left": left,
                        "width": width
                    })
                }
                break;
            }
        }
    }

    render() {
        var tabs = this.props.options.map((tab, index) => {

            var cn = classNames("btn-flat", "relative", {
                "right-animation": index % 2 !== 0,
                "first": index === 0,
                "last": index === this.props.options.length - 1,
                "dark": this.props.dark,
                "active": tab._id === this.props.value
            });
            return (
                <button key={tab._id}
                        type="button"
                        tabIndex="-1"
                        className={cn}
                        onClick={this.handleClick.bind(this, tab._id)}>
                    <span dangerouslySetInnerHTML={this.createMarkup(tab.label)}></span>
                </button>
            )
        });
        let indicatorStyle = {
            "marginLeft": this.state.left,
            "width": this.state.width
        };
        return (
            <div className="pd-tabs">
                <div className="tabs relative" ref="tabs">
                    {tabs}
                </div>
                <div className="indicator">
                    <div style={indicatorStyle}></div>
                </div>
            </div>
        );
    }
}

Tabs.propTypes = {};
Tabs.defaultProps = {};

export default Tabs;
