/**
 * Created by kib357 on 18/10/15.
 */

import React from 'react';
import audioStore from '../../../../stores/audioStore.js';
import audioActions from '../../../../actions/audioActuators.js';
import { storeEvents } from 'constants';

class AudioPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getStateFromStore(props);
        this.getStateFromStore = this.getStateFromStore.bind(this);
        this._onChange = this._onChange.bind(this);
        this.stop = this.stop.bind(this);
    }

    getStateFromStore(props) {
        let currentAudio = audioStore.get(), res = {};
        res.src = currentAudio.src;
        res.playerState = currentAudio.state;
        return res;
    }

    _onChange() {
        this.setState(this.getStateFromStore());
    }

    componentDidMount() {
        audioStore.on(storeEvents.CHANGED, this._onChange);
    }

    componentWillUnmount() {
        audioStore.removeListener(storeEvents.CHANGED, this._onChange);
    }

    stop() {
        audioActions.stop();
    }

    componentDidUpdate(prevProps, prevState) {
        //console.log("Player: ", this.refs.player, " playerState: ", this.state.playerState);
        if (this.refs.player != null) {
            switch (this.state.playerState) {
                case "playing":
                    this.refs.player.play();
                    break;
                case "paused":
                    this.refs.player.pause();
                    break;
                case "stopped":
                    this.refs.player.pause();
                    this.refs.player.currentTime = 0;
                    break;
            }
        }
    }

    render() {
        return this.state.src ?
            <audio src={this.state.src}
                   ref="player"
                   onEnded={this.stop}>
            </audio> :
            null;
    }
}

AudioPlayer.propTypes = {};
AudioPlayer.defaultProps = {};

export default AudioPlayer;
