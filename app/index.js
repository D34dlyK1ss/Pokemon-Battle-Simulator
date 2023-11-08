import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import express from "express";
import { WebSocketServer } from "ws";
import mysql from "mysql2";
import badWords from "./badWords.js";
dotenv.config();

const app = express();
const clientPort = parseInt(process.env.CLIENT_PORT);
app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile("index.html"));
app.listen(clientPort);

const key = fs.readFileSync("key.pem");
const cert = fs.readFileSync("cert.pem");
const options = { key: key, cert: cert };
const server = https.createServer(options, app);
server.on("error", (err) => console.error(err));
server.listen(parseInt(process.env.SERVER_PORT));

const wss = new WebSocketServer({ server: server });
const db = mysql.createConnection({
	host: "localhost",
	user: "who_is_it_game",
	database: "who_is_it"
});
const activeConnections = new Map();	// key: connection ID, value: ws
const loggedUsers = new Set();
const usersInGame = new Map();			// key: user ID, value: game ID
const games = {};

wss.on("connection", ws => {
	const id = newId(32);

	ws.connectionData = { id: id };
	activeConnections.set(id, ws);

	let payload = {
		"method": "connect",
		"connectionData": ws.connectionData
	};

	ws.send(JSON.stringify(payload));

	ws.on("close", () => {
		const username = ws.connectionData.username;
		const connectionId = ws.connectionData.id;
		const gameId = usersInGame.get(connectionId);

		if (gameId) removePlayerFromGame(gameId, connectionId);

		activeConnections.delete(connectionId);

		if (loggedUsers.has(username)) {
			loggedUsers.delete(username);
			logoutToConsole(username);
		}
	});

	ws.on("message", (message) => {
		const result = JSON.parse(message);
		const method = result.method;		// method is a property send by the client

		// Client wants to login
		if (method === "login") {
			if (loggedUsers.has(result.username)) {
				payload = {
					"method": "error",
					"type": "login",
					"message": "Login failed. You're already logged in from another browser or device. Please log out from there first."
				};

				return ws.send(JSON.stringify(payload));
			}

			if (result.type === "auto") return doLogin(ws, result.username);

			loginQuery(ws, result.username, result.password);
			return;
		}

		// Client wants to logout
		if (method === "logout") {
			const username = result.username;

			payload = {
				"method": "loggedOut"
			};

			ws.send(JSON.stringify(payload));

			loggedUsers.delete(username);
			logoutToConsole(username);
			return;
		}

		// Client wants to register
		if (method === "register") {
			const username = result.username;
			const email = result.email;
			const password = result.password;

			db.query(
				`SELECT id FROM user WHERE (username = '${username}' OR email = '${email}')`,
				(err, res) => {
					if (err) return console.error(err);
					if (res.length > 0) {
						payload = {
							"method": "error",
							"type": "register",
							"message": "Register failed. Username or email are already in use."
						};

						return ws.send(JSON.stringify(payload));
					}

					db.query(
						`INSERT INTO user (username, email, password) VALUES ('${username}', '${email}', SHA2('${password}', 256))`,
						(err) => {
							if (err) return console.error(err);

							loginQuery(ws, username, password);
						}
					);
					return;
				}
			);
		}

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
			const username = result.username;

			if (!games[gameId]) {
				payload = {
					"method": "error",
					"type": "joinGame",
					"message": "That game doesn't exist!"
				};

				ws.send(JSON.stringify(payload));
				return;
			}

			if (games[gameId].players.length >= 2) {
				payload = {
					"method": "error",
					"type": "joinGame",
					"message": "Game reached max players!"
				};

				ws.send(JSON.stringify(payload));
				return;
			}

			games[gameId].players.push({
				"username": username,
				"connectionId": result.connectionId
			});

			usersInGame.set(username, games[gameId].id);

			games[gameId].players.forEach(player => {
				if (player.username === username) {
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

					activeConnections.get(player.connectionId).send(JSON.stringify(payload));

					payload = {
						"method": "updateChat",
						"type": "system",
						"text": `<b>${username}</b> joined`
					};

					activeConnections.get(player.connectionId).send(JSON.stringify(payload));
				}
			});
			return;
		}

		if (method === "startGame") {
			const gameId = result.gameId;
			const items = ["Ana", "Rita", "José", "Rodrigo", "André", "Catarina", "Joana", "Diogo", "Susana", "Daniela", "Sara", "Xavier", "Filipe", "Gonçalo", "Sofia", "Vítor"];

			games[gameId].items = items;
			games[gameId].status = "playing";
			games[gameId].answers = {};
			games[gameId].triesLeft = {};
			games[gameId].players.forEach(player => {
				const itemToGuess = items[Math.floor(Math.random() * items.length)];
				const tries = 2;

				games[gameId].answers[player.username] = itemToGuess;
				games[gameId].triesLeft[player.username] = tries;

				payload = {
					"method": "loadGame",
					"game": games[gameId],
					"category": items,
					"yourItem": itemToGuess,
					"tries": tries
				};

				activeConnections.get(player.connectionId).send(JSON.stringify(payload));
			});
		}

		if (method === "loadGame") {
			const gameId = result.gameId;
			const username = result.username;

			payload = {
				"method": "loadGame",
				"game": games[gameId],
				"category": games[gameId].items,
				"yourItem": games[gameId].answers[username],
				"tries": games[gameId].triesLeft[username]
			};

			activeConnections.get(username).send(JSON.stringify(payload));
		}

		if (method === "leaveGame") {
			removePlayerFromGame(result.gameId, result.username);
			return;
		}

		if (method === "sendChatMessage") {
			const gameId = result.gameId;

			payload = {
				"method": "updateChat",
				"type": "user",
				"username": result.username,
				"text": cleanMessage(result.text)
			};

			games[gameId].players.forEach(player => {
				activeConnections.get(player.connectionId).send(JSON.stringify(payload));
			});
			return;
		}

		if (method === "guess") {
			const gameId = result.gameId;
			const guesserUsername = result.username;
			let rightAnswer = null;

			Object.keys(games[gameId].answers).forEach(player => {
				if (player !== guesserUsername) rightAnswer = games[gameId].answers[player];
			});

			games[gameId].triesLeft[guesserUsername]--;

			payload = {
				"method": "updateTries",
				"nTries": games[gameId].triesLeft[guesserUsername]
			};

			ws.send(JSON.stringify(payload));

			if (result.guess.toLowerCase() === rightAnswer.toLowerCase()) {
				games[gameId].winner = guesserUsername;

				let payload = {
					"method": "gameWon",
					"winner": guesserUsername
				};

				ws.send(JSON.stringify(payload));

				payload = {
					"method": "gameLost"
				};

				games[gameId].players.forEach(player => {
					if (player.username !== guesserUsername) activeConnections.get(player.connectionId).send(JSON.stringify(payload));
				});
			}
			else if (games[gameId].triesLeft[guesserUsername] <= 0) {
				let payload = {
					"method": "gameLost",
					"winner": games[gameId].players.filter((playerId => playerId !== guesserUsername))
				};

				ws.send(JSON.stringify(payload));

				payload = {
					"method": "gameWon"
				};

				games[gameId].players.forEach(player => {
					if (player.username !== guesserUsername) activeConnections.get(player.connectionId).send(JSON.stringify(payload));
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

function loginQuery(_ws, _username, _password) {
	let payload = {};

	db.query(
		`SELECT username, email FROM user WHERE (username = '${_username}' OR email = '${_username}') AND password = SHA2('${_password}', 256)`,
		(err, res) => {
			if (err) return console.error(err);
			if (res.length === 0) {
				payload = {
					"method": "error",
					"type": "login",
					"message": "Login failed. Username/email or password incorrect."
				};

				return _ws.send(JSON.stringify(payload));
			}

			doLogin(_ws, res[0].username);
		}
	);
}

function doLogin(_ws, _username) {
	loggedUsers.add(_username);
	loginToConsole(_username);

	const payload = {
		"method": "loggedIn",
		"username": _username
	};

	_ws.connectionData.username = _username;
	activeConnections.set(_ws.connectionData.id, _ws);

	return _ws.send(JSON.stringify(payload));
}

function removePlayerFromGame(_gameId, _leavingPlayer) {
	const game = games[_gameId];
	let i = 0;

	for (const player of game.players) {
		if (player.username === _leavingPlayer) {
			game.players.splice(i, 1);
			usersInGame.delete(_leavingPlayer);
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

		activeConnections.get(player.connectionId).send(JSON.stringify(payload));

		payload = {
			"method": "updateChat",
			"type": "system",
			"text": `<b>${_leavingPlayer}</b> left`
		};

		activeConnections.get(player.connectionId).send(JSON.stringify(payload));
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

function dateTimeString() {
	const date = new Date();
	const HH = date.getHours().toString().padStart(2, "0");
	const mm = date.getMinutes().toString().padStart(2, "0");
	const ss = date.getSeconds().toString().padStart(2, "0");
	const sss = date.getMilliseconds().toString().padStart(3, "0");
	const DD = date.getDate().toString().padStart(2, "0");
	const MM = (date.getMonth() + 1).toString().padStart(2, "0");
	const YYYY = date.getFullYear();

	return `\u001b[30m[${DD}-${MM}-${YYYY} ${HH}:${mm}:${ss}.${sss}]\u001b[0m`;
}

function loginToConsole(_username) {
	return console.log(`${dateTimeString()} \u001b[32m${_username}\u001b[0m`);
}

function logoutToConsole(_username) {
	return console.log(`${dateTimeString()} \u001b[31m${_username}\u001b[0m`);
}