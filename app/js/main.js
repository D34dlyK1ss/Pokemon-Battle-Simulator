const ws = new WebSocket("ws://localhost:9090");
let thisClient = null;
let gameId = null;

// HTML Elements
const btnCreateGame = document.getElementById("btnCreateGame");
const btnJoinGame = document.getElementById("btnJoinGame");
const inputJoinGame = document.getElementById("inputJoinGame");
const btnLeaveGame = document.getElementById("btnLeaveGame");
const divBoard = document.getElementById("divBoard");

// Event listeners
btnCreateGame.addEventListener("click", () => {
	const payload = {
		"method": "createGame",
		"client": thisClient,
	};

	ws.send(JSON.stringify(payload));
});

btnJoinGame.addEventListener("click", () => {
	if (!inputJoinGame.value)
		return alert("Please type a room code into the text box.");

	joinGame(inputJoinGame.value);
	inputJoinGame.value = "";
});

btnLeaveGame.addEventListener("click", () => {
	const payload = {
		"method": "leaveGame",
		"client": thisClient,
		"gameId": gameId
	};

	ws.send(JSON.stringify(payload));
	clearScreen();
	gameId = null;
});

// When server responds
ws.onmessage = (message) => {
	const response = JSON.parse(message.data);
	const method = response.method;

	if (method === "error") {
		alert(response.message);
		return;
	}

	// Connection was made
	if (method === "connect") {
		thisClient = response.client;
		return;
	}

	// Game was created
	if (method === "createGame") {
		joinGame(response.gameId);
		return;
	}

	// Game was updated
	if (method === "joinGame") {
		gameId = response.game.id;
		spawnRoomCode(gameId);
		spawnPlayers();
		updatePlayers(response.game.players);
		spawnChat();
		return;
	}

	// Game was updated
	if (method === "updateGame") {
		updateGame(response.game);
		return;
	}

	// Chat was updated
	if (method === "updateChat") {
		updateChat(response.username, response.text);
		return;
	}
};

function joinGame(_gameId) {
	const payload = {
		"method": "joinGame",
		"client": thisClient,
		"gameId": _gameId,
	};

	ws.send(JSON.stringify(payload));
}

function spawnRoomCode(_gameId) {
	const divRoomCode = document.createElement("div")
	divRoomCode.id = "divRoomCode";
	divRoomCode.innerHTML = `<p id="pRoomCode"><b>Room code:</b> ${_gameId}</p>`;
	document.body.appendChild(divRoomCode);
}

function spawnPlayers() {
	const divPlayers = document.createElement("div")
	divPlayers.id = "divPlayers";
	document.body.appendChild(divPlayers);
}

function spawnBoard() {
	const divBoard = document.createElement("div")
	divBoard.id = "divPlayers";
	document.body.appendChild(divBoard);
}

function spawnChat() {
	const divChat = document.createElement("div")
	divChat.id = "divChat";
	document.body.appendChild(divChat);

	const chatTitle = document.createElement("h4")
	chatTitle.innerHTML = "CHAT";
	divChat.appendChild(chatTitle);
	
	const divChatHistory = document.createElement("div")
	divChatHistory.id = "divChatHistory";

	divChat.appendChild(divChatHistory);

	const inputMessage = document.createElement("input");
	inputMessage.id = "inputMessage";
	inputMessage.placeholder = "Chat here...";

	inputMessage.addEventListener("keydown", event => {
		if (event.key === "Enter") {
			const payload = {
				"method": "sendChatMessage",
				"gameId": gameId,
				"clientId": thisClient.id,
				"text": inputMessage.value,
			}

			ws.send(JSON.stringify(payload));
			document.getElementById("inputMessage").value = "";
		}
	});

	divChat.appendChild(inputMessage);
}

function updateChat(_name, _message) {
	const divChatHistory = document.getElementById("divChatHistory");
	const message = document.createElement("div")
	message.className = "message";
	_name = _name === thisClient.id ? 'You' : _name;

	message.innerHTML = `<b>${_name}:</b> ${_message}`;
	divChatHistory.appendChild(message);
}

function updateGame(_game) {
	updatePlayers(_game.players);
}

function updatePlayers(_arrayPlayers) {
	const divPlayers = document.getElementById("divPlayers");
	divPlayers.innerHTML = "";

	let i = 0;

	_arrayPlayers.forEach(player => {
		const div = document.createElement("div");
		const text = player.id === thisClient.id ? `<b>You</b>` : player.id;

		div.innerHTML = `<b>Player ${++i}: </b>${text}`;
		divPlayers.appendChild(div);
	});
}

function clearScreen() {
	const divRoomCode = document.getElementById("divRoomCode");
	if (divRoomCode) divRoomCode.remove();

	const divPlayers = document.getElementById("divPlayers");
	if (divPlayers) divPlayers.remove();

	const divChat = document.getElementById("divChat");
	if (divChat) divChat.remove();
}
