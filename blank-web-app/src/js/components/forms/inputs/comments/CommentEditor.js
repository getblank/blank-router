/**
 * Created by kib357 on 29/05/15.
 */

import React from 'react';
import TextArea from '../text/TextArea';
import i18n from '../../../../stores/i18nStore';
import Uploader from './Uploader';
import uuid from 'node-uuid';
import find from 'utils/find';

var CommentEditor = React.createClass({
    getInitialState: function () {
        return {"posting": false, "text": "", attachments: [], "commentId": uuid.v4()};
    },
    componentWillReceiveProps: function (nextProps) {
        if (nextProps.itemId !== this.props.itemId) {
            this.setState(this.getInitialState());
        }
    },
    canNotSend: function () {
        return (this.state.text.trim().length === 0 && this.state.attachments.length === 0);
    },
    send: function () {
        if (this.canNotSend()) {
            return;
        }
        this.setState({"posting": true}, function () {
            this.props.actions.addComment(this.props.itemId, this.props.fieldName, {
                "_id": this.state.commentId,
                "text": this.state.text,
                "files": this.state.attachments
            }).then(res => {
                if (this.isMounted()) {
                    this.setState(this.getInitialState());
                }
            }, error => {
                this.setState({"posting": false});
            });
        });
    },
    handleKeyDown: function (e) {
        var key = e.keyCode;
        if (key === 13) {
            e.preventDefault();
        }
    },
    handleKeyUp: function (e) {
        var key = e.keyCode;
        if (key === 13) {
            e.preventDefault();
            e.stopPropagation();
            if (e.ctrlKey) {
                var caret = this.getCaret(e.target);
                console.log(caret);
                var text = this.state.text.substring(0, caret) + "\n" + this.state.text.substring(caret, this.state.text.length);
                this.setState({"text": text});
            }
            else {
                if (this.canNotSend()) {
                    return;
                }
                this.send();
            }
        }
    },
    getCaret: function (el) {
        if (el.selectionStart) {
            return el.selectionStart;
        } else if (document.selection) {
            el.focus();
            var r = document.selection.createRange();
            if (r == null) {
                return 0;
            }
            var re = el.createTextRange(), rc = re.duplicate();
            re.moveToBookmark(r.getBookmark());
            rc.setEndPoint('EndToStart', re);
            return rc.text.length;
        }
        return 0;
    },
    handleTextChange: function (value) {
        this.setState({"text": value});
    },
    selectFile: function (e) {
        var input = this.refs['file'];
        input.click();
    },
    selectPhoto: function (e) {
        var input = this.refs['photo'];
        input.click();
    },
    uploadImage: function (e) {
        this.upload(e.target.files, 'image');
    },
    uploadDoc: function (e) {
        this.upload(e.target.files, 'doc');
    },
    upload: function (files, type) {
        var attachments = this.state.attachments.slice();
        var uploader = this.refs['uploader'];
        for (var i = 0; i < files.length; i++) {
            var name = files[i].name;
            var number = 0;
            while (find.indexById(attachments, name, 'name') >= 0) {
                name = name.replace(' (' + number + ')', '');
                number++;
                name += ' (' + number + ')';
            }
            attachments.push({"name": name, "type": type});
            uploader.upload(files[i], name);
        }
        this.setState({"attachments": attachments});
    },
    onFileUploaded: function (name, fileName) {
        var attachments = this.state.attachments.slice();
        var attachment = find.itemById(attachments, name, 'name');
        attachment.fileName = fileName;
        this.setState({"attachments": attachments});
    },
    removeAttachment: function (name) {
        var attachments = this.state.attachments.slice();
        var index = find.indexById(attachments, name, 'name');
        attachments.splice(index, 1);
        this.setState({"attachments": attachments});
    },
    render: function () {
        var images = this.state.attachments.map(function (i) {
            if (i.type !== 'image' || typeof i.fileName === 'undefined') {
                return null;
            }
            return (
                <div className="pd-uploaded-image">
                    <img alt={i.name} src={"/uploads/comments/" + this.state.commentId + "/" + i.fileName}/>
                    <a className="remove" onClick={this.removeAttachment.bind(this, i.name)}>
                        <i className="fa fa-remove"></i>
                    </a>
                </div>
            );
        }, this);
        var files = this.state.attachments.map(function (i) {
            if (i.type !== 'doc' || typeof i.fileName === 'undefined') {
                return null;
            }
            return (
                <div className="pd-uploaded-doc">
                    <a href={"/uploads/comments/" + this.state.commentId + "/" + i.fileName} target="_blank">
                        <i className="fa fa-file-o"></i> {i.name}</a>
                    <a className="remove" onClick={this.removeAttachment.bind(this, i.name)}>
                        <i className="fa fa-remove"></i>
                    </a>
                </div>
            );
        }, this);
        return (
            <div className="pd-comment-editor">
                <div className="pd-uploaded-image-list">
                    {images}
                </div>
                {files}
                <Uploader ref='uploader' onUpload={this.onFileUploaded} params={"commentId=" + this.state.commentId}
                          path="/comments"/>
                <TextArea value={this.state.text}
                          disabled={this.state.posting}
                          onChange={this.handleTextChange}
                          onKeyDown={this.handleKeyDown}
                          onKeyUp={this.handleKeyUp}
                          placeholder={i18n.get("comments.placeholder")}
                          className="form-control"/>
                {/*<textarea
                 className="form-control"
                 value={this.state.text}
                 disabled={this.state.posting}
                 onChange={this.handleTextChange}
                 onKeyDown={this.handleKeyDown}
                 onKeyUp={this.handleKeyUp}
                 id="commentText"/>*/}
                <button type="button"
                        onClick={this.send}
                        disabled={this.state.posting || this.canNotSend()}
                        className="btn-icon first">{this.state.posting ?
                    <i className="material-icons text">query_builder</i> :
                    <i className="material-icons text">send</i> }
                </button>
                {/*<button type="button" ref="fileBtn"
                 onClick={this.selectFile}
                 disabled={this.state.posting}
                 className="btn btn-link">Прикрепить файл</button>
                 <button type="button" ref="photoBtn"
                 onClick={this.selectPhoto}
                 disabled={this.state.posting}
                 className="btn btn-link">Прикрепить фото</button>
                 <input ref="photo"
                 className="choose_photo_upload file"
                 size="28"
                 onChange={this.uploadImage}
                 multiple="true"
                 name="photo"
                 accept="image/jpeg,image/png,image/gif"
                 style={{"visibility": "hidden", "position": "absolute"}}
                 type="file"/>
                 <input ref="file"
                 className="file"
                 size="28"
                 onChange={this.uploadDoc}
                 multiple="true"
                 style={{"visibility": "hidden", "position": "absolute"}}
                 type="file"/>*/}
            </div>
        )
    }
});

module.exports = CommentEditor;