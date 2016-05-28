/**
 * Created by kib357 on 20/09/15.
 */

import React from "react";
import configStore from "../../stores/configStore";
import { storeEvents, systemStores } from "constants";

const helmetAttr = "data-head-element";

class Helmet extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "title": "",
            "links": [],
            "meta": [],
            "updateFlag": false,
        };
        this._onChange = this._onChange.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.updateFlag !== this.state.updateFlag;
    }

    componentDidMount() {
        configStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        configStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        if (configStore.isBaseReady()) {
            var settings = configStore.getConfig(systemStores.settings);
            if (settings.entries != null) {
                this.setState({
                    "title": settings.entries.title,
                    "meta": settings.entries.meta,
                    "links": settings.entries.links,
                    "updateFlag": !this.state.updateFlag,
                });
            }
        }
    }

    render() {
        const headElement = document.head || document.querySelector("head");
        const existingTags = headElement.querySelectorAll(`*[${helmetAttr}]`);
        for (let i = 0; i < existingTags.length; i++) {
            existingTags[i].parentNode.removeChild(existingTags[i]);
        }

        document.title = this.state.title || document.title;
        var tags = document.createDocumentFragment();
        for (let meta of this.state.meta || []) {
            let m = document.createElement("meta");
            for (let attrName of Object.keys(meta)) {
                m.setAttribute(attrName, meta[attrName]);
            }
            m.setAttribute(helmetAttr, "");
            tags.appendChild(m);
        }
        for (let link of this.state.links || []) {
            let l = document.createElement("link");
            for (let attrName of Object.keys(link)) {
                var value = link[attrName];
                if (link.rel === "shortcut icon" && attrName === "href") {
                    value += "?v=" + Date.now();
                }
                l.setAttribute(attrName, value);
            }
            l.setAttribute(helmetAttr, "");
            tags.appendChild(l);
        }
        headElement.appendChild(tags);
        return null;
    }
}

Helmet.propTypes = {};
Helmet.defaultProps = {};

export default Helmet;
