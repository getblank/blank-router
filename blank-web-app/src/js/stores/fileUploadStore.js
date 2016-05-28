/**
 * Created by kib357 on 28/01/16.
 */

import BaseStore from "./baseStore";
import fileActions from "../actions/fileUploadActuators";
import {userActions, serverActions, uploadStates} from "constants";
import find from "utils/find";

class FileUploadStore extends BaseStore {
    constructor(props) {
        super(props);
        this.uploads = [];
        this.history = [];
    }

    get(owner) {
        return this.uploads.filter(u => owner == null || u.owner === owner);
    }

    getLastModified() {
        return this.lastModified;
    }

    __areFilesEquals(file1, file2) {
        return file1.size === file2.size &&
            file1.lastModifiedDate.getTime() === file2.lastModifiedDate.getTime() &&
            file1.name === file2.name;
    }

    canUpload(upload) {
        return (this.uploads.filter(f => f.state !== uploadStates.ready && this.__areFilesEquals(f.file, upload.file)).length === 0);
    }

    handleNewUploads(uploads) {
        for (let upload of uploads) {
            if (!this.canUpload(upload)) {
                console.log("Equals file found, skipping");
                continue;
            }
            upload.state = uploadStates.uploading;
            upload.progress = 0;
            upload.xhr = fileActions.createUploadRequest(upload);
            this.uploads.push(upload);
        }
    }

    handleCancelUpload(id) {
        let index = find.index(this.uploads, id);
        let upload = this.uploads[index];
        if (upload) {
            switch (upload.state) {
                case uploadStates.uploading:
                    upload.state = uploadStates.aborting;
                    setTimeout(() => { upload.xhr.abort() }, 0);
                    break;
                case uploadStates.ready:
                    fileActions.createDeleteRequest(upload);
                    this.uploads.splice(index, 1);
                    break;
                default:
                    this.uploads.splice(index, 1);
                    break;
            }
        }
    }

    handleUploadResponse(payload) {
        let upload = find.item(this.uploads, payload.uploadId);
        switch (payload.type) {
            case "progress":
                //console.log("progress");
                upload.progress = payload.progress;
                break;
            case "result": {
                //console.log("result");
                let status = upload.xhr.status;
                if (status === 200) {
                    upload.state = uploadStates.ready;
                    upload.progress = 100;
                } else {
                    upload.state = uploadStates.error;
                    upload.error = status.toString() + " - " + payload.xhr.statusText;
                }
                break;
            }
            case "abort": {
                let index = find.index(this.uploads, payload.uploadId);
                this.uploads.splice(index, 1);
                console.log("abort");
                break;
            }
        }
        this.lastModified = upload;
    }

    __onDispatch(payload) {
        this.lastModified = null;
        switch (payload.actionType) {
            case userActions.FILE_UPLOAD_NEW:
                this.handleNewUploads(payload.uploads, payload.owner);
                this.__emitChange();
                break;
            case userActions.FILE_UPLOAD_CANCEL:
                this.handleCancelUpload(payload.uploadId);
                this.__emitChange();
                break;
            case serverActions.FILE_UPLOAD_RESPONSE:
                this.handleUploadResponse(payload);
                this.__emitChange();
                break;
            case userActions.ITEM_SAVE_DRAFT:
                break;
        }
    }
}

let store = new FileUploadStore();

export default store;