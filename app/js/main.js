const ws = new WebSocket("ws://localhost:9090");

window.addEventListener('load', () => {
	spawnTitle();
	spawnMainMenu();
});

let thisClient = null;
let gameId = null;

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
	if (method === "newGame") {
		joinGame(response.gameId);
		return;
	}

	// This client joined a game
	if (method === "joinGame") {
		gameId = response.game.id;
		clearScreen();
		spawnRoomCode(gameId);
		spawnStartButton(response.game.players[0].id);
		spawnLeaveButton();
		spawnPlayers(response.game.players);
		spawnChat();
		return;
	}

	// Game started
	if (method === "startGame") {
		gameId = response.game.id;
		spawnGame(response.category, response.yourItem, response.tries);
		return;
	}

	// Game was updated
	/*if (method === "updateGame") {
		updateGame(response.game);
		return;
	}*/

	// Player joined or left
	if (method === "updatePlayers") {
		updatePlayers(response.players);
		return;
	}

	// Chat was updated
	if (method === "updateChat") {
		updateChat(response.type, response.username, response.text);
		return;
	}

	// Number of tries left changed
	if (method === "updateTries") {
		updateTries(response.nTries);
		return;
	}

	// Won the game
	if (method === "gameWon") {
		alert("You won!");
		leaveGame();
		return;
	}

	// Lost the game
	if (method === "gameLost") {
		alert("You lost!");
		leaveGame();
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

function spawnTitle() {	
	const title = document.createElement("h1");
	title.innerHTML = "Who is it?™";
	document.body.appendChild(title);
}

function spawnMainMenu() {
	const divMainMenu = document.createElement("div");
	divMainMenu.id = "divMainMenu";

	const btnNewGame = document.createElement("button");
	btnNewGame.id = "btnNewGame";
	btnNewGame.textContent = "New Game";

	btnNewGame.addEventListener("click", () => {
		const payload = {
			"method": "newGame",
			"client": thisClient,
		};
	
		ws.send(JSON.stringify(payload));
	});

	divMainMenu.appendChild(btnNewGame);

	const divJoinGame = document.createElement("div");
	divJoinGame.id = "divJoinGame";

	const btnJoinGame = document.createElement("button");
	btnJoinGame.id = "btnJoinGame";
	btnJoinGame.textContent = "Join Game";

	btnJoinGame.addEventListener("click", () => {
		const inputJoinGame = document.getElementById("inputJoinGame")
		if (!inputJoinGame.value)
			return alert("Please type a room code into the text box.");
	
		joinGame(inputJoinGame.value);
		inputJoinGame.value = "";
	});

	divJoinGame.appendChild(btnJoinGame);

	const inputJoinGame = document.createElement("input");
	inputJoinGame.id = "inputJoinGame";
	inputJoinGame.type = "text";
	divJoinGame.appendChild(inputJoinGame);
	
	divMainMenu.appendChild(divJoinGame);
	document.body.appendChild(divMainMenu);
}

function spawnStartButton(_ownerId) {
	const btnStart = document.createElement("button")
	btnStart.id = "btnStart";
	btnStart.textContent = "Start";

	btnStart.addEventListener("click", () => {
		const payload = {
			"method": "startGame",
			"gameId": gameId
		}

		ws.send(JSON.stringify(payload));
		document.getElementById("btnStart").remove();
	});

	if (_ownerId !== thisClient.id) btnStart.hidden = true;
	else  btnStart.disabled = true;

	document.body.appendChild(btnStart);
}

function spawnLeaveButton() {
	const btnLeave = document.createElement("button")
	btnLeave.id = "btnLeave";
	btnLeave.textContent = "Leave";

	btnLeave.addEventListener("click", () => {
		leaveGame();
	});

	document.body.appendChild(btnLeave);
}

function leaveGame() {
	const payload = {
		"method": "leaveGame",
		"client": thisClient,
		"gameId": gameId
	};

	gameId = null;
	ws.send(JSON.stringify(payload));
	clearScreen();
	spawnMainMenu();
}

function spawnRoomCode() {
	const divRoomCode = document.createElement("div")
	divRoomCode.id = "divRoomCode";
	divRoomCode.innerHTML = `<p id="pRoomCode"><b>Room code: </b>${gameId}</p>`;
	document.body.appendChild(divRoomCode);
}

function spawnPlayers(_players) {
	const divPlayers = document.createElement("div")
	divPlayers.id = "divPlayers";
	document.body.appendChild(divPlayers);
	
	updatePlayers(_players);
}

function spawnGame(_items, _yourItem, _tries) {
	const divGame = document.createElement("div");
	divGame.id = "divGame";

	// The board
	const tableBoard = document.createElement("table");
	tableBoard.id = "tableBoard";

	while (_items.length > 0) {
		const tr = document.createElement("tr");

		let itemsInRow = _items.splice(0, 4);
		for (const item of itemsInRow) {
			const td = document.createElement("td");
			const btnCell = document.createElement("button");

			btnCell.style.color = "limegreen";
			btnCell.textContent = item;

			btnCell.addEventListener("click", () => {
				if (btnCell.style.color === "limegreen") btnCell.style.color = "red";
				else btnCell.style.color = "limegreen";
			})

			td.appendChild(btnCell);
			tr.appendChild(td);
		}

		tableBoard.appendChild(tr);
	}

	divGame.appendChild(tableBoard);

	// Player's item to be guessed
	const yourItem = document.createElement("p");
	yourItem.id = "pYourItem";
	yourItem.innerText = _yourItem;
	divGame.appendChild(yourItem);

	// Input for guessing
	const inputGuess = document.createElement("input");
	inputGuess.id = "inputGuess";
	inputGuess.placeholder = "Type your answer here!";

	inputGuess.addEventListener("keydown", event => {
		if (inputGuess.value && event.key === "Enter") {
			const payload = {
				"method": "guess",
				"gameId": gameId,
				"clientId": thisClient.id,
				"guess": inputGuess.value,
			}

			ws.send(JSON.stringify(payload));
			document.getElementById("inputGuess").value = "";
		}
	});

	divGame.appendChild(inputGuess);

	// Player's item to be guessed
	const pTries = document.createElement("p");
	pTries.id = "pTries";
	pTries.innerText = `Tries left: ${_tries}`;
	divGame.appendChild(pTries);

	document.body.appendChild(divGame);
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
	inputMessage.placeholder = "Chat here";

	inputMessage.addEventListener("keydown", event => {
		if (inputMessage.value && event.key === "Enter") {
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

function updateChat(_type, _name, _message) {
	const divChatHistory = document.getElementById("divChatHistory");
	const message = document.createElement("div");

	if (_type === "system") {
		message.className = "message system";
		message.innerHTML = _message;
		divChatHistory.appendChild(message);
		divChatHistory.scrollTop = divChatHistory.scrollHeight;
		return;
	}

	if (_type === "user") {
		message.className = "message user";
		message.innerHTML = `<b>${_name === thisClient.id ? 'You' : _name}: </b>${_message}`;
		divChatHistory.appendChild(message);
		divChatHistory.scrollTop = divChatHistory.scrollHeight;
		return;
	}
}

/*function updateGame(_game) {
	if (_game.status == "waiting") {
	}
	if (_game.status == "playing") {
	}
}*/

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

	if (_arrayPlayers[0].id === thisClient.id) document.getElementById("btnStart").hidden = false;
	
	if (_arrayPlayers.length <= 1) document.getElementById("btnStart").disabled = true;
	else  document.getElementById("btnStart").disabled = false;
}

function updateTries(_nTries) {
	document.getElementById("pTries").innerHTML = `Tries left: ${_nTries}`
}

function clearScreen() {
	document.body.innerHTML = "";
	
	const title = document.createElement("h1");
	title.innerHTML = "Who is it?™";
	document.body.appendChild(title);
}
