import React from 'react';
import PropTypes from 'prop-types';
import './Demo.css';

// connect to redux and get action creators
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { gameReset, nextShape, updateScreen,
  raiseFloor, collide, speedUp, pause } from '../../Actions/tetris';

// custom functions
import tetrisShapes from './scripts/shapes';
import shapeLocator from './scripts/locateShape';
import { runCollisionTest } from './scripts/collision';
import { clearCanvas, drawShape,
  drawRuble, winRubble, drawNextShape, drawBoundary, drawCells } from './scripts/canvas';
import playerMoves from './scripts/player';
// react Components
import Controls from './controls';
import Oponent from './opponent';

// reads from store
const mapStateToProps = state => state;

// writes to store
const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    gameReset,
    nextShape,
    updateScreen,
    raiseFloor,
    collide,
    speedUp,
    pause,
  }, dispatch),
});

// end redux

class Demo extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.canvasMajor = React.createRef();
    this.canvasMinor = React.createRef();
  }
  componentDidMount() {
    this.resetBoard();
  }
  componentDidUpdate(prevProps) {
    if (Object.keys(prevProps.game).length) {
      if ((this.props.game.points.level !== prevProps.game.points.level) &&
          (this.props.game.timerInterval > 250)) {
        const l = setTimeout(() => {
          this.endTick('Level Change');
          this.speedUp();
          clearTimeout(l);
        }, 250);
      }
      if (this.props.game.rubble.boundaryCells.length !==
        prevProps.game.rubble.boundaryCells.length) {
        this.drawFloor();
      }
    }
  }

  componentWillUnmount() {
    this.endTick('componentWillUnmount');
  }

  resetBoard =async () => {
    await this.props.actions.gameReset();
    const canvasMajor = this.canvasMajor.current;
    const canvasMinor = this.canvasMinor.current;
    canvasMajor.focus();
    canvasMajor.style.backgroundColor = 'black';
    canvasMinor.style.backgroundColor = 'black';
    // setting context so it can be accesible everywhere in the class , maybe a better way ?
    this.canvasContextMajor = canvasMajor.getContext('2d');
    this.canvasContextMinor = canvasMinor.getContext('2d');
    if (this.downInterval) this.endTick('reset Board');
    this.startTick();
  }

  startTick = () => {
    this.abortCounter = 0;
    if (this.downInterval)clearInterval(this.downInterval);
    this.newShape();
    this.downInterval = setInterval(() => {
      this.tick();
    }, this.props.game.timerInterval);
  }

  tick = () => {
    if (this.props.game.paused) return;
    // handle y direction movements
    const copyOfActiveShape = Object.assign({}, this.props.game.activeShape);
    // console.log(`bbox @ tick ${this.props.game.activeShape.boundingBox}`)
    copyOfActiveShape.yPosition += this.props.game.activeShape.unitBlockSize;
    this.drawScreen(copyOfActiveShape);
  }

  endTick = async (c) => {
    this.abortCounter += 1;
    console.log(`Called by ${c} , attempts = ${this.abortCounter}`);
    clearInterval(this.downInterval);
    await this.props.actions.pause(true);
  }

  speedUp = async () => {
    await this.props.actions.speedUp();
    this.startTick();
  }

  newShape = async () => {
    const randomShape = this.props.game.nextShape ?
      this.initializeShape(this.props.game.nextShape) :
      this.initializeShape(tetrisShapes.getRandShapeName());
    const newShapeName = tetrisShapes.getRandShapeName();
    const nextShapeInfo = this.initializeShape(newShapeName);
    await this.props.actions.nextShape(newShapeName);
    drawNextShape(this.canvasContextMinor, nextShapeInfo, this.props.game);

    this.drawScreen(randomShape);
  }

  initializeShape = (shapeName) => {
    // finding intital y bound so it does not get cutoff
    const x = (shapeName !== 'shapeI' && shapeName !== 'shapeO') ?
      (this.props.game.canvas.canvasMajor.width / 2) +
      (this.props.game.activeShape.unitBlockSize / 2) :
      this.props.game.canvas.canvasMajor.width / 2;

    const initialAbsoluteVertices = tetrisShapes.getAbsoluteVertices(
      this.props.game.activeShape.unitBlockSize,
      x,
      0,
      tetrisShapes[shapeName].vertices,
    );

    const initialBoundingBox = tetrisShapes.onBoundingBox(initialAbsoluteVertices);
    const activeShape = {
      name: shapeName,
      unitBlockSize: 30,
      xPosition: x,
      yPosition: -1 * initialBoundingBox[2],
      unitVertices: tetrisShapes[shapeName].vertices,
      absoluteVertices: initialAbsoluteVertices,
      boundingBox: initialBoundingBox,
      rotationStage: 0,
      cells: [],
    };
    return activeShape;
  }

  drawFloor = async () => {
    await this.props.actions.pause(true);
    const yBoundary = this.props.game.rubble.boundaryCells.map(c => Number(c.split('-')[1]));
    const yUnique = Array.from(new Set(yBoundary));
    if (yUnique.length > 1) {
      drawBoundary(this.canvasContextMajor, this.props.game);
    }
    drawRuble(this.canvasContextMajor, this.props.game);
    await this.props.actions.pause(false);
  }

  drawScreen = async (updatedShape) => {
    clearCanvas(this.canvasContextMajor, this.props.game); // clear canvasMajor
    const shapeToDraw = updatedShape;
    [shapeToDraw.boundingBox, shapeToDraw.absoluteVertices] = tetrisShapes.getDims(updatedShape);

    const copyOfRubble = Object.assign({}, this.props.game.rubble);
    copyOfRubble.winRows = null; // need to reset back to null incase of previous win

    // Locate Shape on screen and then set .cell prop of activeShape
    const locatedShape = shapeLocator(
      this.canvasContextMajor,
      this.props.game.canvas.canvasMajor.width,
      this.props.game.canvas.canvasMajor.height,
      shapeToDraw, false,
    );

    // test for collision
    const collisionResult = runCollisionTest(this.props.game, locatedShape);
    if (collisionResult && !collisionResult.length) this.endTick('collision check - game done');
    else if (collisionResult && collisionResult.length) {
      if (collisionResult[1]) { // winner found
        // end tick to play animation and start tick back after animation is over
        this.endTick('collision check - Win');
        clearCanvas(this.canvasContextMajor, this.props.game); // clear canvasMajor
        winRubble(
          this.canvasContextMajor,
          this.props.game,
          collisionResult[1],
        );
        await this.props.actions.collide(collisionResult[0]);
        const inter = setTimeout(() => {
          this.startTick();
          clearInterval(inter);
        }, 250);
      } else { // no winner found just set state with current rubble
        this.endTick('collision check - No Win');
        await this.props.actions.collide(collisionResult[0]);
        this.startTick();
      }
    } else {
      /*  no collision is found, do this */
      const data = {
        activeShape: locatedShape,
        rubble: copyOfRubble,
        paused: false,
      };
      drawShape(this.canvasContextMajor, locatedShape, this.props.game);
      drawCells(this.canvasContextMajor, locatedShape);
      if (this.props.game && this.props.game.rubble.occupiedCells.length) {
        drawRuble(this.canvasContextMajor, this.props.game);
      }
      await this.props.actions.updateScreen(data);
    }
  }

  /* Handle Player Events Below */
  handlePause = async () => {
    this.canvasMajor.current.focus();
    await this.props.actions.pause(!this.props.game.paused);
  }

  manualFloorRaise = async () => {
    this.canvasMajor.current.focus();
    clearCanvas(this.canvasContextMajor, this.props.game, true); // clear canvasMajor
    await this.props.actions.raiseFloor(this.props.game.rubble);
  }

  gamePlay = (e) => {
    const ans = (playerMoves(e, this.props.game, this.canvasContextMajor));
    if (ans) {
      if (ans === 'tick') this.tick();
      else this.drawScreen(ans);
    }
  }

  render() {
    if (Object.keys(this.props.game).length) {
      return (
        <div className="democontainer">
          <Controls
            onCanvas={this.canvasMinor}
            onReset={() => this.resetBoard()}
            game={this.props.game}
            onhandlePause={() => this.handlePause}
            onFloorRaise={() => this.manualFloorRaise()}
          />
          <canvas
            ref={this.canvasMajor}
            width={this.props.game.canvas.canvasMajor.width}
            height={this.props.game.canvas.canvasMajor.height}
            tabIndex="0"
            onKeyDown={e => this.gamePlay(e)}
          />
          <Oponent />
        </div>
      );
    }

    return null;
  }

}

Demo.defaultProps = {
  actions: {},
  game: {},
};

Demo.propTypes = {
  actions: PropTypes.shape({
    gameReset: PropTypes.func,
    nextShape: PropTypes.func,
    updateScreen: PropTypes.func,
    raiseFloor: PropTypes.func,
    collide: PropTypes.func,
    speedUp: PropTypes.func,
    pause: PropTypes.func,
  }),
  game: PropTypes.objectOf(PropTypes.any),
};
export default connect(mapStateToProps, mapDispatchToProps)(Demo);
