/**
 * Created by kib357 on 05/03/16.
 */

import React from 'react';
import Loader from '../../misc/Loader';
import NvChart from './charts/NvChart';
import {widgetTypes} from 'constants';

var data = [
    {
        "key": "Перерывы",
        "color": "#d67777",
        "values": [
            {
                "label": "Кошкин Павел",
                "value": 1.8746444827653
            },
            {
                "label": "Мышкин Князь",
                "value": 8.0961543492239
            },
            {
                "label": "Склиф",
                "value": 0.57072943117674
            },
            {
                "label": "Рябченко Виолетта",
                "value": 2.4174010336624
            },
            {
                "label": "Человек Людина",
                "value": 0.72009071426284
            },
            {
                "label": "Машина Паша",
                "value": 0.77154485523777
            },
            {
                "label": "Александр Прибой",
                "value": 0.90152097798131
            },
            {
                "label": "Николай Предпоследний",
                "value": 0.91445417330854
            },
            {
                "label": "Цыгане",
                "value": 0.055746319141851
            },
        ]
    },
    {
        "key": "Разговоры",
        "color": "#4f99b4",
        "values": [
            {
                "label": "Кошкин Павел",
                "value": 25.307646510375
            },
            {
                "label": "Мышкин Князь",
                "value": 16.756779544553
            },
            {
                "label": "Склиф",
                "value": 18.451534877007
            },
            {
                "label": "Рябченко Виолетта",
                "value": 8.6142352811805
            },
            {
                "label": "Человек Людина",
                "value": 7.8082472075876
            },
            {
                "label": "Машина Паша",
                "value": 5.259101026956
            },
            {
                "label": "Александр Прибой",
                "value": 0.30947953487127
            },
            {
                "label": "Николай Предпоследний",
                "value": 0
            },
            {
                "label": "Цыгане",
                "value": 0
            },
        ]
    }
];

function rndInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

class Widget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.data = null;
        this.timer = setTimeout(() => {
            this.setState({"data": data});
            this.interval = setInterval(() => {
                let d = this.state.data;
                for (var i = 0; i < 5; i++) {
                    d[rndInt(1)].values[rndInt(8)].value = (Math.random() * 25);
                }
                this.setState({"data": d});
            }, 2000);
        }, 4000);
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
        clearInterval(this.interval);
    }

    render() {
        let widget = this.getWidget(this.props.widgetDesc.type);
        return (
            <div style={this.props.widgetDesc.style}>
                {this.state.data != null ?
                    widget :
                    <Loader className="xs"/>}
            </div>
        );
    }

    getWidget(wType) {
        switch (wType) {
            case widgetTypes.chartNvD3:
                return <NvChart render={this.props.widgetDesc.render} data={this.state.data}/>;
            default:
                return <p>Invalid widget type</p>
        }
    }
}

Widget.propTypes = {};
Widget.defaultProps = {};

export default Widget;
