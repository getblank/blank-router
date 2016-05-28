/**
 * Created by kib357 on 08/09/15.
 */

import React from 'react';
import CommentEditor from './CommentEditor';
import i18n from '../../../../stores/i18nStore';
import moment from 'moment';

class Comments extends React.Component {
    render() {
        var items = this.props.item[this.props.fieldName] || [];
        var comments = items.map(function (item) {
            var attachments = item.files || [];
            var images = attachments.filter(function (a) {
                return a.type === 'image';
            });
            var files = attachments.filter(function (a) {
                return a.type === 'doc';
            });
            var commentImages = images.map(function (i, index) {
                return (
                    <div className="pd-uploaded-image" key={item._id + '-image-' + index}>
                        <a href={"/uploads/comments/" + item._id + "/" + i.fileName} target="_blank">
                            <img alt={i.name} src={"/uploads/comments/" + item._id + "/" + i.fileName}/>
                        </a>
                    </div>
                );
            }, this);
            var commentFiles = files.map(function (i, index) {
                return (
                    <div className="pd-uploaded-doc" key={item._id + '-file-' + index}>
                        <a href={"/uploads/comments/" + item._id + "/" + i.fileName} target="_blank">
                            <i className="fa fa-file-o"></i> {i.name}</a>
                    </div>
                );
            }, this);
            var textLines = item.text.split(/\r?\n/);
            textLines = textLines.map((line, index) => {
               return (
                   <p key={item._id + "-line-" + index}>{line}</p>
               )
            });
            return (
                <div className="pd-comment" key={'comment-' + item._id}>
                    <span>{item.author}</span>

                    <div className="pd-uploaded-image-list">
                        {commentImages}
                    </div>
                    {commentFiles}
                    {textLines}
                    <span>{moment(item.createdAt).format('dd D MMMM HH:mm')}</span>
                </div>);
        }, this);
        return (
            <div className="form-field">
                <span className="title m-t-14">{this.props.field.label || i18n.get("comments.label")}</span>
                <div className="pd-comment-list">
                    {this.props.item[this.props.fieldName] && this.props.item[this.props.fieldName].length > 0 ? comments :
                        null}
                </div>
                {!this.props.readOnly &&
                     <CommentEditor actions={this.props.actions}
                               fieldName={this.props.fieldName}
                               itemId={this.props.item._id}/>}
            </div>
        )

    }
}

Comments.propTypes = {};
Comments.defaultProps = {};

export default Comments;
