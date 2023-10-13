const { response } = require('express');
const http = require("http");
const app = require("express")();
const websocketServer = require("websocket").server;
const { v4: uuidv4 } = require("uuid");
const { client } = require('websocket');

const httpServer = http.createServer();
const serverPort = 9090;
const clientPort = 9091;

httpServer.listen(serverPort, () => console.log(`Listening on port ${serverPort}`));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.listen(clientPort, () => console.log(`Listening on port ${clientPort}`))

const clients = {};
const games = {};
const wsServer = new websocketServer({
	"httpServer": httpServer
});

wsServer.on("request", request => {
	const connection = request.accept(null, request.origin);

	connection.on("close", () => console.log("Closed!"));
	connection.on("message", message => {
		const result = JSON.parse(message.utf8Data);

		// Client wants to create a game
		if (result.method === "createGame") {
			const clientCreatingGameId = result.clientId;
			const newGameId = uuidv4();

			games[newGameId] = {
				"id": newGameId,
				"nBalls": 20,
				"players": []
			}

			const payload = {
				"method": "createGame",
				"game": games[newGameId]
			}
			const connection = clients[clientCreatingGameId].connection;

			connection.send(JSON.stringify(payload));
		}

		// Client wants to join a game
		if (result.method === "joinGame") {
			const clientJoiningGameId = result.clientId;
			const existingGameId = !result.gameId ? null : result.gameId;
			const game = !games[existingGameId] ? null : games[existingGameId];
			let payload = {};
			let playerExists = false;

			if (existingGameId === null || game === null) {
				payload = {
					"method": "error",
					"errorMessage": "That game doesn't exist!"
				}
				
				return clients[clientJoiningGameId].connection.send(JSON.stringify(payload));
			}

			game.players.forEach(player => {
				if (player.clientId === clientJoiningGameId) {
					playerExists = true;
					return;
				}
			})

			if (playerExists) {
				payload = {
					"method": "error",
					"errorMessage": "You're already in that game!"
				}

				return clients[clientJoiningGameId].connection.send(JSON.stringify(payload));
			}

			if (game.players.length >= 2) {
				payload = {
					"method": "error",
					"errorMessage": "Game reached max players!"
				}

				return clients[clientJoiningGameId].connection.send(JSON.stringify(payload));
			}

			game.players.push({
				"clientId": clientJoiningGameId
			})

			// Game starts when 2 players have joined
			if (game.players.length === 2) updateGameState();

			payload = {
				"method": "joinGame",
				"game": game
			}

			// Tell every player someone joined
			game.players.forEach(player => {
				clients[player.clientId].connection.send(JSON.stringify(payload));
			});
		}
	});

	const clientId = uuidv4();

	clients[clientId] = {
		"connection": connection
	}

	const payload = {
		"method": "connect",
		"clientId": clientId
	}

	connection.send(JSON.stringify(payload));
});