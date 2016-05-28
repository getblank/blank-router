/**
 * Created by kib357 on 08/09/15.
 */

import React from "react";
import ObjectInspector from "./object-inspector/ObjectInspector.js";
import configStore from "../../stores/configStore.js";
import credentialsStore from "../../stores/credentialsStore.js";

class ConfigViewer extends React.Component {
    render() {
        return (
            <div className="fill scroll">
                <div className="container">
                    <span className="headline m-t-14 m-b-14">User</span>
                    <ObjectInspector data={credentialsStore.getUser()}/>
                    <br/>
                    <span className="headline m-t-14 m-b-14">Config</span>
                    <ObjectInspector data={configStore.getRawConfig()}/>
                    <br/>
                </div>
            </div>
        );
    }
}

ConfigViewer.propTypes = {};
ConfigViewer.defaultProps = {};

export default ConfigViewer;
