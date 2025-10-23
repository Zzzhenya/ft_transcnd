fastify.get('/ws/tournament/:id', { websocket: true }, (connection, req) => {
  const t = tournaments.get(Number(req.params.id));
  if (!t) {
    connection.socket.close();
    return;
  }
  t.clients.add(connection.socket);

  // Send initial state
  connection.socket.send(JSON.stringify({
    type: "tournament.update",
    data: {
      id: t.id,
      name: t.name,
      players: Array.from(t.playerSet),
      bracket: t.bracket,
      status: t.status,
    }
  }));

  connection.socket.on('close', () => {
    t.clients.delete(connection.socket);
  });
});
