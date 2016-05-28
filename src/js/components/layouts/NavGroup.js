/**
 * Created by kib357 on 02/11/15.
 */

import React from 'react';
import history from '../../stores/historyStore';

var NavGroup = React.createClass({
    render: function () {
        var child = history.createChild(this);
        return child;
    }
});

export default NavGroup;