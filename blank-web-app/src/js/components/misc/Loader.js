/**
 * Created by kib357 on 20/09/15.
 */

import React from 'react';

class Loader extends React.Component {
    render() {
        let c = 50, r = 20, sW = 3;
        if (this.props.className) {
            if (this.props.className.indexOf('xs') >= 0) {
                c = 10;
                r = 8;
                sW = 2;
            }
            if (this.props.className.indexOf('min') >= 0) {
                c = 25;
                r = 20;
            }
        }
        return (
            <div className={("pd-loader " + this.props.className).trim()}>
                <svg className="circular">
                    <circle className="path" cx={c} cy={c} r={r} fill="none" strokeWidth={sW} strokeMiterlimit="10"/>
                </svg>
                {this.props.text ? <h2>{this.props.text}</h2> : null}
            </div>
        );
    }
}

Loader.propTypes = {};
Loader.defaultProps = {};

export default Loader;
