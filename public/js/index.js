function main() {
	const ws = new WebSocket("wss://localhost:8443");
	const domainURL = "https://localhost:8443";
	let thisConnection = null;
	let gameId = null;

	ws.onclose = () => setTimeout(main(), 2000);
	ws.onmessage = (message) => {
		const response = JSON.parse(message.data);
		const method = response.method;

		if (method === "alert") {
			alert(response.message);

			if (response.error) {
				if (response.action === "recoveringAccount") window.location.replace(domainURL);
			}

			return;
		}

		// Connection was made
		if (method === "connect") {
			const recoveryCode = getURLParameter("password_recovery");
			const verificationCode = getURLParameter("email_verification");

			thisConnection = response.connectionData;
			spawnTitle();

			if (verificationCode) {
				const payload = {
					"method": "checkVerificationCode",
					"verificationCode": verificationCode
				};

				ws.send(JSON.stringify(payload));
				return;
			}

			if (recoveryCode) {
				const payload = {
					"method": "checkRecoveryCode",
					"recoveryCode": recoveryCode
				};

				ws.send(JSON.stringify(payload));
				return;
			}

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

		if (method === "verificationSent") {
			alert("Registration validated. A verification email was sent.");
			showLoginLayout();
			return;
		}

		if (method === "recoveringAccount") {
			showNewPasswordLayout(response.recoveryCode);
			return;
		}

		if (method === "accountRecovered") {
			alert("Account password changed successfully!");
			window.location.replace(domainURL);
			return;
		}

		if (method === "emailVerified") {
			alert("Email verified successfully!");
			window.location.replace(domainURL);
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
		
		// Leaderboard
		if (method === "getLeaderboard") {
			showLeaderboardLayout(response.data);
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
		title.innerHTML = "Who is it? Online";
		document.getElementById("screen").appendChild(title);
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
		inputUsername.placeholder = "Username / Email";
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
		inputPassword.placeholder = "Password";
		inputPassword.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnLogin").click();
		});
		divLogin.appendChild(inputPassword);

		divLogin.appendChild(document.createElement("br"));
		divLogin.appendChild(document.createElement("br"));

		const btnLogin = document.createElement("button");
		btnLogin.id = "btnLogin";
		btnLogin.className = "btn btn-primary";
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

		const aRecover = document.createElement("span");
		aRecover.className = "link";
		aRecover.innerText = "Forgot password?";
		aRecover.addEventListener("click", () => {
			showAccountRecoveryLayout();
		});
		divLogin.appendChild(aRecover);

		divLogin.appendChild(document.createElement("br"));

		const spanRegister = document.createElement("span");
		spanRegister.className = "link";
		spanRegister.innerText = "I want to register.";
		spanRegister.addEventListener("click", () => {
			showRegisterLayout();
		});
		divLogin.appendChild(spanRegister);

		document.getElementById("screen").appendChild(divLogin);
	}

	function showRegisterLayout() {
		clearScreen();

		const divRegister = document.createElement("div");
		divRegister.id = "divRegister";

		const lblUsername = document.createElement("label");
		lblUsername.innerText = "Username";
		lblUsername.htmlFor = "inputUsername";
		divRegister.appendChild(lblUsername);

		divRegister.appendChild(document.createElement("br"));

		const inputUsername = document.createElement("input");
		inputUsername.id = "inputUsername";
		inputUsername.type = "text";
		inputUsername.placeholder = "Username";
		divRegister.appendChild(inputUsername);

		divRegister.appendChild(document.createElement("br"));
		divRegister.appendChild(document.createElement("br"));

		const lblEmail = document.createElement("label");
		lblEmail.innerText = "Email";
		lblEmail.htmlFor = "inputEmail";
		divRegister.appendChild(lblEmail);

		divRegister.appendChild(document.createElement("br"));

		const inputEmail = document.createElement("input");
		inputEmail.id = "inputEmail";
		inputEmail.type = "email";
		inputEmail.placeholder = "Email";
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
		inputPassword.placeholder = "Password";
		divRegister.appendChild(inputPassword);

		divRegister.appendChild(document.createElement("br"));
		divRegister.appendChild(document.createElement("br"));

		const btnRegister = document.createElement("button");
		btnRegister.id = "btnRegister";
		btnRegister.className = "btn btn-primary";
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

		const spanLogin = document.createElement("span");
		spanLogin.className = "link";
		spanLogin.innerText = "I want to log in.";
		spanLogin.addEventListener("click", () => {
			showLoginLayout();
		});
		divRegister.appendChild(spanLogin);

		document.getElementById("screen").appendChild(divRegister);
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
		btnNewGame.className = "btn btn-primary";
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
		btnJoinGame.className = "btn btn-primary";
		btnJoinGame.textContent = "Join Game";
		btnJoinGame.addEventListener("click", () => {
			const inputJoinGame = document.getElementById("inputJoinGame");

			if (!inputJoinGame.value) return alert("Please type a room code into the text box.");

			joinGame(inputJoinGame.value);
		});
		divJoinGame.appendChild(btnJoinGame);
		const inputJoinGame = document.createElement("input");
		inputJoinGame.id = "inputJoinGame";
		inputJoinGame.type = "text";
		inputJoinGame.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnJoinGame").click();
		});
		divJoinGame.appendChild(inputJoinGame);
		divMainMenu.appendChild(divJoinGame);

		const btnCategoryEditor = document.createElement("button");
		btnCategoryEditor.id = "btnCategoryEditor";
		btnCategoryEditor.className = "btn btn-primary";
		btnCategoryEditor.textContent = "Category Editor";
		btnCategoryEditor.addEventListener("click", () => {
			showCategoryCreationLayout();
		});
		divMainMenu.appendChild(btnCategoryEditor);

		divMainMenu.appendChild(document.createElement("br"));

		const btnLeaderboard = document.createElement("button");
		btnLeaderboard.id = "btnLeaderboard";
		btnLeaderboard.className = "btn btn-primary";
		btnLeaderboard.textContent = "Leaderboard";
		btnLeaderboard.addEventListener("click", () => {
			const payload = {
				"method": "getLeaderboard"
			};

			ws.send(JSON.stringify(payload));
		});
		divMainMenu.appendChild(btnLeaderboard);

		divMainMenu.appendChild(document.createElement("br"));

		const btnLogout = document.createElement("button");
		btnLogout.id = "btnLogout";
		btnLogout.className = "btn btn-danger";
		btnLogout.textContent = "Logout";

		btnLogout.addEventListener("click", () => {
			const payload = {
				"method": "logout",
				"username": thisConnection.username
			};

			ws.send(JSON.stringify(payload));
		});
		divMainMenu.appendChild(btnLogout);

		document.getElementById("screen").appendChild(divMainMenu);
	}

	function showCategorySelectionLayout(_categoryList) {
		clearScreen();

		const divCategorySelection = document.createElement("div");
		divCategorySelection.id = "divCategorySelection";

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.className = "btn btn-secondary";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divCategorySelection.appendChild(btnBack);

		divCategorySelection.appendChild(document.createElement("br"));
		divCategorySelection.appendChild(document.createElement("br"));

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
		divCategorySelection.appendChild(document.createElement("br"));

		const btnCreateGame = document.createElement("button");
		btnCreateGame.id = "btnCreateGame";
		btnCreateGame.className = "btn btn-primary";
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

		document.getElementById("screen").appendChild(divCategorySelection);
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

		const lblPrivate = document.createElement("label");
		lblPrivate.id = "lblPrivate";
		lblPrivate.htmlFor = "cbPublic";
		lblPrivate.innerText = "Public:";
		divCategoryCreation.appendChild(lblPrivate);

		const cbPublic = document.createElement("input");
		cbPublic.id = "cbPublic";
		cbPublic.type = "checkbox";
		divCategoryCreation.appendChild(cbPublic);

		divCategoryCreation.appendChild(document.createElement("br"));
		divCategoryCreation.appendChild(document.createElement("br"));

		const divItems = document.createElement("div");
		divItems.id = "divItems";

		for (let i = 0; i < 24; i++) {
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
			inputName.placeholder = "Name";
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
			inputPicture.placeholder = "URL";
			divItem.appendChild(inputPicture);

			divItem.appendChild(document.createElement("br"));

			const spanError = document.createElement("span");
			spanError.id = `spanError${i}`;
			spanError.className = "spanError";
			spanError.style.color = "red";
			divItem.appendChild(spanError);

			divItem.appendChild(document.createElement("br"));

			divItems.appendChild(divItem);
		}

		divCategoryCreation.appendChild(divItems);

		const btnCreateCtegory = document.createElement("button");
		btnCreateCtegory.id = "btnCreateCtegory";
		btnCreateCtegory.className = "btn btn-primary";
		btnCreateCtegory.textContent = "Create Category";
		btnCreateCtegory.addEventListener("click", () => {
			const errors = document.getElementsByClassName("spanError");
			const items = document.getElementsByClassName("item");
			const usedNames = [];
			const usedPictures = [];
			let itemsArray = "[";
			let isValid = true;
			let i = 0;

			for (const error of errors) {
				error.innerHTML = "";
			}

			for (const item of items) {
				const names = item.getElementsByClassName("itemName");
				const pictures = item.getElementsByClassName("itemPicture");
				const itemObject = {};

				for (const picture of pictures) {
					const value = picture.value;

					if (!pictureValidation(value, i, usedPictures)) isValid = false;
					else itemObject.picture = picture.value;

					usedPictures.push(value);
				}

				for (const name of names) {
					const value = name.value;

					if (!nameValidation(value, i, usedNames)) isValid = false;
					else itemObject.name = name.value;

					usedNames.push(value);
				}

				if (isValid) itemsArray += JSON.stringify(itemObject) + ", ";
				i++;
			}
			
			itemsArray = itemsArray.substring(0, itemsArray.length - 2);
			itemsArray += "]";

			if (!isValid) return;

			const payload = {
				"method": "createCategory",
				"userId": thisConnection.userId,
				"name": inputName.value,
				"items": itemsArray,
				"isPublic": cbPublic.checked
			};

			ws.send(JSON.stringify(payload));
		});
		divCategoryCreation.appendChild(btnCreateCtegory);

		divCategoryCreation.appendChild(document.createElement("br"));

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.className = "btn btn-secondary";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divCategoryCreation.appendChild(btnBack);

		document.getElementById("screen").appendChild(divCategoryCreation);
	}

	function nameValidation(_name, _i, _usedNames) {
		const spanError = document.getElementById(`spanError${_i}`);

		if (!_name) {
			spanError.textContent = "Name missing";
			return false;
		}

		if (_usedNames.includes(_name)) {
			spanError.textContent = "Name already in use";
			return false;
		}

		return true;
	}

	function pictureValidation(_picture, _i, _usedPictures) {
		const spanError = document.getElementById(`spanError${_i}`);

		if (!_picture) {
			spanError.textContent = "Picture missing";
			return false;
		}

		if (_usedPictures.includes(_picture)) {
			spanError.textContent = "Picture link already in use";
			return false;
		}
		
		return true;
	}

	function showAccountRecoveryLayout() {
		clearScreen();

		const divAccountRecovery = document.createElement("div");
		divAccountRecovery.id = "divAccountRecovery";

		const lblEmail = document.createElement("label");
		lblEmail.innerText = "Please insert your email below.";
		lblEmail.htmlFor = "inputEmail";
		divAccountRecovery.appendChild(lblEmail);

		divAccountRecovery.appendChild(document.createElement("br"));
		divAccountRecovery.appendChild(document.createElement("br"));

		const inputEmail = document.createElement("input");
		inputEmail.id = "inputEmail";
		inputEmail.type = "email";
		inputEmail.placeholder = "Email";
		inputEmail.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnSend").click();
		});
		divAccountRecovery.appendChild(inputEmail);

		divAccountRecovery.appendChild(document.createElement("br"));
		divAccountRecovery.appendChild(document.createElement("br"));

		const btnSend = document.createElement("button");
		btnSend.id = "btnSend";
		btnSend.className = "btn btn-primary";
		btnSend.textContent = "Send Recovery Request";
		btnSend.addEventListener("click", () => {
			if (inputEmail.value) {
				const payload = {
					"method": "recoverAccount",
					"email": inputEmail.value
				};

				ws.send(JSON.stringify(payload));
				alert("Request sent successfully. If the email is registered, an account recovery email will be sent.");
				showLoginLayout();
			}
		});
		divAccountRecovery.appendChild(btnSend);

		divAccountRecovery.appendChild(document.createElement("br"));

		const spanLogin = document.createElement("span");
		spanLogin.className = "link";
		spanLogin.innerText = "I want to log in.";
		spanLogin.addEventListener("click", () => {
			showLoginLayout();
		});
		divAccountRecovery.appendChild(spanLogin);

		divAccountRecovery.appendChild(document.createElement("br"));

		const spanRegister = document.createElement("span");
		spanRegister.className = "link";
		spanRegister.innerText = "I want to register.";
		spanRegister.addEventListener("click", () => {
			showRegisterLayout();
		});
		divAccountRecovery.appendChild(spanRegister);

		document.getElementById("screen").appendChild(divAccountRecovery);
	}

	function showNewPasswordLayout(_recoveryCode) {
		clearScreen();

		const divChangePassword = document.createElement("div");
		divChangePassword.id = "divChangePassword";

		const lblNewPassword = document.createElement("label");
		lblNewPassword.innerText = "New Password";
		lblNewPassword.htmlFor = "inputNewPassword";
		divChangePassword.appendChild(lblNewPassword);

		divChangePassword.appendChild(document.createElement("br"));

		const inputNewPassword = document.createElement("input");
		inputNewPassword.id = "inputNewPassword";
		inputNewPassword.type = "password";
		inputNewPassword.placeholder = "New Password";
		divChangePassword.appendChild(inputNewPassword);

		divChangePassword.appendChild(document.createElement("br"));
		divChangePassword.appendChild(document.createElement("br"));

		const lblConfirmPassword = document.createElement("label");
		lblConfirmPassword.innerText = "Confirm Password";
		lblConfirmPassword.htmlFor = "inputConfirmPassword";
		divChangePassword.appendChild(lblConfirmPassword);

		divChangePassword.appendChild(document.createElement("br"));

		const inputConfirmPassword = document.createElement("input");
		inputConfirmPassword.id = "inputConfirmPassword";
		inputConfirmPassword.type = "password";
		inputConfirmPassword.placeholder = "Confirm Password";
		divChangePassword.appendChild(inputConfirmPassword);

		divChangePassword.appendChild(document.createElement("br"));
		divChangePassword.appendChild(document.createElement("br"));

		const btnChangePassword = document.createElement("button");
		btnChangePassword.id = "btnChangePassword";
		btnChangePassword.className = "btn btn-primary";
		btnChangePassword.textContent = "Change Password";
		btnChangePassword.addEventListener("click", () => {
			const inputNewPassword = document.getElementById("inputNewPassword");
			const inputConfirmPassword = document.getElementById("inputConfirmPassword");

			if (!inputNewPassword.value) return inputNewPassword.style.backgroundColor = "red";
			else inputNewPassword.style.backgroundColor = "white";
			if (!inputConfirmPassword.value || inputConfirmPassword.value !== inputNewPassword.value) return inputConfirmPassword.style.backgroundColor = "red";
			else inputConfirmPassword.style.backgroundColor = "white";

			const payload = {
				"method": "changePassword",
				"recoveryCode": _recoveryCode,
				"newPassword": inputNewPassword.value
			};

			ws.send(JSON.stringify(payload));
		});
		divChangePassword.appendChild(btnChangePassword);

		divChangePassword.appendChild(document.createElement("br"));

		const btnCancel = document.createElement("button");
		btnCancel.id = "btnCancel";
		btnCancel.className = "btn btn-secondary";
		btnCancel.textContent = "Cancel";
		btnCancel.addEventListener("click", () => {
			window.location.replace(domainURL);
		});
		divChangePassword.appendChild(btnCancel);

		document.getElementById("screen").appendChild(divChangePassword);
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
		btnStart.className = "btn btn-success";
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

		document.getElementById("screen").appendChild(btnStart);
	}

	function spawnLeaveButton() {
		const btnLeave = document.createElement("button");
		btnLeave.id = "btnLeave";
		btnLeave.className = "btn btn-danger";
		btnLeave.textContent = "Leave";
		btnLeave.addEventListener("click", () => {
			leaveGame();
		});
		document.getElementById("screen").appendChild(btnLeave);
	}

	function leaveGame() {
		const payload = {
			"method": "leaveGame",
			"username": thisConnection.username,
			"gameId": gameId
		};

		ws.send(JSON.stringify(payload));
		gameId = null;
		clearScreen();
		showMainMenuLayout();
	}

	function spawnRoomCode() {
		const divRoomCode = document.createElement("div");
		divRoomCode.id = "divRoomCode";
		divRoomCode.innerHTML = `<p id="pRoomCode"><b>Room code: </b>${gameId}</p>`;
		document.getElementById("screen").appendChild(divRoomCode);
	}

	function spawnPlayers(_players) {
		const divPlayers = document.createElement("div");
		divPlayers.id = "divPlayers";
		document.getElementById("screen").appendChild(divPlayers);

		updatePlayers(_players);
	}

	function showGameLayout(_items, _yourItem, _tries) {
		document.getElementById("divRoomCode").remove();

		document.getElementById("screen").appendChild(document.createElement("br"));

		const divGame = document.createElement("div");
		divGame.id = "divGame";

		const tableBoard = document.createElement("table");
		tableBoard.id = "tableBoard";

		while (_items.length > 0) {
			const tr = document.createElement("tr");

			let itemsInRow = _items.splice(0, 6);
			for (const item of itemsInRow) {
				const td = document.createElement("td");
				const imgCell = document.createElement("img");
				imgCell.className = "picture";
				imgCell.src = item.picture;
				td.appendChild(imgCell);

				td.appendChild(document.createElement("br"));

				const btnCell = document.createElement("button");
				btnCell.style.color = "limegreen";
				btnCell.textContent = item.name;
				btnCell.addEventListener("click", () => {
					if (btnCell.style.color === "limegreen") {
						btnCell.style.color = "red";
						imgCell.style.filter = "grayscale()";
					}
					else {
						btnCell.style.color = "limegreen";
						imgCell.style.filter = null;
					}
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
				inputGuess.value = "";
			}
		});

		divGame.appendChild(inputGuess);

		// Player's item to be guessed
		const pTries = document.createElement("p");
		pTries.id = "pTries";
		pTries.innerText = `Tries left: ${_tries}`;
		divGame.appendChild(pTries);

		document.getElementById("screen").appendChild(divGame);
	}

	function showLeaderboardLayout(_data) {
		clearScreen();

		const divLeaderboard = document.createElement("div");
		divLeaderboard.id = "divLeaderboard";

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.className = "btn btn-secondary";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divLeaderboard.appendChild(btnBack);

		divLeaderboard.appendChild(document.createElement("br"));
		divLeaderboard.appendChild(document.createElement("br"));

		for (let user of _data) {
			const divUser = document.createElement("div");
			divUser.className = "divLeaderboardUser";
			
			const spanUsername = document.createElement("span");
			spanUsername.id = "spanUsername";
			spanUsername.innerHTML = `<b>${user.username}</b>`;
			divUser.appendChild(spanUsername);
			
			const spanWins = document.createElement("span");
			spanWins.id = "spanWins";
			spanWins.textContent = `Wins: ${user.wins}`;
			divUser.appendChild(spanWins);
			
			const spanLosses = document.createElement("span");
			spanLosses.id = "spanLosses";
			spanLosses.textContent = `Losses: ${user.losses}`;
			divUser.appendChild(spanLosses);
			
			const spanNMatches = document.createElement("span");
			spanNMatches.id = "spanNMatches";
			spanNMatches.textContent = `Total: ${user.total}`;
			divUser.appendChild(spanNMatches);
			
			const spanWinRate = document.createElement("span");
			spanWinRate.id = "spanWinRate";
			spanWinRate.textContent = `Win Rate: ${user.win_rate}%`;
			divUser.appendChild(spanWinRate);
			
			const spanPoints = document.createElement("span");
			spanPoints.id = "spanPoints";
			spanPoints.textContent = `Points: ${user.points}`;
			divUser.appendChild(spanPoints);

			divLeaderboard.appendChild(divUser);

			divLeaderboard.appendChild(document.createElement("br"));
		}

		document.getElementById("screen").appendChild(divLeaderboard);
	}

	function spawnChat() {
		const divChat = document.createElement("div");
		divChat.id = "divChat";
		document.getElementById("screen").appendChild(divChat);

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
				inputMessage.value = "";
			}
		});

		divChat.appendChild(inputMessage);
	}

	function updateChat(_type, _name, _message) {
		const divChatHistory = document.getElementById("divChatHistory");
		const message = document.createElement("div");

		if (_type === "system") {
			message.className = "chat message system";
			message.innerHTML = _message;
			divChatHistory.appendChild(message);
			divChatHistory.scrollTop = divChatHistory.scrollHeight;
			return;
		}

		if (_type === "user") {
			message.className = "chat message user";
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
		document.getElementById("screen").innerHTML = "";
	}

	function getURLParameter(sParam) {
		let sPageURL = window.location.search.substring(1);
		let sURLVariables = sPageURL.split("&");
		for (let i = 0; i < sURLVariables.length; i++) {
			let sParameterName = sURLVariables[i].split("=");
			if (sParameterName[0] == sParam) {
				return sParameterName[1];
			}
		}
	}
}

main();