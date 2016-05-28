/**
 * Created by kib357 on 15/06/15.
 */

var React = require('react'),
    check = require('utils/check'),
    find = require('utils/find'),
    searchActions = require('../../actions/searchActuators');

var ValueConverter = React.createClass({
    getInitialState: function () {
        return {
            "value": ""
        };
    },

    render: function () {
        return (
            <span>{this.state.value}</span>
        )
    },
    componentWillReceiveProps: function (nextProps) {
        if (this.props.value !== nextProps.value) {
            this.loadValue(nextProps);
        }
    },
    componentDidMount: function () {
        this.loadValue();
    },
    loadValue: function (nextProps) {
        var props = nextProps || this.props;
        if (props.value) {
            if (props.options == null) {
                this.setState({"value": ""}, function () {
                    var self = this;
                    var idWrapper = ([]).concat(props.value);
                    searchActions.searchByIds(props.storeName, idWrapper).then(function (res) {
                        var value;
                        if (res.length === 1) {
                            value = res[0];
                        }
                        if (props.value === self.props.value) {
                            if (value != null) {
                                value = value[props.valueField || 'name'];
                            }
                            self.setState({"value": value});
                        }
                    }, function (error) {
                        console.log(error);
                    });
                });
            } else {
                var value = find.itemById(props.options, props.value, props.idField);
                if (value != null && props.valueField) {
                    value = value[props.valueField];
                }
                this.setState({"value": value || ""});
            }
        } else {
            this.setState({"value": ""});
        }
    }
});

module.exports = ValueConverter;