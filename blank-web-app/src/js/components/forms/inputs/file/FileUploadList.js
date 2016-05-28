/**
 * Created by kib357 on 28/01/16.
 */

import React from 'react';
import FileSummary from './FileSummary';
import fileUploadStore from '../../../../stores/fileUploadStore';
import {storeEvents} from 'constants';

class FileUploadList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.state.uploads = fileUploadStore.get(this.props.owner);
        this._onChange = this._onChange.bind(this);
    }

    componentWillMount() {
        fileUploadStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        fileUploadStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    _onChange() {
        this.setState({"uploads": fileUploadStore.get(this.props.owner)});
    }

    render() {
        return (
            <div className="upload-list">
                {this.state.uploads.map((file, index) =>
                    <FileSummary upload={file} key={index}/>
                )}
            </div>
        );
    }
}

FileUploadList.propTypes = {};
FileUploadList.defaultProps = {};

export default FileUploadList;
