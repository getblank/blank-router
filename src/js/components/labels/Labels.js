/**
 * Created by kib357 on 13/08/15.
 */

import React from 'react';
import Icon from '../misc/Icon';
import credentialsStore from '../../stores/credentialsStore.js';
import i18n from '../../stores/i18nStore.js';
import classNames from 'classnames';

class Labels extends React.Component {
    render() {
        let user = credentialsStore.getUser();
        var container = this.props.container;
        var labelsDescs = this.props.storeDesc.labels || [];
        //Creating map with groups of labels
        var labelGroups = [];
        for (let labelDesc of labelsDescs) {
            if (labelDesc.hideInForm && container === 'form' ||
                labelDesc.hidden(user, this.props.item)) {
                continue;
            }
            let i = labelDesc.showInList || 0;
            if (!labelGroups[i]) {
                labelGroups[i] = [];
            }
            labelGroups[i].push(labelDesc);
        }
        var labelsControls = [];
        let model = {"$i18n": i18n.getForStore(this.props.storeName), "$user": credentialsStore.getUser(), "$item": this.props.item};
        for (let i = 0; i < labelGroups.length; i++) {
            let labelGroup = labelGroups[i];
            if (!Array.isArray(labelGroup) || (i === 0 && container === 'list')) {
                continue;
            }
            var labels = [];
            for (let labelDesc of labelGroup) {
                let text = labelDesc.text(model),
                    color = labelDesc.color(model).trim(),
                    icon = labelDesc.icon(model).trim();
                if (!text && !icon) {
                    continue;
                }
                labels.push((
                    <span className="item-label" style={{"borderColor": color, "color": color}}
                          key={"label-" + labels.length}>
                        <Icon icon={icon}/>
                        <span>{text}</span>
                    </span>
                ));
            }
            labelsControls.push((
                <span className="labels-group" key={"labels-group-" + i}>
                    {labels}
                </span>
            ));
        }
        var cn = classNames("item-labels", this.props.className, {
            "form": this.props.container === 'form',
            "nav": this.props.container === 'nav',
            "list": this.props.container === 'list'
        });
        return (
            <div className={cn}>
                {labelsControls}
            </div>
        );
    }
}

Labels.propTypes = {
    item: React.PropTypes.object.isRequired,
    storeDesc: React.PropTypes.object.isRequired,
    groupLabels: React.PropTypes.bool
};
Labels.defaultProps = {groupLabels: false};

export default Labels;
