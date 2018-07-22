const { io } = require('../index');
const { USER_CONNECTED } = require('../../client/src/constants');

let playerPool = [];
module.exports = (socket) => {
  socket.on(USER_CONNECTED, (user) => {
    console.log(`test log msg from client side: ${user}`);

    io.emit(USER_CONNECTED, user);
  });
  socket.on('disconnect', () => {
    const indexOfDisconnected = playerPool.findIndex(s => s.id === socket.id);
    playerPool = [...playerPool.slice(0, indexOfDisconnected),
      ...playerPool.slice(indexOfDisconnected + 1)];
    console.log('disconnected, remaining playerPool', playerPool.length);
  });

  // Playe pool set up
  // PLAYER_JOINED = multiplayer button click
  socket.on('PLAYER_JOINED', (profile) => {
    const playerProfile = JSON.parse(profile);
    playerProfile.socketId = socket.id; // attach socket Id to profile
    playerPool.push(playerProfile);
    const responseWithProfiles = { // need self socket id to segregate on client
      pool: playerPool,
      self: socket.id,
    };
    io.emit('CURRENT_POOL', (responseWithProfiles));
  });
  /*
  socket.on(SIMULATE_GAMEPLAY, (gameState) => {
    if (players.length !== 2) return;
    // look for opponents
    const opponentSocketId = players.filter(p => p.id !== socket.id);
    io.to(opponentSocketId[0].id).emit('fromPlayer', gameState);
  });
  */
};
