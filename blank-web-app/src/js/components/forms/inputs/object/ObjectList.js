/**
 * Created by kib357 on 20/01/16.
 */

import React from 'react';
import InputBase from '../InputBase';
import ObjectInput from './ObjectInput';
import SimpleLabel from '../../SimpleLabel.js';
import configStore from '../../../../stores/configStore';
import i18n from '../../../../stores/i18nStore.js';
import find from 'utils/find';
import {validityErrors} from 'constants';
import template from 'template';

class ObjectList extends InputBase {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.listItems = this.getValue();
        this.state.dragIndex = -1;
        this.handleDrag = this.handleDrag.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
    }

    componentWillUnmount() {
        clearTimeout(this.state.timer);
    }

    getValue(props) {
        let value = super.getValue(props);
        props = props || this.props;
        if (props.multi) {
            return Array.isArray(value) ? value : [];
        }
        else {
            return [value || {}];
        }
    }

    componentWillReceiveProps(nextProps) {
        //console.error("componentWillReceiveProps");
        this.setState({
            "listItems": this.getValue(nextProps),
            'dragIndex': -1,
            'willDrop': false,
            'dropIndex': -1,
        })
    }

    handleChange(index, value) {
        var listItems = this.state.listItems.slice();
        listItems[index] = value;
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(this.props.fieldName, this.props.multi ? listItems : value);
        }
    }

    handleCreate(e) {
        var item = this.getValue().slice();
        var newItem = {};
        var baseField = this.props.field;
        for (var fieldName of Object.keys(baseField.props)) {
            if (baseField.props[fieldName].default != null) {
                let defaultValue = baseField.props[fieldName].default;
                if (baseField.props[fieldName].type === 'string') {
                    defaultValue = template.render(defaultValue, { "$i18n": i18n.getForStore(this.props.storeName) });
                }
                newItem[fieldName] = defaultValue;
            }
        }
        item.push(newItem);
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(this.props.fieldName, item);
        }
        e.preventDefault();
    }

    handleDelete(index, e) {
        var item = this.getValue().slice();
        item.splice(index, 1);
        if (typeof this.props.onChange === 'function') {
            this.props.onChange(this.props.fieldName, item);
        }
        e.preventDefault();
    }

    handleDragStart(e) {
        let index = e.currentTarget.getAttribute('data-index') * 1;
        //console.log("Drag start: ", index);
        let item = e.currentTarget.parentElement;
        item.classList.add('drag');
        this.setState({
            'dragIndex': index,
            'dragHeight': item.offsetHeight,
            "startX": e.pageX,
            "startY": e.pageY,
            "offsetX": item.offsetLeft,
            "offsetY": item.offsetTop,
            "dragX": item.offsetLeft,
            "dragY": item.offsetTop,
        })
    }

    handleDragEnd(e) {
        if (this.state.dragIndex >= 0) {
            this.setState({
                'dragIndex': -1,
                'willDrop': false,
                'dropIndex': -1,
            })
        }
    }

    handleDrag(e) {
        if (this.state.dragIndex >= 0 && !this.state.willDrop) {
            e.preventDefault();
            e.stopPropagation();
            //console.log("handleDrag, ", e.pageX);
            let x = this.state.offsetX + (e.pageX - this.state.startX),
                y = this.state.offsetY + (e.pageY - this.state.startY);
            this.setState({ "dragX": x + "px", "dragY": y + "px" });
        }
    }

    handleDragEnter(index, e) {
        if (this.state.dragIndex >= 0) {
            //console.log("Index: ", index, " dragIndex: ", this.state.dragIndex);
            if (this.state.dragIndex != index && this.state.dragIndex != (index - 1)) {
                this.setState({ "dropIndex": index });
            }
        }
    }

    handleDragLeave(index, e) {
        if (this.state.dragIndex >= 0) {
            //console.log("dropIndex: ", "-1");
            this.setState({ "dropIndex": -1 });
        }
    }

    handleDrop(e) {
        if (this.state.dragIndex >= 0 && this.state.dropIndex >= 0) {
            e.preventDefault();
            e.stopPropagation();
            let from = this.state.dragIndex,
                to = this.state.dropIndex;

            let offsetY = this.refs['drop' + this.state.dropIndex].offsetTop + 14;

            if (to > from) {
                //Setting magic number - 6, is more simple than search where it from
                offsetY = offsetY - this.state.dragHeight - 6;
                to--;
            }

            let timer = setTimeout(() => {
                console.log("Drop to: ", to, " from: ", from);
                let items = this.state.listItems.slice();
                items.splice(to, 0, items.splice(from, 1)[0]);
                if (typeof this.props.onChange === 'function') {
                    this.props.onChange(this.props.fieldName, items);
                }
            }, 250);
            this.setState({ 'willDrop': true, "dragY": offsetY + 'px', "timer": timer });
        }
    }

    render() {
        let baseItem = this.props.item,
            baseField = this.props.field,
            user = this.props.user;
        if (baseField.display === "none") {
            return null;
        }
        var access = baseField.groupAccess + (this.props.user._id === baseItem._ownerId ? baseField.ownerAccess : '');
        let labelText = baseField.label({ "$i18n": i18n.getForStore(this.props.storeName) });
        let addLabel = template.render(baseField.singularLocal || baseField.addLabel || '', { "$i18n": i18n.getForStore(this.props.storeName) });

        var disabled = baseField.disabled(this.props.user, this.props.combinedItem, baseItem) ||
            this.props.readOnly ||
            access.indexOf('u') < 0;

        let disableActions = !this.props.multi || disabled,
            disableAdding = this.props.maxLength && this.state.listItems.length >= this.props.maxLength.getValue(),
            disableDelete = (this.props.minLength && this.state.listItems.length <= this.props.minLength.getValue()) ||
                (this.props.required && this.props.required.getValue() && this.state.listItems.length === 1),
            disableDrag = !baseField.sortable || disableActions || (this.state.listItems.length < 2);

        let innerStoreDesc = this.props.field;
        let storeDesc = configStore.getConfig(this.props.storeName);
        if (storeDesc != null) {
            innerStoreDesc.formGroupsOrder = storeDesc.formGroupsOrder;
        }
        var liControls = this.state.listItems.map((item, index) => {
            let invalidObjects = find.item(baseItem.$invalidProps, validityErrors.INNER_ERROR, 'type') || [];
            let drag = (this.state.dragIndex === index),
                style = {};
            if (drag) {
                style.left = this.state.dragX;
                style.top = this.state.dragY;
            }
            return (
                <div className={"list-item-wrapper relative" + (drag ? " drag" : "") + (index === 0 ? " first" : "") + (this.state.willDrop ? ' wd' : '') }
                    style={style}
                    key={"object-li-" + index}>
                    {!disableDrag &&
                        <div className="drag-handle"
                            style={{ "display": this.state.dragIndex === index ? "block !important" : "" }}
                            onMouseDown={this.handleDragStart} data-index={index}>
                            <i className="material-icons">drag_handle</i>
                        </div>}
                    <ObjectInput item={item}
                        baseItem={baseItem}
                        storeDesc={innerStoreDesc}
                        storeName={this.props.storeName}
                        disabled={disabled}
                        disableDelete={disableDelete || disableActions}
                        onDelete={this.handleDelete.bind(this, index) }
                        onChange={this.handleChange.bind(this, index) }
                        invalidProps={invalidObjects[index]}
                        noUpdate={this.state.dragIndex >= 0}
                        className={(index === 0 ? "first" : "") }
                        index={index}
                        user={user}/>
                </div>
            );
        });
        if (this.state.dragIndex >= 0) {
            for (let i = liControls.length; i >= 0; i--) {
                let drop = this.state.dropIndex === i, style = {};
                if (this.state.dragIndex === i && !this.state.willDrop) {
                    style.height = (20 + this.state.dragHeight) + "px";
                }
                if (drop) {
                    style.height = (this.state.dragHeight + 14) + "px";
                }
                liControls.splice(i, 0, (
                    <div className={"list-item-divider" + (drop ? " drop" : "") }
                        key={"div-li-" + i}
                        onMouseEnter={this.handleDragEnter.bind(this, i) }
                        onMouseLeave={this.handleDragLeave.bind(this, i) }
                        ref={"drop" + i}
                        onMouseUp={this.handleDrop}
                        style={style}></div>
                ));
            }
        }
        return (
            <div className={"form-field object-input relative" + (this.state.dragIndex >= 0 ? " drag" : "") }
                style={this.props.field.style}
                onMouseMove={this.handleDrag}
                onMouseLeave={this.handleDragEnd}
                onMouseUp={this.handleDragEnd}>
                <SimpleLabel text={labelText}
                    changed={this.isChanged() }
                    tooltip={this.props.field.tooltip}
                    storeName={this.props.storeName}
                    className={this.props.field.labelClassName}/>
                <div className="list-items">
                    {liControls}
                </div>
                {disableActions || disableAdding ? null :
                    <button type="button" onClick={this.handleCreate.bind(this) } className="btn-flat first">
                        <i className="fa fa-plus"></i>&#160; {addLabel || i18n.get('form.addToObjectList') }
                    </button>
                }
            </div>
        );
    }
}

ObjectList.propTypes = {
    "fieldName": React.PropTypes.string.isRequired,
    "field": React.PropTypes.object.isRequired,
    "item": React.PropTypes.object,
    "onChange": React.PropTypes.func.isRequired
};
ObjectList.defaultProps = {};

export default ObjectList;
