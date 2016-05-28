
import React from 'react';
import config from '../../../../stores/configStore.js';
import i18n from '../../../../stores/i18nStore.js';
import { storeEvents } from 'constants';
import template from 'template';

var CheckList = React.createClass({
        getStateFromStore: function () {
            return {
                "options": config.getMapStoreEntries(this.props.store)
            };
        },
        componentWillReceiveProps (nextProps) {
            if (this.props.store !== nextProps.store) {
                this.setState({"selected": nextProps.value, "options": config.getMapStoreEntries(this.props.store)});
            } else {
                this.setState({"selected": nextProps.value});
            }
        },
        getInitialState: function () {
            var state = this.getStateFromStore();
            state.selected = this.props.value;
            return state;
        },
        toggleSelect: function (e) {
            var id = e.target.getAttribute('id').replace("-check", ""),
                selected = Array.isArray(this.state.selected) ? this.state.selected.slice() : [],
                ind = selected.indexOf(id);
            if (ind > -1) {
                selected.splice(ind, 1);
            } else {
                selected.push(id)
            }
            if (typeof this.props.onChange === 'function') {
                this.props.onChange(selected);
            }
        },
        render: function () {
            var options = this.state.options.map(function (option) {
                let label = template.render(option.label, {"$i18n": i18n.getForStore(this.props.storeName)});
                return (
                    <div div className={"check-list-item" + (this.props.disabled ? ' disabled' : '')}
                         key={option._id}>
                        <input type="checkbox" id={option._id + "-check"}
                               disabled={this.props.disabled} onChange={this.toggleSelect}
                               onFocus={this.props.onFocus}
                               onBlur={this.props.onBlur}
                               checked={Array.isArray(this.state.selected) && (this.state.selected.indexOf(option._id) > -1)}/>
                        <label htmlFor={option._id + "-check"}>{label}</label>
                    </div>
                )
            }, this);
            return (
                <div className="check-list">
                    {options}
                </div>
            );
        }
    })
    ;

export default CheckList;
module.exports = CheckList;