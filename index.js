const http = require("http");
const app = require("express")();
const websocketServer = require("websocket").server;
const { v4: uuidv4 } = require("uuid");

const httpServer = http.createServer();
const serverPort = 9090;
const clientPort = 9091;

httpServer.listen(serverPort, () => console.log(`Listening on port ${serverPort}`));
app.get("/", (_, res) => res.sendFile(__dirname + "/public/index.html"));
app.listen(clientPort, () => console.log(`Listening on port ${clientPort}`));

const connections = new Map();
const games = new Map();
const clientsInGame = new Map();

const wsServer = new websocketServer({
	"httpServer": httpServer
});

wsServer.on("request", request => {
	const connection = request.accept(null, request.origin);

	connection.on("close", () => {
		const clientId = connection.clientId;
		const gameId = clientsInGame.get(clientId);
		
		games.delete(gameId);
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
					"errorMessage": "You're already in a game!"
				}

				return connections.get(clientCreatingGameId).connection.send(JSON.stringify(payload));
			}

			const newGameId = uuidv4();

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
					"errorMessage": "You're already in a game!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			if (existingGameId === null || game === null) {
				const payload = {
					"method": "error",
					"errorMessage": "That game doesn't exist!"
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
					"errorMessage": "You're already in that game!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			if (game.players.length >= 2) {
				const payload = {
					"method": "error",
					"errorMessage": "Game reached max players!"
				}

				return connections.get(clientJoiningGameId).connection.send(JSON.stringify(payload));
			}

			game.players.push({
				"clientId": clientJoiningGameId
			})

			clientsInGame.set(clientJoiningGameId, game.id)

			const payload = {
				"method": "joinGame",
				"game": game
			}

			// Tell every player someone joined
			game.players.forEach(player => {
				connections.get(player.clientId).connection.send(JSON.stringify(payload));
			});
		}
	});

	const clientId = uuidv4();
	
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