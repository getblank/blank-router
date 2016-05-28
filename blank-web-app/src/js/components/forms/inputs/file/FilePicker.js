/**
 * Created by kib357 on 26/01/16.
 */

import React from 'react';
import FileSummary from './FileSummary';
import fileUploadActions from '../../../../actions/fileUploadActuators';
import fileUploadStore from '../../../../stores/fileUploadStore';
import i18n from '../../../../stores/i18nStore';
import {uploadStates} from 'constants';
import find from 'utils/find';
import uuid from 'node-uuid';

class FilePicker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.value = this.props.value;
        this.state.over = false;
        this.handleDrag = this.handleDrag.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
    }

    chooseHandler() {
        this.refs.fileInput.click();
    }

    componentWillReceiveProps(nextProps) {
        this.setState({"value": nextProps.value});
    }

    handleDelete(id) {
        let index = find.index(this.state.value, id);
        console.log("Index: ", index);
        if (this.state.value[index].hasOwnProperty("$uploadState")) {
            fileUploadActions.cancelUpload(id);
        }
        let value = this.state.value.slice();
        value.splice(index, 1);
        console.log("Value: ", value);
        this.props.onChange(value, true);
    }

    handleDrag(e) {
        e.stopPropagation();
        e.preventDefault();
        this.setState({"over": true});
    }

    handleDragLeave(e) {
        e.stopPropagation();
        e.preventDefault();
        this.setState({"over": false});
    }

    handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();

        let dt = e.dataTransfer;
        this.handleFiles(dt.files);
        this.setState({"over": false});
    }

    handleChange(e) {
        this.handleFiles(this.refs.fileInput.files);

    }

    handleFiles(files) {
        var {multiple} = this.props,
            uploads = [],
            value = multiple ? (this.state.value || []).slice() : [];
        let max = multiple ? files.length : Math.min(files.length, 1);
        for (let i = 0; i < max; i++) {
            let upload = {
                "file": files[i],
                "_id": uuid.v4(),
                "itemId": this.props.itemId,
                "targetStore": this.props.targetStore,
            };
            if (fileUploadStore.canUpload) {
                uploads.push(upload);
            }
            let res = {
                "_id": upload._id,
                "size": files[i].size,
                "name": files[i].name,
                "type": files[i].type,
                "$uploadState": uploadStates.uploading,
                "$progress": 0,
            };
            switch (upload.file.type) {
                case "image/png":
                case "image/jpeg":
                case "image/gif":
                    res.$url = window.URL.createObjectURL(upload.file);
                    break;
            }
            value.push(res);
        }
        this.props.onChange(value, true);
        fileUploadActions.newUploads(uploads, "");
    }

    render() {
        let canAdd = !this.props.disabled && !this.props.disableAdding;
        let uploads = (this.props.value || []).map(upload => <FileSummary key={upload._id}
                                                                          targetStore={this.props.targetStore}
                                                                          upload={upload}
                                                                          disabled={this.props.disabled || this.props.disableDeleting}
                                                                          onDelete={this.handleDelete.bind(this)}/>);
        return (
            <div className="file-picker">
                {canAdd &&
                    <div className={"drop-zone" + (this.state.over ? " over" : "")}
                         onDragEnter={this.handleDrag}
                         onDragLeave={this.handleDragLeave}
                         onDragOver={this.handleDrag}
                         onDrop={this.handleDrop}>
                        <button type="button"
                                onClick={this.chooseHandler.bind(this)}
                                style={{"margin": "0px"}}
                                className="btn-flat btn-default">
                            {i18n.get('form.pickFile')}
                        </button>
                        <span>{i18n.get('form.dropFile')}</span>
                    </div>
                }
                <div className="upload-list">
                    {uploads.length > 0 ? uploads : <p><i>{i18n.get('lists.empty')}</i></p>}
                </div>
                <input type="file"
                       ref="fileInput"
                       multiple={this.props.multiple}
                       accept={this.props.accept}
                       style={{"display":"none"}}
                       onChange={this.handleChange.bind(this)}/>
            </div>
        );
    }
}
//accept="image/*"

FilePicker.propTypes = {};
FilePicker.defaultProps = {};

export default FilePicker;
