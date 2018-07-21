import React from 'react';
import PropTypes from 'prop-types';
import './opponent.css';

// connect to redux
import { connect } from 'react-redux';

import {
  SIMULATE_GAMEPLAY,
} from '../../constants';
import { socket } from '../../Actions/socket';
import { clearCanvas, drawRuble, drawBoundary, drawCells } from './scripts/canvas';

// reads from store
const mapStateToProps = state => state;

// writes to store
class Opponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = { };
    this.canvasOpponent = React.createRef();
    socket.on(SIMULATE_GAMEPLAY, (msg) => {
      this.processSocket(msg);
    });
  }
  componentDidMount() {
    console.log('Opponent Mounted!!');
  }

  componentDidUpdate(prevProps, prevState) {
    if (Object.keys(prevState).length) {
      if (prevState.points.totalLinesCleared !== this.state.points.totalLinesCleared) {
        this.props.onFloorRaise();
      }
    }
  }

  componentWillUnmount() {
    socket.disconnect();
  }


  setGame = () => {
    if (Object.keys(this.state).length) {
      // full deep copy of game state needed as object mutation becomes a problem
      const copyOfState = JSON.parse(JSON.stringify(this.state));
      const canvasOpponent = this.canvasOpponent.current;
      canvasOpponent.style.backgroundColor = 'black';
      this.canvasOpponentContext = canvasOpponent.getContext('2d');
      copyOfState.activeShape.unitBlockSize /= 2;
      clearCanvas(this.canvasOpponentContext, copyOfState);
      drawBoundary(this.canvasOpponentContext, copyOfState);
      drawCells(this.canvasOpponentContext, copyOfState.activeShape, true);
      drawRuble(this.canvasOpponentContext, copyOfState, true);
      if (this.props.gameOver) {
        clearInterval(this.simulationInterval);
        clearCanvas(this.canvasOpponentContext, copyOfState);
        this.props.onReset();
      }
    }
  };

  processSocket = (msg) => {
    this.setState(JSON.parse(msg), () => this.setGame());
  }

  render() {
    if (this.props.game.activeShape.cells.length) {
      return (
        <div className="opponentContainer">
          <div className="opponentDescription">
            <h2>Opponent</h2>
            <p>Name: William</p>
            <p>Location: Papua New Guinea</p>
            <p>Rank: 56</p>
          </div>
          <canvas
            ref={this.canvasOpponent}
            width={this.props.game.canvas.canvasMajor.width / 2}
            height={this.props.game.canvas.canvasMajor.height / 2}
            tabIndex="0"
            onKeyDown={e => this.gamePlay(e)}
          />
        </div>
      );
    }
    return null;
  }

}

Opponent.defaultProps = {
  game: {},
  onFloorRaise: null,
  gameOver: false,
  onReset: null,
};
Opponent.propTypes = {
  game: PropTypes.objectOf(PropTypes.any),
  gameOver: PropTypes.bool,
  onFloorRaise: PropTypes.func,
  onReset: PropTypes.func,
};

export default connect(mapStateToProps)(Opponent);
