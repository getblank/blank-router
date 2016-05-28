/**
 * Created by kib357 on 31/01/16.
 */

import dispatcher from "../dispatcher/blankDispatcher";
import {userActions, serverActions} from "constants";

const baseUri = location.origin + "/files/";

class FileUploadActuators {
    newUploads(uploads) {
        dispatcher.dispatch({
            "actionType": userActions.FILE_UPLOAD_NEW,
            "uploads": uploads,
        });
    }

    cancelUpload(id) {
        dispatcher.dispatch({
            "actionType": userActions.FILE_UPLOAD_CANCEL,
            "uploadId": id,
        });
    }

    createUploadRequest(upload) {
        let xhr = new XMLHttpRequest();
        var formData = new FormData();
        //var fileName = transliterate(name || file.name);
        formData.append("file", upload.file, upload.file.name);//(upload.name.substr(0, upload.name.lastIndexOf('.')) || upload.name));

        xhr.upload.addEventListener("progress", function (e) {
            if (e.lengthComputable) {
                let percentage = Math.round((e.loaded * 100) / e.total);
                dispatcher.dispatch({
                    "actionType": serverActions.FILE_UPLOAD_RESPONSE,
                    "type": "progress",
                    "uploadId": upload._id,
                    "progress": percentage,
                });
            }
        }, false);
        xhr.upload.addEventListener("abort", function (e) {
            dispatcher.dispatch({
                "actionType": serverActions.FILE_UPLOAD_RESPONSE,
                "type": "abort",
                "uploadId": upload._id,
            });
        });
        xhr.addEventListener("readystatechange", function (e) {
            if (xhr.readyState === 4) {
                dispatcher.dispatch({
                    "actionType": serverActions.FILE_UPLOAD_RESPONSE,
                    "type": "result",
                    "uploadId": upload._id,
                    "xhr": xhr,
                });
            }
        });
        xhr.open("POST", this.getUri(upload._id, upload.targetStore));
        xhr.send(formData);
        return xhr;
    }

    createDeleteRequest(upload) {
        let xhr = new XMLHttpRequest();
        var formData = new FormData();
        formData.append("id", upload._id);
        xhr.open("DELETE", this.getUri(upload._id, upload.targetStore));
        xhr.send(formData);
    }

    getUri(id, targetStore) {
        return baseUri + targetStore + "/" + id + "?key=" + localStorage.getItem("tempKey");
    }
}

export default new FileUploadActuators();