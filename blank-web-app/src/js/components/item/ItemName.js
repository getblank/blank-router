/**
 * Created by kib357 on 28/12/15.
 */

import React from 'react';
import SimpleInput from '../forms/inputs/SimpleInput';
import i18n from '../../stores/i18nStore';
import credentialsStore from '../../stores/credentialsStore';
import changesProcessor from '../../utils/changesProcessor';
import template from 'template';
import {storeTypes, storeDisplayTypes} from 'constants';

let inputConfig = {
    "type": "string",
    "display": "headerInput"
};

class ItemName extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.changeHandler = this.changeHandler.bind(this);
    }

    changeHandler(fieldName, value) {
        let item = changesProcessor.handle(this.props.item, fieldName, value);
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(item);
        }
    }

    render() {
        let headerTemplate = this.props.storeDesc.headerTemplate,
            {storeDesc, item} = this.props;
        if (storeDesc.type === storeTypes.single ||
            storeDesc.display === storeDisplayTypes.single) {
            headerTemplate = storeDesc.label;
        }
        if (headerTemplate) {
            let text = template.render(headerTemplate, { "$item": this.props.combinedItem, "$i18n": i18n.getForStore(this.props.storeName) });
            return (
                <div className="item-name fill">
                    <h1>{text}</h1>
                </div>
            );
        }
        let headerProperty = storeDesc.headerProperty || 'name';
        if (storeDesc.props[headerProperty] == null) {
            console.warn("Config for header property not found! Property:", headerProperty);
            return null;
        }
        let headerDesc = Object.assign({}, storeDesc.props[headerProperty], inputConfig);
        let access = storeDesc.groupAccess + (credentialsStore.getUser()._id === item._ownerId ? storeDesc.ownerAccess : ''),
            readOnly = access.indexOf('u') < 0;
        return (
            <div className="item-name fill dark">
                <SimpleInput storeName={this.props.storeName}
                    fieldName={headerProperty}
                    field={headerDesc}
                    item={this.props.item}
                    readOnly={readOnly}
                    onChange={this.changeHandler}/>
            </div>
        );
    }
}

ItemName.propTypes = {};
ItemName.defaultProps = {};

export default ItemName;