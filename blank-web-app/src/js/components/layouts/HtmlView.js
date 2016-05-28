/**
 * Created by kib357 on 07/09/15.
 */

import React from 'react';
import Loader from '../misc/Loader';
import credentialsStore from '../../stores/credentialsStore';
import template from 'template';

class HtmlView extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getState();
    }

    getState(nextProps) {
        var props = nextProps || this.props;
        var state = {};
        return state;
    }

    createMarkup() {
        let data = this.props.items;
        if (this.props.storeDesc.prepareItemsScript) {
            data = new Function('$items', this.props.storeDesc.prepareItemsScript)(JSON.parse(JSON.stringify(this.props.items)));
        }
        return {
            "__html": template.render(this.props.storeDesc.html, {
                "$items": data,
                "$user": credentialsStore.getUser()
            })
        };
    }

    render() {
        return (
            <div className="fill scroll">
                {this.props.ready ?
                    <div className="container">
                        <div dangerouslySetInnerHTML={this.createMarkup()}>
                        </div>
                    </div> :
                    <Loader/>
                }
            </div>
        );
    }
}

HtmlView.propTypes = {};
HtmlView.defaultProps = {};

export default HtmlView;
