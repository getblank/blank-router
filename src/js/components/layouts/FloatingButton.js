import React, {Component} from "react";

class FloatingButton extends Component {
    constructor(props) {
        super(props);
        this.onClickHandler = this.onClickHandler.bind(this);
    }

    onClickHandler(e) {
        if (typeof this.props.onClick === "function") {
            this.props.onClick();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.className !== this.props.className ||
            prevProps.icon !== this.props.icon) {
            let btn = this.refs.button;
            if (btn) {
                btn.classList.add("reanimate");
                this.timer = setTimeout(() => {
                    btn.classList.remove("reanimate");
                }, 330);
            }
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    render() {
        let cn = "floating-button" +
            (this.props.className ? " " + this.props.className : "");
        return (
            <div className={cn}>
                <button type="button"
                    ref="button"
                    onClick={this.onClickHandler}>
                    <i className="material-icons text">{this.props.icon}</i>
                </button>
            </div>
        );
    }
}

export default FloatingButton;