const http = require("http");
const express = require("express");
const app = express();
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
const serverPort = 9090;
const clientPort = 9091;

httpServer.listen(serverPort, () => console.log(`Server port: ${serverPort}`));
app.use(express.static("public"));
app.get("/", (_, res) => res.sendFile("index.html"));
app.listen(clientPort, () => console.log(`App port: ${clientPort}`));

const connections = new Map();
const games = new Map();
const clientsInGame = new Map();

const wsServer = new websocketServer({
	"httpServer": httpServer
});

wsServer.on("request", request => {
	if (request.origin === null || request.origin === "*") return;

	const connection = request.accept(null, request.origin);

	connection.on("close", () => {
		const clientId = connection.clientId;
		const gameId = clientsInGame.get(clientId);

		if (games[gameId]?.players.length === 0) games.delete(gameId);
		clientsInGame.delete(clientId);
		connections.delete(clientId);
	});

	connection.on("message", message => {
		const result = JSON.parse(message.utf8Data);

		// Client wants to create a game
		if (result.method === "createGame") {
			const clientCreatingGameId = result.clientId;

			if (clientsInGame.has(clientCreatingGameId)) {
				const payload = {
					"method": "error",
					"message": "You're already in a game!"
				}

				return connections.get(clientCreatingGameId).connection.send(JSON.stringify(payload));
			}

			const newGameId = newId(8);

			games.set(newGameId, {
				"id": newGameId,
				"players": []
			})

			const payload = {
				"method": "createGame",
				"game": games.get(newGameId)
			}

			connections.get(clientCreatingGameId).connection.send(JSON.stringify(payload));
		}

		// Client wants to join a game
		if (result.method === "joinGame") {
			const clientJoiningGameId = result.clientId;
			const existingGameId = !result.gameId ? null : result.gameId;
			const game = !games.get(existingGameId) ? null : games.get(existingGameId);
			let playerExists = false;

			if (clientsInGame.has(clientJoiningGameId)) {
				const payload = {
					"method": "error",
					"message": "You're already in a game!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			if (existingGameId === null || game === null) {
				const payload = {
					"method": "error",
					"message": "That game doesn't exist!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			game.players.forEach(player => {
				if (player.clientId === clientJoiningGameId) {
					playerExists = true;
					return;
				}
			})

			if (playerExists) {
				const payload = {
					"method": "error",
					"message": "You're already in that game!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			if (game.players.length >= 2) {
				const payload = {
					"method": "error",
					"message": "Game reached max players!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			game.players.push({
				"clientId": clientJoiningGameId
			});
			clientsInGame.set(clientJoiningGameId, game.id);

			const payload = {
				"method": "joinGame",
				"game": game
			}

			// Tell every player someone joined
			game.players.forEach(player => {
				connections.get(player.clientId).connection.send(JSON.stringify(payload));
			});
		}

		if (result.method === "leaveGame") {
			const clientLeavingGameId = result.clientId;
			const gameId = result.gameId;
			const game = !games.get(gameId) ? null : games.get(gameId);

			if (!clientsInGame.has(clientLeavingGameId)) {
				const payload = {
					"method": "error",
					"message": "You're not in any game!"
				}

				return connections.get(clientLeavingGameId).connection.send(JSON.stringify(payload));
			}

			for (let i = 0; i < game.players.length; i++) {
				if (game.players[i].clientId === clientLeavingGameId) {
					game.players.splice(i, 1);
					clientsInGame.delete(clientLeavingGameId);
					break;
				}
			}

			if (games[gameId]?.players.length === 0) return games.delete(gameId);
			
			const payload = {
				"method": "leaveGame",
				"game": game
			}

			// Tell every player someone left
			game.players.forEach(player => {
				connections.get(player.clientId).connection.send(JSON.stringify(payload));
			});

		}
	});

	const clientId = newId(32);

	connection.clientId = clientId;
	connections.set(clientId, {
		"connection": connection
	});

	const payload = {
		"method": "connect",
		"clientId": clientId
	}

	connection.send(JSON.stringify(payload));
});

function newId(length) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let result = '';
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}