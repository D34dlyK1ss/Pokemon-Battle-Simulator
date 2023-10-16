import express from "express";
import { WebSocketServer } from "ws";

const serverPort = process.env.SERVER_PORT || 9090;
const wss = new WebSocketServer({ port: serverPort });
wss.on("listening", () => {
	console.log(`Server port: ${serverPort}`);
});

const app = express();
const clientPort = process.env.CLIENT_PORT || 9091;
app.use(express.static("../app"));
app.get("/", (_, res) => res.sendFile("index.html"));
app.listen(clientPort, () => console.log(`App port: ${clientPort}`));

const activeConnections = new Map();
const clientsInGame = new Map();
const games = {};

wss.on("connection", ws => {
	const id = newId(32);
	const clientData = { "id": id };
	ws.clientData = clientData;
	activeConnections.set(id, { "connection": ws });

	const payload = {
		"method": "connect",
		"client": clientData
	};

	ws.send(JSON.stringify(payload));

	ws.on("close", () => {
		const clientInGame = clientsInGame.get(ws.clientData.id);
		if (clientInGame) removePlayerFromGame(clientInGame, ws.clientData.id);
		activeConnections.delete(ws.clientData.id);
	});

	ws.on("message", message => {
		const result = JSON.parse(message);
		const method = result.method;
		const client = activeConnections.get(result.client.id);

		// Client wants to create a game
		if (method === "createGame") {
			if (clientsInGame.has(result.client.id)) {
				const payload = {
					"method": "error",
					"message": "You're already in a game!"
				};

				client.connection.send(JSON.stringify(payload));
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

			client.connection.send(JSON.stringify(payload));
			return;
		}

		// Client wants to join a game
		if (method === "joinGame") {
			const gameId = result.gameId;

			if (clientsInGame.has(result.client.id)) {
				const payload = {
					"method": "error",
					"message": "You're already in a game!"
				};

				client.connection.send(JSON.stringify(payload));
				return;
			}

			if (!games[gameId]) {
				const payload = {
					"method": "error",
					"message": "That game doesn't exist!"
				};

				client.connection.send(JSON.stringify(payload));
				return;
			}

			if (games[gameId].players.length >= 2) {
				const payload = {
					"method": "error",
					"message": "Game reached max players!"
				};

				client.connection.send(JSON.stringify(payload));
				return;
			}

			games[gameId].players.push({
				"id": result.client.id
			});

			clientsInGame.set(result.client.id, games[gameId].id);

			const payload = {
				"method": "joinGame",
				"game": games[gameId]
			};

			// Tell every player someone joined
			games[gameId].players.forEach(player => {
				activeConnections.get(player.id).connection.send(JSON.stringify(payload));
			});
			return;
		}

		if (method === "leaveGame") {
			removePlayerFromGame(result.gameId, result.client.id);
			return;
		}
	});
});

function newId(_length) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	let i = 0;

	while (i < _length) {
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

		activeConnections.get(_leavingPlayerId).connection.send(JSON.stringify(payload));
		return;
	}

	let i = 0;

	for (const player of game.players) {
		if (player.id === _leavingPlayerId) {
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

		activeConnections.get(player.id).connection.send(JSON.stringify(payload));
	}
}