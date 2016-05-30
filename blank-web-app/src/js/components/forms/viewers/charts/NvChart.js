/**
 * Created by kib357 on 03/03/16.
 */

import React from "react";

class NvChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    shouldComponentUpdate(nextProps, nextState) {
        return false;
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.chart != null) {
            console.log("NvChart componentWillReceiveProps - chart update");
            this.state.chart.update();
        }
    }

    componentDidMount() {
        require.ensure(["d3", "nvd3"], () => {
            let d3 = require("d3"),
                nv = require("nvd3"),
                data = this.props.data;
            let render = new Function("d3", "nvd3", "data", this.props.render);
            let chart = render(d3, nv, data || {});
            this.setState({"chart": chart}, () => {
                nv.addGraph({
                    "generate": () => {
                        d3.select("#chart")
                            .datum(data)
                            .call(chart);
                        nv.utils.windowResize(chart.update);
                    },
                    "callback": () => {
                        let svg = this.refs.svg;
                        let group = svg.children[0];
                        if (group) {
                            console.log("Group:", group);
                            let box = group.getBBox();
                            let height = box.y + box.height + 50;
                            //console.log("Height:", height);
                            svg.setAttribute("height", height + "px");
                        }
                    }
                });
            });
        });
    }

    render() {
        return (
            <div>
                <svg id="chart" ref="svg"></svg>
            </div>
        );
    }
}

NvChart.propTypes = {};
NvChart.defaultProps = {};

export default NvChart;
