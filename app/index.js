import express from "express";
import { WebSocketServer } from "ws";
import badWords from "./badWords.js";
import mysql from "mysql2";

const serverPort = parseInt(process.env.SERVER_PORT || "9090");
const wss = new WebSocketServer({ port: serverPort });
const app = express();
const clientPort = parseInt(process.env.CLIENT_PORT || "9091");
app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile("index.html"));
app.listen(clientPort);

const db = mysql.createConnection({
	host: "localhost",
	user: "who_is_it_game",
	database: "who_is_it"
});

const activeConnections = new Map();	// key: connection ID, value: ws
const clientsInGame = new Map();		// key: connection ID, value: game ID
const games = {};

wss.on("connection", ws => {
	const id = newId(32);
	const connectionData = { "id": id };
	ws.connectionData = connectionData;
	activeConnections.set(id, ws);
	console.log(logConnection(id));

	let payload = {
		"method": "connect",
		"client": connectionData
	};

	ws.send(JSON.stringify(payload));

	ws.on("close", () => {
		const gameId = clientsInGame.get(ws.connectionData.id);
		if (gameId) removePlayerFromGame(gameId, ws.connectionData.id);
		activeConnections.delete(ws.connectionData.id);
	});

	ws.on("message", (message) => {
		const result = JSON.parse(message);
		const method = result.method;		// method is a property send by the client

		// Client wants to create a game
		if (method === "newGame") {
			let newGameId = 0;

			do newGameId = newId(8);
			while (newGameId in games);

			games[newGameId] = {
				"id": newGameId,
				"status": "waiting",
				"players": []
			};

			payload = {
				"method": "newGame",
				"gameId": newGameId
			};

			ws.send(JSON.stringify(payload));
			return;
		}

		// Client wants to join a game
		if (method === "joinGame") {
			const gameId = result.gameId;

			if (!games[gameId]) {
				payload = {
					"method": "error",
					"message": "That game doesn't exist!"
				};

				ws.send(JSON.stringify(payload));
				return;
			}

			if (games[gameId].players.length >= 2) {
				payload = {
					"method": "error",
					"message": "Game reached max players!"
				};

				ws.send(JSON.stringify(payload));
				return;
			}

			games[gameId].players.push({
				"id": result.client.id
			});

			clientsInGame.set(result.client.id, games[gameId].id);

			games[gameId].players.forEach(player => {
				if (player.id === result.client.id) {
					payload = {
						"method": "joinGame",
						"game": games[gameId]
					};
					ws.send(JSON.stringify(payload));
				}
				else {
					payload = {
						"method": "updatePlayers",
						"players": games[gameId].players
					};

					activeConnections.get(player.id).send(JSON.stringify(payload));

					payload = {
						"method": "updateChat",
						"type": "system",
						"text": `<b>${result.client.id}</b> joined`
					};

					activeConnections.get(player.id).send(JSON.stringify(payload));
				}
			});
			return;
		}

		if (method === "startGame") {
			const gameId = result.gameId;
			const items = ["Ana", "Rita", "José", "Rodrigo", "André", "Catarina", "Joana", "Diogo", "Susana", "Daniela", "Sara", "Xavier", "Filipe", "Gonçalo", "Sofia", "Vítor"];

			games[gameId].status = "playing";
			games[gameId].answers = {};
			games[gameId].triesLeft = {};
			games[gameId].players.forEach(player => {
				const itemToGuess = items[Math.floor(Math.random() * items.length)];
				const tries = 2;

				games[gameId].answers[player.id] = itemToGuess;
				games[gameId].triesLeft[player.id] = tries;

				payload = {
					"method": "startGame",
					"game": games[gameId],
					"category": items,
					"yourItem": itemToGuess,
					"tries": tries
				};

				activeConnections.get(player.id).send(JSON.stringify(payload));
			});
		}

		if (method === "leaveGame") {
			removePlayerFromGame(result.gameId, result.client.id);
			return;
		}

		if (method === "sendChatMessage") {
			const gameId = result.gameId;

			payload = {
				"method": "updateChat",
				"type": "user",
				"username": result.clientId,
				"text": cleanMessage(result.text)
			};

			games[gameId].players.forEach(player => {
				activeConnections.get(player.id).send(JSON.stringify(payload));
			});
			return;
		}

		if (method === "guess") {
			const gameId = result.gameId;
			const guesserId = result.clientId;
			let rightAnswer = null;

			Object.keys(games[gameId].answers).forEach(player => {
				if (player !== guesserId) rightAnswer = games[gameId].answers[player];
			});

			games[gameId].triesLeft[guesserId]--;

			payload = {
				"method": "updateTries",
				"nTries": games[gameId].triesLeft[guesserId]
			};

			ws.send(JSON.stringify(payload));

			if (result.guess.toLowerCase() === rightAnswer.toLowerCase()) {
				games[gameId].winner = guesserId;

				let payload = {
					"method": "gameWon",
					"winner": guesserId
				};

				ws.send(JSON.stringify(payload));

				payload = {
					"method": "gameLost"
				};

				games[gameId].players.forEach(player => {
					if (player.id !== guesserId) activeConnections.get(player.id).send(JSON.stringify(payload));
				});
			}
			else if (games[gameId].triesLeft[guesserId] <= 0) {
				let payload = {
					"method": "gameLost",
					"winner": games[gameId].players.filter((playerId => playerId !== guesserId))
				};

				ws.send(JSON.stringify(payload));

				payload = {
					"method": "gameWon"
				};

				games[gameId].players.forEach(player => {
					if (player.id !== guesserId) activeConnections.get(player.id).send(JSON.stringify(payload));
				});
			}

			ws.send(JSON.stringify(payload));
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
	const game = games[_gameId];
	let i = 0;

	for (const player of game.players) {
		if (player.id === _leavingPlayerId) {
			game.players.splice(i, 1);
			clientsInGame.delete(_leavingPlayerId);
			break;
		}

		i++;
	}

	if (game.players.length === 0) {
		delete games[_gameId];
		return;
	}

	let payload = {};

	for (const player of game.players) {
		payload = {
			"method": "updatePlayers",
			"players": game.players
		};

		activeConnections.get(player.id).send(JSON.stringify(payload));

		payload = {
			"method": "updateChat",
			"type": "system",
			"text": `<b>${_leavingPlayerId}</b> left`
		};

		activeConnections.get(player.id).send(JSON.stringify(payload));
	}
}

function cleanMessage(_message) {
	let sanitizedMessage = _message;

	for (const word of badWords) {
		sanitizedMessage = sanitizedMessage.replace(/0|º/g, "o");
		sanitizedMessage = sanitizedMessage.replace(/1|!/g, "i");
		sanitizedMessage = sanitizedMessage.replace(/3|£|€|&/g, "e");
		sanitizedMessage = sanitizedMessage.replace(/4|@|ª/g, "a");
		sanitizedMessage = sanitizedMessage.replace(/5|\$|§/g, "s");
		sanitizedMessage = sanitizedMessage.replace(/6|9/g, "g");
		sanitizedMessage = sanitizedMessage.replace(/7|\+/g, "t");
		sanitizedMessage = sanitizedMessage.replace(/8/g, "ate");

		for (let i = 0; i <= sanitizedMessage.length - word.length; i++) {
			const batch = sanitizedMessage.substr(i, word.length);

			if (batch === word) _message = _message.slice(0, i) + "*".repeat(word.length) + _message.slice(i + word.length);
		}
	}

	return _message;
}

function logConnection(id) {
	const date = new Date();
	const HH = date.getHours().toString().padStart(2, "0");
	const mm = date.getMinutes().toString().padStart(2, "0");
	const ss = date.getSeconds().toString().padStart(2, "0");
	const sss = date.getMilliseconds().toString().padStart(3, "0");
	const DD = date.getDate().toString().padStart(2, "0");
	const MM = (date.getMonth() + 1).toString().padStart(2, "0");
	const YYYY = date.getFullYear();

	return `\u001b[30m[${DD}-${MM}-${YYYY} ${HH}:${mm}:${ss}.${sss}]\u001b[0m \u001b[36m${id}\u001b[0m`;
}