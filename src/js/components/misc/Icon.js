/**
 * Created by kib357 on 05/09/15.
 */

import React from 'react';

class Icon extends React.Component {
    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.icon !== this.props.icon;
    }

    render() {
        if (!this.props.icon) {
            return null;
        }
        var icon = this.props.icon;
        var className = icon;
        var text = '';
        if (icon.indexOf('material-icons') === 0) {
            let classes = icon.split(' ').map(i => i.trim()).filter(i => i);
            text = classes.pop();
            className = classes.join(' ');
        }
        return (
            <i className={className}>{text}</i>
        );
    }
}

Icon.propTypes = {};
Icon.defaultProps = {};

export default Icon;
