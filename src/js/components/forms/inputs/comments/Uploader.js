/**
 * Created by kib357 on 28/05/15.
 */

var React = require('react'),
    uuid = require('node-uuid'),
    find = require('utils/find'),
    transliterate = require('utils/translit');

var Uploader = React.createClass({
    getInitialState: function () {
        var state = {
            "uploads": []
        };
        return state;
    },
    upload: function (file, name) {
        var self = this;
        var upload = {
            "name": file.name,
            "progress": 0,
            "xhr": new XMLHttpRequest()
        };
        var uploads = this.state.uploads;
        uploads.push(upload);
        self.forceUpdate();
        var formData = new FormData();
        var fileName = transliterate(name || file.name);
        console.log("!!!!fileName: " + fileName);
        formData.append((fileName.substr(0, fileName.lastIndexOf('.')) || fileName), file);

        upload.xhr.upload.addEventListener("progress", function (e) {
            if (e.lengthComputable) {
                var percentage = Math.round((e.loaded * 100) / e.total);
                upload.progress = percentage;
                self.forceUpdate();
            }
        }, false);
        upload.xhr.upload.addEventListener("load", function (e) {
            var index = find.indexById(self.state.uploads, upload._id);
            self.state.uploads.splice(index, 1);
            self.forceUpdate();
            if (typeof self.props.onUpload === 'function') {
                self.props.onUpload(name || file.name, fileName);
            }
        }, false);
        upload.xhr.upload.addEventListener("abort", function (e) {
            console.log('cancelling upload...');
            var index = find.indexById(self.state.uploads, upload._id);
            self.state.uploads.splice(index, 1);
            self.forceUpdate();
        });
        var params = this.props.params ? '&' + this.props.params : '';
        upload.xhr.open("POST", location.origin + (this.props.path || '/upload') + '?k=' + localStorage.getItem('tempKey') + params);
        upload.xhr.send(formData);
    },
    cancelUpload: function (upload) {
        upload.xhr.abort();
    },
    render: function () {
        var uploads = this.state.uploads.map(function (i) {
            return (
                <div className="loop-upload">
                    <div className="loop-progress">
                        <div style={{"width": i.progress + '%'}}></div>
                    </div>
                    <div className="loop-upload-name">
                        <span>{i.name}</span>
                    </div>
                    <a onClick={this.cancelUpload.bind(this, i)}>
                        <i className="fa fa-remove"></i>
                    </a>
                </div>);
        }, this);
        return (
            <div>
                {uploads}
            </div>
        )
    }
});

module.exports = Uploader;