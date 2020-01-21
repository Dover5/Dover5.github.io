const server = require('http').createServer();
const io = require('socket.io')(server);

server.listen(80, '0.0.0.0', function() {
    console.log('0.0.0.0, Listening to port:  ' + 80);
});
console.log("poprzednio server.listen(80);");

io.on('connection', (socket) => {
  const { id } = socket;

  const origin = socket.request.headers.referer || socket.request.headers.origin || '';

  socket.broadcast.emit('join');

  socket.on('params', (params) => {
    const {
      x,
      y,
      xVelocity,
      yVelocity,
      power,
      reverse,
      angle,
      angularVelocity,
      isThrottling,
      isReversing,
      isTurningLeft,
      isTurningRight,
	  health,
	  nickname,
	  carImg,
	  afk,
	  killedBy,
	  score,
	  message,
	  bullets,
	  hitId
    } = params;

    socket.broadcast.emit('params', {
      id,
      params: {
        x,
        y,
        xVelocity,
        yVelocity,
        power,
        reverse,
        angle,
        angularVelocity,
        isThrottling,
        isReversing,
        isTurningLeft,
        isTurningRight,
		health,
		nickname,
		carImg,
		afk,
		killedBy,
		score,
		message,
		bullets,
		hitId,
        ghost: !~origin.indexOf('localhost:80')
      }
    });
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('leave', id);
  });
});
