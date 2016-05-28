import React from "react";
import EditorBase from "./EditorBase";
import SimpleInput from "./inputs/SimpleInput";
import ObjectList from "./inputs/object/ObjectList";
import WidgetProperty from "./viewers/WidgetProperty";
import VirtualRefList from "./inputs/select/VirtualRefList";
import ActionProperty from "./inputs/btn/ActionProperty";
import Comments from "./inputs/comments/Comments";
import Loader from "../misc/Loader";
import i18n from "../../stores/i18nStore.js";
import changesProcessor from "../../utils/changesProcessor.js";
import {propertyTypes, displayTypes} from "constants";
import classNames from "classnames";
import template from "template";
import validation from "validation";

const columnWidth = 330;

export default class SimpleForm extends EditorBase {
    constructor(props) {
        super(props);
        this.state = {"item": this.getItem(props), "columnCount": 1};
        this.cancel = this.cancel.bind(this);
        this.save = this.save.bind(this);
    }

    componentWillReceiveProps(next) {
        this.setState({"item": this.getItem(next)});
    }

    componentDidMount() {
        this.componentDidRender();
    }

    componentDidUpdate() {
        this.componentDidRender();
    }

    componentDidRender() {
        //Checking form column count
        let form = this.refs.form;
        if (form == null) {
            return;
        }
        let columnCount = Math.floor(form.offsetWidth / columnWidth);
        if (columnCount !== this.state.columnCount) {
            this.setState({"columnCount": columnCount});
        }
    }

