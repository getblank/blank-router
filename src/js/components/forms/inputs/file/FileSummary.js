/**
 * Created by kib357 on 28/01/16.
 */

import React from 'react';
import fileUploadActions from '../../../../actions/fileUploadActuators';
import find from 'utils/find';

class FileSummary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    cancelUpload() {
        if (typeof this.props.onDelete === 'function') {
            this.props.onDelete(this.props.upload._id);
        }
        //fileUploadActions.cancelUpload(this.props.upload._id);
    }

    render() {
        let {upload} = this.props;
        let isNew = upload.$uploadState != null;
        let size = upload.size ? upload.size / 1024 : 0, sizeUnits = 'KB';
        if (size > 1024) {
            size = size / 1024;
            sizeUnits = 'MB';
        }
        if (size > 1024) {
            size = size / 1024;
            sizeUnits = 'GB';
        }
        let previewStyle = {};
        if (upload.$url) {
            previewStyle.background = 'no-repeat center/100% url("' + upload.$url + '")';
        }
        let stateText = upload.$progress + '% / ' + size.toFixed(1) + " " + sizeUnits;
        if (upload.$uploadState === 'error') {
            stateText = "Error: " + upload.error;
        }
        let downloadLink = null;
        if (!isNew) {
            downloadLink = (
                <a href={fileUploadActions.getUri(upload._id, this.props.targetStore)}
                   target="_blank">
                    {upload.name}
                </a>
            );
        }
        return (
            <div className="file-summary">
                <div className="preview no-shrink">
                    <div style={previewStyle}>
                        {!upload.$url && <span className="abbr">{find.abbr(upload.name)}</span>}
                    </div>
                </div>
                <div className="info">
                    {downloadLink || upload.name}
                    {isNew && <span>{stateText}</span>}
                </div>
                {!this.props.disabled &&
                <div className="actions no-shrink">
                    <button className="btn-icon first last" onClick={this.cancelUpload.bind(this)}>
                        <i className="material-icons text md-16">cancel</i>
                    </button>
                </div>
                }
            </div>
        );
    }
}

FileSummary.propTypes = {};
FileSummary.defaultProps = {};

export default FileSummary;
