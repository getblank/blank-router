/**
 * Created by kib357 on 05/03/16.
 */

import React from 'react';
import Widget from './Widget';
import find from 'utils/find';

class WidgetProperty extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        let widgetId = this.props.field.widgetId,
            widgetDesc = find.item(this.props.storeDesc.widgets, widgetId);
        return (
            <Widget storeName={this.props.storeName}
                    widgetId={widgetId}
                    widgetDesc={widgetDesc}/>
        );
    }
}

WidgetProperty.propTypes = {};
WidgetProperty.defaultProps = {};

export default WidgetProperty;
