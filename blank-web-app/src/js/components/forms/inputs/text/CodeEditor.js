import React, {Component} from 'react';
import ReactAce from './ReactAce.js';

class CodeEditor extends Component {
    render() {
        return (
            <div style={{"marginTop": "14px"}}>
                <ReactAce value={this.props.value} onChange={this.props.onChange}/>
            </div>
        );
    }
}

export default CodeEditor;