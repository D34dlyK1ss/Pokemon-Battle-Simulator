function main() {
	const ws = new WebSocket("wss://localhost:8443");
	let thisConnection = null;
	let gameId = null;

	ws.onerror = (err) => console.error(err);
	ws.onclose = () => setTimeout(main(), 5000);
	ws.onmessage = (message) => {
		const response = JSON.parse(message.data);
		const method = response.method;

		if (method === "error") {
			alert(response.message);
			return;
		}

		// Connection was made
		if (method === "connect") {
			thisConnection = response.connectionData;

			spawnTitle();
			showLoginLayout();

			const id = localStorage.getItem("id");
			const username = localStorage.getItem("username");

			if (username) {
				const payload = {
					"method": "login",
					"type": "auto",
					"id": id,
					"username": username
				};

				ws.send(JSON.stringify(payload));
			}

			return;
		}

		// User logged in
		if (method === "loggedIn") {
			const userId = response.userId;
			const username = response.username;

			thisConnection.userId = userId;
			thisConnection.username = username;
			localStorage.setItem("id", userId);
			localStorage.setItem("username", username);
			showMainMenuLayout();
			return;
		}

		// User logged out
		if (method === "loggedOut") {
			delete thisConnection.userId;
			delete thisConnection.username;
			localStorage.removeItem("id");
			localStorage.removeItem("username");
			showLoginLayout();
			return;
		}

		if (method === "getCategoryList") {
			showCategorySelectionLayout(response.categoryList);
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
			showLobbyLayout(gameId, response.game.players[0].username, response.game.players);
			return;
		}

		// Game was updated
		if (method === "updateGame") {
			let items = response.game.items;
			let yourItem = response.game.answers[thisConnection.username];
			let tries = response.game.triesLeft[thisConnection.username];

			gameId = response.game.id;

			showGameLayout(items, yourItem, tries);
			return;
		}

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
			"username": thisConnection.username,
			"connectionId": thisConnection.id,
			"gameId": _gameId
		};

		ws.send(JSON.stringify(payload));
	}

	function spawnTitle() {
		const title = document.createElement("h1");
		title.innerHTML = "Who is it?™ Online";
		document.body.appendChild(title);
	}

	function showLoginLayout() {
		clearScreen();

		const divLogin = document.createElement("div");
		divLogin.id = "divLogin";

		const lblUsername = document.createElement("label");
		lblUsername.innerText = "Username / Email";
		lblUsername.htmlFor = "inputUsername";
		divLogin.appendChild(lblUsername);

		divLogin.appendChild(document.createElement("br"));

		const inputUsername = document.createElement("input");
		inputUsername.id = "inputUsername";
		inputUsername.type = "text";
		inputUsername.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnLogin").click();
		});
		divLogin.appendChild(inputUsername);

		divLogin.appendChild(document.createElement("br"));
		divLogin.appendChild(document.createElement("br"));

		const lblPassword = document.createElement("label");
		lblPassword.innerText = "Password";
		lblPassword.htmlFor = "inputPassword";
		divLogin.appendChild(lblPassword);

		divLogin.appendChild(document.createElement("br"));

		const inputPassword = document.createElement("input");
		inputPassword.id = "inputPassword";
		inputPassword.type = "password";
		inputPassword.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnLogin").click();
		});
		divLogin.appendChild(inputPassword);

		divLogin.appendChild(document.createElement("br"));
		divLogin.appendChild(document.createElement("br"));

		const btnLogin = document.createElement("button");
		btnLogin.id = "btnLogin";
		btnLogin.type = "submit";
		btnLogin.textContent = "Login";
		btnLogin.addEventListener("click", () => {
			const inputUsername = document.getElementById("inputUsername");
			const inputPassword = document.getElementById("inputPassword");

			if (!inputUsername.value) return inputUsername.style.backgroundColor = "red";
			else inputUsername.style.backgroundColor = "white";
			if (!inputPassword.value) return inputPassword.style.backgroundColor = "red";
			else inputPassword.style.backgroundColor = "white";

			const payload = {
				"method": "login",
				"username": inputUsername.value,
				"password": inputPassword.value
			};

			ws.send(JSON.stringify(payload));
		});
		divLogin.appendChild(btnLogin);

		divLogin.appendChild(document.createElement("br"));

		const aRecover = document.createElement("a");
		aRecover.href = "#";
		aRecover.innerText = "Forgot password?";
		aRecover.addEventListener("click", () => {
			//showRecoverLayout();
		});
		divLogin.appendChild(aRecover);

		divLogin.appendChild(document.createElement("br"));

		const aRegister = document.createElement("a");
		aRegister.href = "#";
		aRegister.innerText = "I want to register.";
		aRegister.addEventListener("click", () => {
			showRegisterLayout();
		});
		divLogin.appendChild(aRegister);

		document.body.appendChild(divLogin);
	}

	function showRegisterLayout() {
		clearScreen();

		const divRegister = document.createElement("divv");
		divRegister.id = "divRegister";

		const lblUsername = document.createElement("label");
		lblUsername.innerText = "Username";
		lblUsername.htmlfor = "inputUsername";
		divRegister.appendChild(lblUsername);

		divRegister.appendChild(document.createElement("br"));

		const inputUsername = document.createElement("input");
		inputUsername.id = "inputUsername";
		inputUsername.type = "text";
		divRegister.appendChild(inputUsername);

		divRegister.appendChild(document.createElement("br"));
		divRegister.appendChild(document.createElement("br"));

		const lblEmail = document.createElement("label");
		lblEmail.innerText = "Email";
		lblEmail.htmlfor = "inputEmail";
		divRegister.appendChild(lblEmail);

		divRegister.appendChild(document.createElement("br"));

		const inputEmail = document.createElement("input");
		inputEmail.id = "inputEmail";
		inputEmail.type = "email";
		divRegister.appendChild(inputEmail);

		divRegister.appendChild(document.createElement("br"));
		divRegister.appendChild(document.createElement("br"));

		const lblPassword = document.createElement("label");
		lblPassword.innerText = "Password";
		lblPassword.htmlFor = "inputPassword";
		divRegister.appendChild(lblPassword);

		divRegister.appendChild(document.createElement("br"));

		const inputPassword = document.createElement("input");
		inputPassword.id = "inputPassword";
		inputPassword.type = "password";
		divRegister.appendChild(inputPassword);

		divRegister.appendChild(document.createElement("br"));
		divRegister.appendChild(document.createElement("br"));

		const btnRegister = document.createElement("button");
		btnRegister.id = "btnRegister";
		btnRegister.type = "submitv";
		btnRegister.textContent = "Register";
		btnRegister.addEventListener("click", () => {
			const inputUsername = document.getElementById("inputUsername");
			const inputEmail = document.getElementById("inputEmail");
			const inputPassword = document.getElementById("inputPassword");

			if (!inputUsername.value) return inputUsername.style.backgroundColor = "red";
			else inputUsername.style.backgroundColor = "white";
			if (!inputEmail.value) return inputEmail.style.backgroundColor = "red";
			else inputEmail.style.backgroundColor = "white";
			if (!inputPassword.value) return inputPassword.style.backgroundColor = "red";
			else inputPassword.style.backgroundColor = "white";

			const payload = {
				"method": "register",
				"username": inputUsername.value,
				"email": inputEmail.value,
				"password": inputPassword.value
			};

			ws.send(JSON.stringify(payload));
		});
		divRegister.appendChild(btnRegister);

		divRegister.appendChild(document.createElement("br"));

		const aLogin = document.createElement("a");
		aLogin.href = "#";
		aLogin.innerText = "I want to log in.";
		aLogin.addEventListener("click", () => {
			showLoginLayout();
		});
		divRegister.appendChild(aLogin);

		document.body.appendChild(divRegister);
	}

	function showMainMenuLayout() {
		clearScreen();

		const divMainMenu = document.createElement("div");
		divMainMenu.id = "divMainMenu";

		const divProfile = document.createElement("div");
		divProfile.id = "divProfile";
		const pUsername = document.createElement("p");
		pUsername.id = "pUsername";
		pUsername.innerHTML = `<h3>${thisConnection.username}</h3>`;
		divProfile.appendChild(pUsername);
		divMainMenu.appendChild(divProfile);

		const btnNewGame = document.createElement("button");
		btnNewGame.id = "btnNewGame";
		btnNewGame.textContent = "New Game";
		btnNewGame.addEventListener("click", () => {
			const payload = {
				"method": "getCategoryList"
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
			const inputJoinGame = document.getElementById("inputJoinGame");
			if (!inputJoinGame.value)
				return alert("Please type a room code into the text box.");

			joinGame(inputJoinGame.value);
			inputJoinGame.value = "";
		});
		divJoinGame.appendChild(btnJoinGame);
		const inputJoinGame = document.createElement("input");
		inputJoinGame.id = "inputJoinGame";
		inputJoinGame.type = "text";
		inputJoinGame.addEventListener("keydown", event => {
			if (event.key === "Enter") btnJoinGame.click();
		});
		divJoinGame.appendChild(inputJoinGame);
		divMainMenu.appendChild(divJoinGame);

		const btnCategoryEditor = document.createElement("button");
		btnCategoryEditor.id = "btnCategoryEditor";
		btnCategoryEditor.textContent = "Category Editor";

		btnCategoryEditor.addEventListener("click", () => {
			showCategoryCreationLayout();
		});
		divMainMenu.appendChild(btnCategoryEditor);

		divMainMenu.appendChild(document.createElement("br"));

		const btnLogout = document.createElement("button");
		btnLogout.id = "btnLogout";
		btnLogout.textContent = "Logout";

		btnLogout.addEventListener("click", () => {
			const payload = {
				"method": "logout",
				"username": thisConnection.username
			};

			ws.send(JSON.stringify(payload));
		});
		divMainMenu.appendChild(btnLogout);

		document.body.appendChild(divMainMenu);
	}

	function showCategorySelectionLayout(_categoryList) {
		clearScreen();

		const divCategorySelection = document.createElement("div");
		divCategorySelection.id = "divCategorySelection";

		const lblCategoryList = document.createElement("label");
		lblCategoryList.htmlFor = "selCategoryList";
		lblCategoryList.innerText = "Category: ";
		divCategorySelection.appendChild(lblCategoryList);

		const selCategoryList = document.createElement("select");
		selCategoryList.id = "selCategoryList";
		for (const category of _categoryList) {
			const option = document.createElement("option");
			option.value = category.id;
			option.innerText = category.name;
			selCategoryList.appendChild(option);
		}
		divCategorySelection.appendChild(selCategoryList);

		divCategorySelection.appendChild(document.createElement("br"));
		divCategorySelection.appendChild(document.createElement("br"));

		const lblTries = document.createElement("label");
		lblTries.htmlFor = "inputTries";
		lblTries.innerText = "Tries per player: ";
		divCategorySelection.appendChild(lblTries);

		const inputTries = document.createElement("input");
		inputTries.id = "inputTries";
		inputTries.type = "number";
		inputTries.value = 2;
		inputTries.min = 1;
		inputTries.max = 5;
		divCategorySelection.appendChild(inputTries);

		divCategorySelection.appendChild(document.createElement("br"));

		const btnCreateGame = document.createElement("button");
		btnCreateGame.id = "btnCreateGame";
		btnCreateGame.textContent = "Create Game";
		btnCreateGame.addEventListener("click", () => {
			const selectedCategory = _categoryList.find(c => c.id === parseInt(selCategoryList.value));
			let tries = parseInt(inputTries.value);

			if (tries > 5) tries = 5;
			else if (tries < 1) tries = 1;

			const payload = {
				"method": "newGame",
				"username": thisConnection.username,
				"categoryId": parseInt(selectedCategory.id),
				"Name": selectedCategory.name,
				"items": selectedCategory.items,
				"tries": tries
			};

			ws.send(JSON.stringify(payload));
		});
		divCategorySelection.appendChild(btnCreateGame);

		divCategorySelection.appendChild(document.createElement("br"));

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divCategorySelection.appendChild(btnBack);

		document.body.appendChild(divCategorySelection);
	}

	function showCategoryCreationLayout() {
		clearScreen();

		const divCategoryCreation = document.createElement("div");
		divCategoryCreation.id = "divCategoryCreation";

		const lblName = document.createElement("label");
		lblName.id = "lblName";
		lblName.htmlFor = "inputName";
		lblName.innerText = "Name: ";
		divCategoryCreation.appendChild(lblName);

		const inputName = document.createElement("input");
		inputName.id = "inputName";
		inputName.value = "My Category";
		divCategoryCreation.appendChild(inputName);

		divCategoryCreation.appendChild(document.createElement("br"));
		divCategoryCreation.appendChild(document.createElement("br"));

		const lblSize = document.createElement("label");
		lblSize.id = "lblSize";
		lblSize.htmlFor = "selSize";
		lblSize.innerText = "Size: ";
		divCategoryCreation.appendChild(lblSize);

		const selSize = document.createElement("select");
		selSize.id = "selSize";
		const option20 = document.createElement("option");
		option20.value = 20;
		option20.innerHTML = 20;
		selSize.appendChild(option20);
		const option24 = document.createElement("option");
		option24.selected = true;
		option24.value = 24;
		option24.innerHTML = 24;
		selSize.appendChild(option24);
		const option28 = document.createElement("option");
		option28.value = 28;
		option28.innerHTML = 28;
		selSize.appendChild(option28);

		const divItems = document.createElement("divItems");
		divItems.id = "divItems";
		selSize.addEventListener("change", () => {
			divItems.innerHTML = "";
			spawnItemsToEdit(divItems, parseInt(selSize.value));
		});
		divCategoryCreation.appendChild(selSize);

		divCategoryCreation.appendChild(document.createElement("br"));
		divCategoryCreation.appendChild(document.createElement("br"));

		spawnItemsToEdit(divItems, parseInt(selSize.value));
		divCategoryCreation.appendChild(divItems);

		const btnCreateCtegory = document.createElement("button");
		btnCreateCtegory.id = "btnCreateCtegory";
		btnCreateCtegory.textContent = "Create Category";
		btnCreateCtegory.addEventListener("click", () => {
			const items = document.getElementsByClassName("item");
			const usedNames = [];
			let itemsArray = "[";
			let isValid = true;

			for (let item of items) {
				const names = item.getElementsByClassName("itemName");
				const pictures = item.getElementsByClassName("itemPicture");
				const itemObject = {};

				for (let name of names) {
					const value = name.value;

					if (!value || usedNames.includes(value)) {
						name.style.backgroundColor = "red";
						isValid = false;
					}
					else {
						name.style.backgroundColor = "white";
						itemObject.name = value;
					}

					usedNames.push(value);
				}

				for (let picture of pictures) {
					if (!picture.value) {
						picture.style.backgroundColor = "red";
						isValid = false;
					}
					else {
						picture.style.backgroundColor = "white";
						itemObject.picture = picture.value;
					}
				}

				if (isValid) itemsArray += JSON.stringify(itemObject) + ", ";
			}
			itemsArray = itemsArray.substring(0, itemsArray.length - 2);
			itemsArray += "]";

			if (!isValid) return;

			const payload = {
				"method": "createCategory",
				"userId": thisConnection.userId,
				"name": inputName.value,
				"items": itemsArray
			};

			ws.send(JSON.stringify(payload));
		});
		divCategoryCreation.appendChild(btnCreateCtegory);

		document.body.appendChild(divCategoryCreation);
	}

	function spawnItemsToEdit(_div, _number) {
		for (let i = 0; i < _number; i++) {
			const divItem = document.createElement("div");
			divItem.id = `divItem${i}`;
			divItem.className = "item";
			const lblName = document.createElement("label");
			lblName.id = `lblName${i}`;
			lblName.htmlFor = `inputName${i}`;
			lblName.innerText = "Name: ";
			divItem.appendChild(lblName);

			const inputName = document.createElement("input");
			inputName.id = `inputName${i}`;
			inputName.className = "itemName";
			divItem.appendChild(inputName);

			divItem.appendChild(document.createElement("br"));

			const lblPicture = document.createElement("label");
			lblPicture.id = `lblPicture${i}`;
			lblPicture.htmlFor = `inputPicture${i}`;
			lblPicture.innerText = "Picture: ";
			divItem.appendChild(lblPicture);

			const inputPicture = document.createElement("input");
			inputPicture.id = `inputPicture${i}`;
			inputPicture.className = "itemPicture";
			divItem.appendChild(inputPicture);
			_div.appendChild(divItem);
			_div.appendChild(document.createElement("br"));
			_div.appendChild(document.createElement("br"));
		}
	}

	function showLobbyLayout(_gameId, _owner, _playersArray) {
		clearScreen();
		spawnRoomCode(_gameId);
		spawnStartButton(_owner);
		spawnLeaveButton();
		spawnPlayers(_playersArray);
		spawnChat();
	}

	function spawnStartButton(_owner) {
		const btnStart = document.createElement("button");
		btnStart.id = "btnStart";
		btnStart.textContent = "Start";
		btnStart.addEventListener("click", () => {
			const payload = {
				"method": "startGame",
				"gameId": gameId
			};

			ws.send(JSON.stringify(payload));
			document.getElementById("btnStart").remove();
		});

		if (_owner !== thisConnection.username) btnStart.hidden = true;
		else btnStart.disabled = true;

		document.body.appendChild(btnStart);
	}

	function spawnLeaveButton() {
		const btnLeave = document.createElement("button");
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
			"username": thisConnection.username,
			"gameId": gameId
		};

		gameId = null;
		ws.send(JSON.stringify(payload));
		clearScreen();
		showMainMenuLayout();
	}

	function spawnRoomCode() {
		const divRoomCode = document.createElement("div");
		divRoomCode.id = "divRoomCode";
		divRoomCode.innerHTML = `<p id="pRoomCode"><b>Room code: </b>${gameId}</p>`;
		document.body.appendChild(divRoomCode);
	}

	function spawnPlayers(_players) {
		const divPlayers = document.createElement("div");
		divPlayers.id = "divPlayers";
		document.body.appendChild(divPlayers);

		updatePlayers(_players);
	}

	function showGameLayout(_items, _yourItem, _tries) {
		document.getElementById("divRoomCode").remove();

		document.body.appendChild(document.createElement("br"));

		const divGame = document.createElement("div");
		divGame.id = "divGame";

		const tableBoard = document.createElement("table");
		tableBoard.id = "tableBoard";

		while (_items.length > 0) {
			const tr = document.createElement("tr");

			let itemsInRow = _items.splice(0, 6);
			for (const item of itemsInRow) {
				const td = document.createElement("td");
				const btnCell = document.createElement("button");

				btnCell.style.color = "limegreen";
				btnCell.textContent = item.name;

				btnCell.addEventListener("click", () => {
					if (btnCell.style.color === "limegreen") btnCell.style.color = "red";
					else btnCell.style.color = "limegreen";
				});

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
					"username": thisConnection.username,
					"guess": inputGuess.value
				};

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
		const divChat = document.createElement("div");
		divChat.id = "divChat";
		document.body.appendChild(divChat);

		const chatTitle = document.createElement("h4");
		chatTitle.innerHTML = "CHAT";
		divChat.appendChild(chatTitle);

		const divChatHistory = document.createElement("div");
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
					"username": thisConnection.username,
					"text": inputMessage.value
				};

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
			message.innerHTML = `<b>${_name === thisConnection.username ? "You" : _name}: </b>${_message}`;
			divChatHistory.appendChild(message);
			divChatHistory.scrollTop = divChatHistory.scrollHeight;
			return;
		}
	}

	function updatePlayers(_arrayPlayers) {
		const divPlayers = document.getElementById("divPlayers");
		divPlayers.innerHTML = "";

		let i = 0;

		_arrayPlayers.forEach(player => {
			const div = document.createElement("div");
			const text = player.username === thisConnection.username ? "<b>You</b>" : player.username;

			div.innerHTML = `<b>Player ${++i}: </b>${text}`;
			divPlayers.appendChild(div);
		});

		if (_arrayPlayers[0].username === thisConnection.username) document.getElementById("btnStart").hidden = false;

		if (_arrayPlayers.length <= 1) document.getElementById("btnStart").disabled = true;
		else document.getElementById("btnStart").disabled = false;
	}

	function updateTries(_nTries) {
		document.getElementById("pTries").innerHTML = `Tries left: ${_nTries}`;
	}

	function clearScreen() {
		document.body.innerHTML = "";

		const title = document.createElement("h1");
		title.innerHTML = "Who is it?™ Online";
		document.body.appendChild(title);
	}
}

main();