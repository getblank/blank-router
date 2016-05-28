/**
 * Created by kib357 on 05/10/15.
 */

import React from 'react';
import Actions from '../../actions/Actions.js';
import randomColors from '../../../utils/colors.js';
import find from 'utils/find';

let colors = new randomColors();
let campaignsDesc = [
    {"name": "Входящие звонки"},
    {"name": "Обзвон клиентов"},
    {"name": "Филиал Салехард"},
    {"name": "Филиал Новый Уренгой"},
    {"name": "Обзвон должников с длинным названием"},
    {"name": "Филиал Тюмень"},
    {"name": "Филиал Астана"}
];
let names = [
    "Болотнников Алексей",
    "Григорьев Иван",
    "Журавлев Артем",
    "Зарецкая Татьяна",
    "Иванова Анна",
    "Травладор Петрович Пуздой",
    "Акакий Назарович Зирнбенштейн",
    "Габдула Абдрахманович Мурсуд-Оглы оглы",
    "Камиленов Самат",
    "Комков	Степан",
    "Манжина Ольга",
    "Соколова Юлия",
    "Толкачев Иван"
];

function getRandomPhone() {
    var res = '+7';
    for (var i = 0; i < 10; i++) {
        res += Math.floor(Math.random() * 10);
    }
    return res;
}

function getTestQueue() {
    var queue = [];
    var count = Math.floor(Math.random() * 30);
    for (var i = 0; i < count; i++) {
        var campaign = Math.floor(Math.random() * 7);
        queue.push({
            "_id": count + '-' + i,
            "number": getRandomPhone(),
            "name": Math.random() > 0.3 ? names[Math.floor(Math.random() * names.length)] : '',
            "campaign_id": campaign,
            "campaignName": campaignsDesc[campaign].name,
            "direction": Math.random() > 0.3 ? "incoming" : "outgoing"
        })
    }
    return queue;
}

function getTestItem() {
    var campaign = Math.floor(Math.random() * 7);
    return {
        "outgoingCount": Math.floor(Math.random() * 300),
        "incomingCount": Math.floor(Math.random() * 500),
        "missedCount": Math.floor(Math.random() * 200),
        "average_time": ('0' + Math.floor(Math.random() * 3) + ':' + Math.floor(Math.random() * 60 + 10)),
        "currentCall": {
            "number": getRandomPhone(),
            "campaign_id": campaign,
            "campaignName": campaignsDesc[campaign].name
        }
    };
}
var queues = [getTestQueue(), getTestQueue(), getTestQueue(), getTestQueue()];
var itemsData = [getTestItem(), getTestItem(), getTestItem(), getTestItem(), getTestItem()];

let callIcons = {
    "incoming": "call_received",
    "outgoing": "call_made"
};

class PbxOperators extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "selectedCall": null,
            "callHover": false
        };
        this.callMouseLeave = this.callMouseLeave.bind(this);
    }

    callMouseEnter(call) {
        this.setState({"selectedCall": call, "callHover": true});
    }

    callMouseLeave() {
        this.setState({"callHover": false});
    }

    render() {
        var items = this.props.items;
        if (!Array.isArray(items) || items.length === 0) {
            return (
                <div className="full-height grow">
                    <div className="container">
                        <h1>Тут слишком пусто, нужно добавить больше операторов</h1>
                    </div>
                </div>
            )
        }
        colors.reset();
        let campaigns = new Map();
        let operators = items.map((item, index) => {
            let queue = (item.queue || queues[index]).map(call => {
                if (!campaigns.has(call.campaign_id)) {
                    campaigns.set(call.campaign_id, {"name": call.campaignName, "color": colors.get()});
                }
                let color = campaigns.get(call.campaign_id).color;
                return (
                    <div className="item"
                         onMouseEnter={this.callMouseEnter.bind(this, call)}
                         onMouseLeave={this.callMouseLeave}
                         style={{"borderColor": color, "color": color}}
                         key={call._id}>
                        {call.name || call.number}
                        <i className="material-icons text md-13 m-l-4">{callIcons[call.direction]}</i>
                    </div>
                );
            });

            //!!!!!!!!!!!!!!!!!!!!!!
            if (!campaigns.has(itemsData[index].currentCall.campaign_id)) {
                campaigns.set(itemsData[index].currentCall.campaign_id, {
                    "name": itemsData[index].currentCall.campaignName,
                    "color": colors.get()
                });
            }
            //!!!!!!!!!!!!!!!!!!!!
            let currentItemColor = campaigns.get(itemsData[index].currentCall.campaign_id).color;
            return (
                <div className="operator" key={item._id}>
                    <div className="info no-shrink">
                        <i className="icon round-avatar lg gray no-shrink">{find.abbr(item.name)}</i>
                        <span className="name">{item.name}</span>

                        <div className="stats">
                            <i className="material-icons text md-16">call_made</i>{item.outgoingCount || itemsData[index].outgoingCount}
                            <i className="material-icons text md-16 m-l-14">call_received</i>{item.incomingCount || itemsData[index].incomingCount}
                            <i className="material-icons text md-16 m-l-14">call_missed</i>{item.missedCount || itemsData[index].missedCount}
                            <i className="material-icons text md-16 m-l-14">access_time</i>{item.average_time || itemsData[index].average_time}
                        </div>

                        <Actions item={item} storeDesc={this.props.storeDesc} execute={this.props.actions.performAction}
                                 className="form-field"></Actions>
                    </div>

                    <div className="calls">
                        <div className="current-item"
                             style={{"backgroundColor": currentItemColor, "borderColor": currentItemColor}}>
                            {itemsData[index].currentCall.number}
                        </div>
                        <div className="queue">
                            {queue}
                        </div>
                    </div>
                </div>
            );
        });
        let campaignsList = [];
        for (var [key, value] of campaigns) {
            campaignsList.push(
                <div className="campaign" key={key} style={{"borderLeftColor": value.color}}>
                    {value.name}
                </div>
            );
        }
        return (
            <div className="full-height grow flex-column pbx-operators">
                <div className="operators grow">
                    {/*<div className="pd-table-card-header">
                     <span className="headline">{this.props.storeDesc.i18n.pluralLocal}</span>
                     </div>*/}
                    <div className="m-t-50">
                        {operators}
                    </div>
                </div>
                <div className="summary no-shrink">
                    <div className={"selected-call" + (this.state.callHover ? " show" : "")}>
                        {this.state.selectedCall ?
                            <div>
                                <h3>{this.state.selectedCall.number}</h3>

                                <div className="stats">
                                    <i className="material-icons text m-r-4">access_time</i>
                                    {('0' + Math.floor(Math.random() * 3) + ':' + Math.floor(Math.random() * 60 + 10))}
                                </div>
                            </div> : null }
                    </div>
                    <div className="charts">
                        <h3>Всего сегодня:</h3>

                        <div className="stats">
                            <i className="material-icons text">call_made</i>{itemsData[4].outgoingCount}
                            <i className="material-icons text m-l-14">call_received</i>{itemsData[4].incomingCount}
                            <i className="material-icons text m-l-14">call_missed</i>{itemsData[4].missedCount}
                            <i className="material-icons text m-l-14">access_time</i>{itemsData[4].average_time}
                        </div>
                    </div>
                    <div className="campaigns">
                        {campaignsList}
                    </div>
                </div>
            </div>
        );
    }
}

PbxOperators.propTypes = {};
PbxOperators.defaultProps = {};

export default PbxOperators;