    render() {
        if (this.state.item == null) {
            return (
                <div>
                    <h2>{i18n.get("form.e404")}</h2>

                    <p>{i18n.get("form.e404prompt")}</p>
                </div>
            );
        }
        let item = this.state.item, {storeDesc} = this.props;
        let combinedItem = changesProcessor.combineItem(item, true, true);
        var user = this.props.user || {"_id": null};
        var access = storeDesc.groupAccess + (user._id === item._ownerId ? storeDesc.ownerAccess : "");

        if (item != null) {
            var fieldControls = [];
            let propGroups = this.getPropGroupsMap(storeDesc, Object.assign({"$user": user}, item, item.$changedProps)),
                hc = this.handleChange.bind(this),
                hf = this.handleFocus.bind(this),
                hb = this.handleBlur.bind(this);
            //Creating inputs for each group in their order
            for (var [key, value] of propGroups) {
                let firstInput = true, wrappedInputs = [], wrapperPushed = false, wrapperNumber = 0;
                for (let field of value) {
                    if (EditorBase.isPropHidden(storeDesc, field, user, combinedItem, this.props.tab)) {
                        continue;
                    }
                    var input,
                        props = {
                            key: field.name,
                            fieldName: field.name,
                            field: field,
                            propName: field.name,
                            propDesc: field,
                            storeName: this.props.storeName,
                            storeDesc: this.props.storeDesc,
                            item: this.state.item,
                            combinedItem: combinedItem,
                            onChange: hc,
                            onFocus: hf,
                            onBlur: hb,
                            readOnly: access.indexOf("u") < 0 || field.readOnly,
                            user: user,
                            performAction: this.props.performAction,
                        };
                    switch (field.type) {
                        case propertyTypes.virtualRefList:
                            props.actions = this.props.actions;
                            input = React.createElement(VirtualRefList, props);
                            break;
                        case propertyTypes.action:
                            input = React.createElement(ActionProperty, props);
                            break;
                        case propertyTypes.object:
                        case propertyTypes.objectList:
                            props.required = field.required;
                            props.minLength = field.minLength;
                            props.multi = field.type === "objectList";
                            props.maxLength = field.maxLength;
                            input = React.createElement(ObjectList, props);
                            break;
                        case propertyTypes.comments:
                            props.actions = this.props.actions;
                            input = React.createElement(Comments, props);
                            break;
                        case propertyTypes.widget:
                            props.storeDesc = this.props.storeDesc;
                            input = React.createElement(WidgetProperty, props);
                            break;
                        default:
                            input = React.createElement(SimpleInput, props);
                            break;
                    }
                    if (input) {
                        if (firstInput && key) {
                            let groupLabel = template.render(key, {"$i18n": i18n.getForStore(this.props.storeName)});
                            if (groupLabel.trim()) {
                                fieldControls.push((
                                    <div className="group-label" key={key + "-group"}><span>{groupLabel}</span></div>));
                            }
                            firstInput = false;
                        }
                        if ((field.name === storeDesc.headerProperty) ||
                            (field.display === displayTypes.headerInput)) {
                            //(field.name === 'name' && !storeDesc.headerProperty && !storeDesc.headerTemplate)) {
                            continue;
                        }
                        if (!wrapperPushed) {
                            fieldControls.push(<div className="fields-wrapper" key={key + "-" + wrapperNumber}>{wrappedInputs}</div>);
                            wrapperPushed = true;
                        }
                        if (field.type === propertyTypes.objectList || field.type === propertyTypes.object) {
                            fieldControls.push(input);
                            wrappedInputs = [];
                            wrapperPushed = false;
                            wrapperNumber++;
                        } else {
                            wrappedInputs.push(input);
                        }
                    }
                }
            }
            //console.log("fieldControls: ", fieldControls);
        }
        var canSave = changesProcessor.canSave(item);
        var hideSave = access.indexOf("u") < 0 && item.$state !== "new";
        var hideCancel = (this.props.directWrite && !this.props.cancel) ||
            this.props.hideCancel || hideSave;
        var cn = classNames(this.props.className, {
            "editor-form": true,
            "dark": this.props.dark,
            "multi-column": this.state.columnCount > 1,
        });
        if (this.props.verySimple) {
            return (
                <div ref="form" id={this.props.id} className={cn}>
                    {fieldControls}
                </div>
            );
        }
        let res = (
            <form ref="form" id={this.props.id} className={cn}
                  autoComplete={this.props.disableAutoComplete ? "off" : ""}>
                {this.props.disableAutoComplete ?
                    <input type="text" name="fakeusernameremembered"
                           style={{"position": "absolute", "opacity": "0", "zIndex": "-1"}}/> : null}
                {this.props.disableAutoComplete ?
                    <input type="password" id="password" name="password"
                           style={{"position": "absolute", "opacity": "0", "zIndex": "-1"}}/> : null}

                {fieldControls}

                {/*JSON.stringify(item.$invalidProps)*/}

                {this.props.hideButtons ? null :
                    <div className={this.props.buttonsContainerClassName}>
                        <button type="submit"
                                className={(this.props.saveClass || "btn-default") + (hideSave ? " hidden" : "")}
                                disabled={!canSave}
                                onClick={this.save}>
                            {this.props.saveIcon == null ? null :
                                <i className="material-icons text md-18">{this.props.saveIcon}</i> }
                            {this.props.saveText == null ? i18n.get("form.save") :
                                this.props.saveText }
                        </button>
                        {hideCancel ? null :
                            <button type="button"
                                    className={(this.props.cancelClass || "btn-flat") + (hideCancel ? " hidden" : "")}
                                    disabled={!changesProcessor.canUndo(item)}
                                    onClick={this.cancel}>
                                {this.props.cancelIcon == null ? null :
                                    <i className="material-icons text md-18">{this.props.cancelIcon}</i> }
                                {this.props.cancelText == null ? i18n.get("form.cancel") :
                                    this.props.cancelText }
                            </button>
                        }
                        <Loader className={"xs saving-loader" + (item.$state === "saving" ? "" : " hidden")}/>
                    </div>
                }
            </form>
        );
        //console.log("Render: ", (Date.now() - start));
        return res;
    }

    save(e) {
        e.preventDefault();
        let invalidProps = validation.validate(this.props.storeDesc.props, this.props.item, null, this.props.user);
        //console.log(invalidProps);
        if (Object.keys(invalidProps).length > 0) {
            let invalid = this.refs.form.querySelector(".invalid input");
            if (invalid) {
                invalid.focus();
            }
            if (typeof this.props.onSubmitError === "function") {
                this.props.onSubmitError();
            }
            return;
        }
        if (typeof this.props.onSubmit === "function") {
            this.props.onSubmit();
        }
    }

    cancel() {
        if (typeof this.props.cancel === "function") {
            this.props.cancel();
        } else {
            this.state.item.$changedProps = {};
            this.emitChange(this.state.item);
        }
    }
}
SimpleForm.propTypes = {storeDesc: React.PropTypes.object.isRequired};
SimpleForm.defaultProps = {actions: {}};