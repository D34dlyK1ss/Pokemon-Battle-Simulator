import http from "http";
import express from "express";
import websocket from "websocket";
const app = express();
const WebsocketServer = websocket.server;
const httpServer = http.createServer();
const serverPort = 9090;
const clientPort = 9091;

httpServer.listen(serverPort, () => console.log(`Server port: ${serverPort}`));
app.use(express.static("public"));
app.get("/", (_, res) => res.sendFile("index.html"));
app.listen(clientPort, () => console.log(`App port: ${clientPort}`));

const connections = new Map();
const games = {};
const clientsInGame = new Map();

const wsServer = new WebsocketServer({
	"httpServer": httpServer
});

wsServer.on("request", request => {
	if (!request.origin || request.origin === "*") return;

	const connection = request.accept(null, request.origin);

	connection.on("close", () => {
		const clientInGame = clientsInGame.get(connection.clientId);
		if (clientInGame) removePlayerFromGame(clientInGame, connection.clientId);
		connections.delete(connection.clientId);
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
				};

				connections.get(clientCreatingGameId).connection.send(JSON.stringify(payload));
				return;
			}

			const newGameId = newId(8);

			games[newGameId] = {
				"id": newGameId,
				"players": []
			};

			const payload = {
				"method": "createGame",
				"gameId": newGameId
			};

			connections.get(clientCreatingGameId).connection.send(JSON.stringify(payload));
			return;
		}

		// Client wants to join a game
		if (result.method === "joinGame") {
			const gameId = result.gameId;
			const clientJoiningGameId = result.clientId;

			if (clientsInGame.has(clientJoiningGameId)) {
				const payload = {
					"method": "error",
					"message": "You're already in a game!"
				};

				connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
				return;
			}

			if (!games[gameId]) {
				const payload = {
					"method": "error",
					"message": "That game doesn't exist!"
				};

				connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
				return;
			}

			if (games[gameId].players.length >= 2) {
				const payload = {
					"method": "error",
					"message": "Game reached max players!"
				};

				connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
				return;
			}

			games[gameId].players.push({
				"clientId": clientJoiningGameId
			});

			clientsInGame.set(clientJoiningGameId, games[gameId].id);

			const payload = {
				"method": "joinGame",
				"game": games[gameId]
			};

			// Tell every player someone joined
			games[gameId].players.forEach(player => {
				connections.get(player.clientId).connection.send(JSON.stringify(payload));
			});
			return;
		}

		if (result.method === "leaveGame") {
			removePlayerFromGame(result.gameId, result.clientId);
			return;
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
	};

	connection.send(JSON.stringify(payload));
});

function newId(length) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	let i = 0;

	while (i < length) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
		i++;
	}

	return result;
}

function removePlayerFromGame(_gameId, _leavingPlayerId) {
	let game = games[_gameId];

	if (!game) {
		const payload = {
			"method": "error",
			"message": "You're not in any game!"
		};

		connections.get(_leavingPlayerId).connection.send(JSON.stringify(payload));
		return;
	}

	let i = 0;

	for (const player of game.players) {
		if (player.clientId === _leavingPlayerId) {
			games[_gameId].players.splice(i, 1);
			game = games[_gameId];
			clientsInGame.delete(_leavingPlayerId);
			break;
		}
		i++;
	}

	if (games[_gameId].players.length === 0) {
		delete games[_gameId];
		return;
	}

	for (const player of games[_gameId].players) {
		// Tell this player someone left
		const payload = {
			"method": "playerLeft",
			"game": games[_gameId]
		};

		connections.get(player.clientId).connection.send(JSON.stringify(payload));
	}
}