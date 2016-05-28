var React = require('react');

var Toggle = React.createClass({
    getInitialState: function () {
        return ({
            checked: Boolean(this.props.checked),
            start: {pageX: 0, pageY: 0},
            mouseMove: false,
            toggle: false,
            distanceX: 0
        })
    },
    componentWillReceiveProps: function (nextProps) {
        if (!this.state.mouseMove) {
            this.setState({"checked": Boolean(nextProps.checked)});
        }
    },
    render: function () {
        return (
            <div ref="toggle"
                className={'toggle' + (this.state.checked ? ' active' : '') + (this.props.disabled ? ' disabled' : '')}
                onMouseDown={this.onMouseDown}>
                <div className="toggle-handle"></div>
            </div>
        );
    },

    onMouseDown: function (e) {
        if (this.props.disabled || e.button !== 0) {
            return;
        }
        var toggle = this.refs.toggle;
        var handle = toggle.children[0];
        var minDistance = toggle.clientWidth / 2 - handle.clientWidth / 2;
        var switchPoint = e.clientX + minDistance * (this.state.checked ? -1 : 1);
        var start = {"pageX": e.clientX, "pageY": e.clientY};
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        var hasChecked = this.state.checked;
        this.setState({
            start: start,
            hasChecked: hasChecked,
            mouseMove: false,
            toggle: toggle,
            switchPoint: switchPoint
        });
    },
    onMouseUp: function (e) {
        var toggle = this.state.toggle;
        if (!toggle || this.props.disabled) {
            return;
        }
        var checked = this.state.mouseMove ? this.state.checked : !this.state.checked;

        if (this.state.hasChecked !== checked) {
            this.props.onToggle(checked);
        }
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        this.setState({
            checked: checked,
            mouseMove: false,
            toggle: false
        });
    },
    onMouseMove: function (e) {
        var toggle = this.state.toggle;
        if (!toggle || this.props.disabled) {
            return;
        }
        var current = {pageX: e.clientX, pageY: e.clientY};

        var distanceX = Math.abs(current.pageX - this.state.start.pageX);
        var distanceY = Math.abs(current.pageY - this.state.start.pageY);
        var mouseMove = distanceX > 1 || distanceY > 1;

        var checked = this.state.checked;
        if (mouseMove) {
            checked = e.clientX > this.state.switchPoint;
        }

        this.setState({
            checked: checked,
            mouseMove: mouseMove
        });

        e.preventDefault();
    }
});

module.exports = Toggle;