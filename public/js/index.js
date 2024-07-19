function main() {
	const ws = new WebSocket("wss://26.35.146.0:8443");
	const domainURL = "https://26.35.146.0:8443";
	let thisConnection = null;
	let gameId = null;

	ws.onclose = () => setTimeout(main(), 2000);
	ws.onmessage = (message) => {
		const response = JSON.parse(message.data);
		const method = response.method;

		if (method === "alert") {
			notify(response.header, response.message);

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
			const email = localStorage.getItem("email");

			if (username) {
				const payload = {
					"method": "login",
					"type": "auto",
					"id": id,
					"username": username,
					"email": email
				};

				ws.send(JSON.stringify(payload));
			}

			return;
		}

		if (method === "verificationSent") {
			showLoginLayout();
			notify("Success", "A verification email was sent.");
			return;
		}

		if (method === "recoveringAccount") {
			showNewPasswordLayout(response.recoveryCode);
			return;
		}

		if (method === "accountRecovered") {
			notify("Success", "Account password changed.", true);
			return;
		}

		if (method === "emailVerified") {
			notify("Success", "Email verified.", true);
			return;
		}

		// User logged in
		if (method === "loggedIn") {
			const userId = response.userId;
			const username = response.username;
			const email = response.email;

			thisConnection.userId = userId;
			thisConnection.username = username;
			thisConnection.email = email;
			localStorage.setItem("id", userId);
			localStorage.setItem("username", username);
			localStorage.setItem("email", email);
			showMainMenuLayout();
			return;
		}

		// User logged out
		if (method === "loggedOut") {
			delete thisConnection.userId;
			delete thisConnection.username;
			delete thisConnection.email;
			localStorage.removeItem("id");
			localStorage.removeItem("username");
			localStorage.removeItem("email");
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
			document.getElementById("divGuess").remove();
			notify(null, "You won!");
			return;
		}

		// Lost the game
		if (method === "gameLost") {
			document.getElementById("divGuess").remove();
			notify(null, "You lost!");
			return;
		}

		// Leaderboard
		if (method === "getLeaderboard") {
			showLeaderboardLayout(response.data);
			return;
		}

		// Profile
		if (method === "getProfile") {
			getProfileInfo(response.userInfo, response.matchHistory);
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

	function showLoginLayout() {
		clearScreen();
		const divLogin = document.createElement("div");
		divLogin.id = "divLogin";
		divLogin.className = "row justify-content-md";
		document.getElementById("screen").appendChild(divLogin);

		const loginText = document.createElement("h1");
		loginText.innerText = "Login";
		divLogin.appendChild(loginText);

		const divLoginUser = document.createElement("div");
		divLoginUser.id = "loginUser";
		divLoginUser.className = "col-12";
		document.getElementById("divLogin").appendChild(divLoginUser);

		const lblUsername = document.createElement("label");
		lblUsername.innerText = "Username / Email";
		lblUsername.htmlFor = "inputUsername";
		divLoginUser.appendChild(lblUsername);

		const inputUsername = document.createElement("input");
		inputUsername.id = "inputUsername";
		inputUsername.type = "text";
		inputUsername.placeholder = "Username / Email";
		inputUsername.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnLogin").click();
		});
		divLoginUser.appendChild(inputUsername);

		const spanErrorUsername = document.createElement("span");
		spanErrorUsername.id = "spanErrorUsername";
		spanErrorUsername.className = "spanError";
		divLoginUser.appendChild(spanErrorUsername);

		const divLoginPass = document.createElement("div");
		divLoginPass.id = "loginPass";
		divLoginPass.className = "col-12";
		document.getElementById("divLogin").appendChild(divLoginPass);

		const lblPassword = document.createElement("label");
		lblPassword.innerText = "Password";
		lblPassword.htmlFor = "inputPassword";
		divLoginPass.appendChild(lblPassword);

		const inputPassword = document.createElement("input");
		inputPassword.id = "inputPassword";
		inputPassword.type = "password";
		inputPassword.placeholder = "Password";
		inputPassword.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnLogin").click();
		});
		divLoginPass.appendChild(inputPassword);
		const spanErrorPassword = document.createElement("span");
		spanErrorPassword.id = "spanErrorPassword";
		spanErrorPassword.className = "spanError";
		divLoginPass.appendChild(spanErrorPassword);

		const divLoginButton = document.createElement("div");
		divLoginButton.className = "col-12";
		divLoginButton.id = "loginButton";
		divLogin.appendChild(divLoginButton);

		const btnLogin = document.createElement("button");
		btnLogin.id = "btnLogin";
		btnLogin.className = "btn btn-primary";
		btnLogin.textContent = "Login";
		btnLogin.addEventListener("click", () => {
			const inputUsername = document.getElementById("inputUsername");
			const inputPassword = document.getElementById("inputPassword");

			if (!inputUsername.value) spanErrorUsername.innerHTML = "Username missing";
			else spanErrorUsername.innerHTML = null;
			if (!inputPassword.value) spanErrorPassword.innerHTML = "Password missing";
			else spanErrorPassword.innerHTML = null;

			if (!spanErrorUsername.innerHTML && !spanErrorPassword.innerHTML) {
				const payload = {
					"method": "login",
					"username": inputUsername.value,
					"password": inputPassword.value
				};

				ws.send(JSON.stringify(payload));
			}
		});
		divLoginButton.appendChild(btnLogin);

		const spansDiv = document.createElement("div");
		spansDiv.className = "col-12";
		divLogin.appendChild(spansDiv);

		const aRecover = document.createElement("span");
		aRecover.className = "clickable";
		aRecover.innerText = "Forgot password?";
		aRecover.addEventListener("click", () => {
			showAccountRecoveryLayout();
		});
		spansDiv.appendChild(aRecover);

		spansDiv.appendChild(document.createElement("br"));

		const spanRegister = document.createElement("span");
		spanRegister.className = "clickable";
		spanRegister.innerText = "I want to register.";
		spanRegister.addEventListener("click", () => {
			showRegisterLayout();
		});
		spansDiv.appendChild(spanRegister);
	}

	function showRegisterLayout() {
		clearScreen();

		const divRegister = document.createElement("div");
		divRegister.id = "divRegister";
		divRegister.className = "row justify-content-md";
		document.getElementById("screen").appendChild(divRegister);

		const registerText = document.createElement("h1");
		registerText.innerText = "Create your account";
		divRegister.appendChild(registerText);

		const divRegisterUser = document.createElement("div");
		divRegisterUser.id = "registerUser";
		divRegisterUser.className = "col-12";
		document.getElementById("divRegister").appendChild(divRegisterUser);

		const lblUsername = document.createElement("label");
		lblUsername.innerText = "Username";
		lblUsername.htmlFor = "inputUsername";
		divRegisterUser.appendChild(lblUsername);

		const inputUsername = document.createElement("input");
		inputUsername.id = "inputUsername";
		inputUsername.type = "text";
		inputUsername.placeholder = "Username";
		divRegisterUser.appendChild(inputUsername);

		const spanErrorUsername = document.createElement("span");
		spanErrorUsername.id = "spanErrorUsername";
		spanErrorUsername.className = "spanError";
		divRegisterUser.appendChild(spanErrorUsername);

		const divRegisterEmail = document.createElement("div");
		divRegisterEmail.id = "registerEmail";
		divRegisterEmail.className = "col-12";
		document.getElementById("divRegister").appendChild(divRegisterEmail);

		const lblEmail = document.createElement("label");
		lblEmail.innerText = "Email";
		lblEmail.htmlFor = "inputEmail";
		divRegisterEmail.appendChild(lblEmail);

		const inputEmail = document.createElement("input");
		inputEmail.id = "inputEmail";
		inputEmail.type = "email";
		inputEmail.placeholder = "Email";
		divRegisterEmail.appendChild(inputEmail);
		const spanErrorEmail = document.createElement("span");
		spanErrorEmail.id = "spanErrorEmail";
		spanErrorEmail.className = "spanError";
		divRegisterEmail.appendChild(spanErrorEmail);

		const divRegisterPW = document.createElement("div");
		divRegisterPW.id = "registerPW";
		divRegisterPW.className = "col-12";
		document.getElementById("divRegister").appendChild(divRegisterPW);

		const lblPassword = document.createElement("label");
		lblPassword.innerText = "Password";
		lblPassword.htmlFor = "inputPassword";
		divRegisterPW.appendChild(lblPassword);

		const inputPassword = document.createElement("input");
		inputPassword.id = "inputPassword";
		inputPassword.type = "password";
		inputPassword.placeholder = "Password";
		divRegisterPW.appendChild(inputPassword);
		const spanErrorPassword = document.createElement("span");
		spanErrorPassword.id = "spanErrorPassword";
		spanErrorPassword.className = "spanError";
		divRegisterPW.appendChild(spanErrorPassword);

		const divRegisterConfirmPW = document.createElement("div");
		divRegisterConfirmPW.id = "registerConfirmPW";
		divRegisterConfirmPW.className = "col-12";
		document.getElementById("divRegister").appendChild(divRegisterConfirmPW);

		const lblConfirmPassword = document.createElement("label");
		lblConfirmPassword.innerText = "Confirm Password";
		lblConfirmPassword.htmlFor = "inputConfirmPassword";
		divRegisterConfirmPW.appendChild(lblConfirmPassword);

		const inputConfirmPassword = document.createElement("input");
		inputConfirmPassword.id = "inputConfirmPassword";
		inputConfirmPassword.type = "password";
		inputConfirmPassword.placeholder = "Confirm Password";
		divRegisterConfirmPW.appendChild(inputConfirmPassword);
		const spanErrorConfirmPassword = document.createElement("span");
		spanErrorConfirmPassword.id = "spanErrorConfirmPassword";
		spanErrorConfirmPassword.className = "spanError";
		divRegisterConfirmPW.appendChild(spanErrorConfirmPassword);

		const registerButton = document.createElement("div");
		registerButton.className = "col-12";
		document.getElementById("divRegister").appendChild(registerButton);

		const btnRegister = document.createElement("button");
		btnRegister.id = "btnRegister";
		btnRegister.className = "btn btn-primary";
		btnRegister.textContent = "Register";
		btnRegister.addEventListener("click", () => {
			const inputUsername = document.getElementById("inputUsername");
			const inputEmail = document.getElementById("inputEmail");
			const inputPassword = document.getElementById("inputPassword");

			if (!inputUsername.value) spanErrorUsername.innerHTML = "Username missing";
			else if (inputUsername.value.length > 16) spanErrorUsername.innerHTML = "Username too long";
			else if (inputUsername.value.length < 4) spanErrorUsername.innerHTML = "Username too short";
			else if (/[^a-zA-Z0-9_-]/.test(profanityFilter(inputUsername.value))) spanErrorUsername.innerHTML = "Invalid Username";
			else spanErrorUsername.innerHTML = null;
			if (!inputEmail.value) spanErrorEmail.innerHTML = "Email missing";
			else if (/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(inputEmail.value)) spanErrorEmail.innerHTML = "Invalid email";
			else spanErrorEmail.innerHTML = null;
			if (!inputPassword.value) spanErrorPassword.innerHTML = "Password missing";
			else if (inputPassword.value.length < 8) spanErrorPassword.innerHTML = "Password too short";
			else spanErrorPassword.innerHTML = null;
			if (!inputConfirmPassword.value) spanErrorConfirmPassword.innerHTML = "Confirmation password missing";
			else if (inputConfirmPassword.value !== inputPassword.value) spanErrorConfirmPassword.innerHTML = "Passwords don't match";
			else spanErrorConfirmPassword.innerHTML = null;

			if (!spanErrorUsername.innerHTML && !spanErrorEmail.innerHTML && !spanErrorPassword.innerHTML && !spanErrorConfirmPassword.innerHTML) {
				const payload = {
					"method": "register",
					"username": inputUsername.value,
					"email": inputEmail.value,
					"password": inputPassword.value
				};

				ws.send(JSON.stringify(payload));
			}
		});
		registerButton.appendChild(btnRegister);

		const spanLogin = document.createElement("span");
		spanLogin.className = "clickable";
		spanLogin.innerText = "I want to log in.";
		spanLogin.addEventListener("click", () => {
			showLoginLayout();
		});
		divRegister.appendChild(spanLogin);
	}

	function drawProfile(_className, _userId, _username, _email, _tries, _color) {
		const spanProfile = document.createElement("span");
		spanProfile.className = `spanProfile ${_className}`;

		const divPicture = document.createElement("div");
		divPicture.className = "divPicture";
		const imgPicture = document.createElement("img");
		imgPicture.className = `imgPicture ${_className}`;
		imgPicture.src = `https://gravatar.com/avatar/${_email}?d=identicon`;
		imgPicture.style.borderColor = _color;
		divPicture.appendChild(imgPicture);
		spanProfile.appendChild(divPicture);

		const pUsername = document.createElement("p");
		pUsername.style.color = _color;
		pUsername.className = `pUsername ${_className}`;

		if (_tries !== null) pUsername.innerHTML = `<b>${_username}</b>\n(${_tries})`;
		else pUsername.innerHTML = `<b>${_username}</b>`;
		spanProfile.appendChild(pUsername);

		if (_className === "menu") {
			imgPicture.style.cursor = "pointer";
			imgPicture.addEventListener("click", () => {
				window.open("https://gravatar.com/", "_blank");
			});

			pUsername.className += " clickable";
			pUsername.addEventListener("click", () => {
				const payload = {
					"method": "getProfile",
					"userId": _userId
				};

				ws.send(JSON.stringify(payload));
			});
		}

		return spanProfile;
	}

	function showMainMenuLayout() {
		clearScreen();

		const divMainMenu = document.createElement("div");
		divMainMenu.id = "divMainMenu";
		document.getElementById("screen").appendChild(divMainMenu);

		divMainMenu.appendChild(drawProfile("menu", thisConnection.userId, thisConnection.username, thisConnection.email, null, null));

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

			if (!inputJoinGame.value) {
				notify("Error", "Please type a room code into the text box.");
				return;
			}

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
	}

	function showCategorySelectionLayout(_categoryList) {
		clearScreen();

		const divCategorySelection = document.createElement("div");
		divCategorySelection.id = "divCategorySelection";
		document.getElementById("screen").appendChild(divCategorySelection);

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
	}

	function showCategoryCreationLayout() {
		clearScreen();

		const divCategoryCreation = document.createElement("div");
		divCategoryCreation.id = "divCategoryCreation";
		document.getElementById("screen").appendChild(divCategoryCreation);

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.className = "btn btn-secondary";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divCategoryCreation.appendChild(btnBack);

		divCategoryCreation.appendChild(document.createElement("br"));
		divCategoryCreation.appendChild(document.createElement("br"));

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
				error.innerHTML = null;
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
		divAccountRecovery.className = "row justify-content-md";
		document.getElementById("screen").appendChild(divAccountRecovery);

		const recoveryText = document.createElement("h1");
		recoveryText.innerText = "Recover your account";
		divAccountRecovery.appendChild(recoveryText);

		const accountRecoveryEmail = document.createElement("div");
		accountRecoveryEmail.id = "recoveryEmail";
		accountRecoveryEmail.className = "col-12";
		divAccountRecovery.appendChild(accountRecoveryEmail);

		const lblEmail = document.createElement("label");
		lblEmail.innerText = "Please insert your email below.";
		lblEmail.htmlFor = "inputEmail";
		accountRecoveryEmail.appendChild(lblEmail);


		const inputEmail = document.createElement("input");
		inputEmail.id = "inputEmail";
		inputEmail.type = "email";
		inputEmail.placeholder = "Email";
		inputEmail.addEventListener("keydown", event => {
			if (event.key === "Enter") document.getElementById("btnSend").click();
		});
		accountRecoveryEmail.appendChild(inputEmail);

		const accountRecoveryButton = document.createElement("div");
		accountRecoveryButton.id = "recoveryButton";
		accountRecoveryButton.className = "col-12";
		divAccountRecovery.appendChild(accountRecoveryButton);

		const btnSend = document.createElement("button");
		btnSend.id = "btnSend";
		btnSend.className = "btn btn-primary";
		btnSend.textContent = "Send Request";
		btnSend.addEventListener("click", () => {
			if (inputEmail.value) {
				const payload = {
					"method": "recoverAccount",
					"email": inputEmail.value
				};

				ws.send(JSON.stringify(payload));
				showLoginLayout();
				notify("Success", "If the email is registered, an account recovery email will be sent.");
			}
		});
		accountRecoveryButton.appendChild(btnSend);

		const accountRecoverySpans = document.createElement("div");
		accountRecoverySpans.id = "recoverySpans";
		accountRecoverySpans.className = "col-12";
		divAccountRecovery.appendChild(accountRecoverySpans);

		const spanLogin = document.createElement("span");
		spanLogin.className = "clickable";
		spanLogin.innerText = "I want to log in.";
		spanLogin.addEventListener("click", () => {
			showLoginLayout();
		});
		accountRecoverySpans.appendChild(spanLogin);

		accountRecoverySpans.appendChild(document.createElement("br"));

		const spanRegister = document.createElement("span");
		spanRegister.className = "clickable";
		spanRegister.innerText = "I want to register.";
		spanRegister.addEventListener("click", () => {
			showRegisterLayout();
		});
		accountRecoverySpans.appendChild(spanRegister);
	}

	function showNewPasswordLayout(_recoveryCode) {
		clearScreen();

		const divChangePassword = document.createElement("div");
		divChangePassword.id = "divChangePassword";
		document.getElementById("screen").appendChild(divChangePassword);

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
		const spanErrorPassword = document.createElement("span");
		spanErrorPassword.id = "spanErrorPassword";
		spanErrorPassword.className = "spanError";
		divChangePassword.appendChild(spanErrorPassword);

		divChangePassword.appendChild(document.createElement("br"));
		divChangePassword.appendChild(document.createElement("br"));

		const lblConfirmPassword = document.createElement("label");
		lblConfirmPassword.innerText = "Confirm Password";
		lblConfirmPassword.htmlFor = "inputConfirmPassword";
		divChangePassword.appendChild(lblConfirmPassword);
		const spanErrorConfirmPassword = document.createElement("span");
		spanErrorConfirmPassword.id = "spanErrorConfirmPassword";
		spanErrorConfirmPassword.className = "spanError";
		divChangePassword.appendChild(spanErrorConfirmPassword);

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

			if (!inputNewPassword.value) spanErrorPassword.innerHTML = "Password missing";
			else spanErrorPassword.innerHTML = null;
			if (!inputConfirmPassword.value) spanErrorConfirmPassword.innerHTML = "Confirmation password missing";
			else if (inputConfirmPassword.value !== inputNewPassword.value) spanErrorConfirmPassword.innerHTML = "Passwords don't match";
			else spanErrorConfirmPassword.innerHTML = null;

			if (!spanErrorPassword.innerHTML && !spanErrorConfirmPassword.innerHTML) {
				const payload = {
					"method": "changePassword",
					"recoveryCode": _recoveryCode,
					"newPassword": inputNewPassword.value
				};

				ws.send(JSON.stringify(payload));
			}
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
	}

	function showLobbyLayout(_gameId, _owner, _arrayPlayers) {
		clearScreen();

		const divLobby = document.createElement("div");
		divLobby.id = "divLobby";
		divLobby.className = "col-xl";
		document.getElementById("screen").appendChild(divLobby);

		const divRoomCode = document.createElement("div");
		divRoomCode.id = "divRoomCode";
		divRoomCode.innerHTML = `<p id="pRoomCode"><b>Room code: </b>${_gameId}</p>`;
		divLobby.appendChild(divRoomCode);

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

		divLobby.appendChild(btnStart);

		const btnLeave = document.createElement("button");
		btnLeave.id = "btnLeave";
		btnLeave.className = "btn btn-danger";
		btnLeave.textContent = "Leave";
		btnLeave.addEventListener("click", () => {
			leaveGame();
		});
		divLobby.appendChild(btnLeave);

		const divPlayers = document.createElement("div");
		divPlayers.className = "col-4";
		divPlayers.id = "divPlayers";
		divLobby.appendChild(divPlayers);

		updatePlayers(_arrayPlayers);

		const divChat = document.createElement("div");
		divChat.id = "divChat";
		const chatTitle = document.createElement("h5");
		chatTitle.innerHTML = "CHAT";
		divChat.appendChild(chatTitle);
		const divChatHistory = document.createElement("div");
		divChatHistory.id = "divChatHistory";
		divChatHistory.className = "col-4";
		divChat.appendChild(divChatHistory);
		const inputMessage = document.createElement("input");
		inputMessage.id = "inputMessage";
		inputMessage.className = "col-4";
		inputMessage.placeholder = "Chat here";
		inputMessage.maxLength = 100;

		inputMessage.addEventListener("keydown", event => {
			if (inputMessage.value && event.key === "Enter") {
				const payload = {
					"method": "sendChatMessage",
					"gameId": gameId,
					"username": thisConnection.username,
					"text": inputMessage.value
				};

				ws.send(JSON.stringify(payload));
				inputMessage.value = null;
			}
		});
		divChat.appendChild(inputMessage);
		divLobby.appendChild(divChat);
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

	function showGameLayout(_items, _yourItem, _tries) {
		document.getElementById("divRoomCode").remove();

		const divGame = document.createElement("div");
		divGame.id = "divGame";
		divGame.className = "col-xl";
		document.getElementById("screen").appendChild(divGame);

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

				const spanName = document.createElement("span");
				spanName.className = "characterName";
				spanName.textContent = item.name;
				spanName.style.color = "black";
				td.addEventListener("click", () => {
					if (spanName.style.color === "black") {
						spanName.style.color = "grey";
						imgCell.style.filter = "grayscale()";
					}
					else {
						spanName.style.color = "black";
						imgCell.style.filter = null;
					}
				});
				td.appendChild(spanName);
				tr.appendChild(td);
			}

			tableBoard.appendChild(tr);
		}

		divGame.appendChild(tableBoard);

		const yourItem = document.createElement("p");
		yourItem.id = "pYourItem";
		yourItem.style = "margin-top: 2%;";
		yourItem.innerText = "Your character is " + _yourItem;
		divGame.appendChild(yourItem);

		const divGuess = document.createElement("div");
		divGuess.id = "divGuess";
		const inputGuess = document.createElement("input");
		inputGuess.id = "inputGuess";
		inputGuess.placeholder = "Type your answer here!";
		inputGuess.addEventListener("keydown", event => {
			if (inputGuess.value && event.key === "Enter") {
				guess(inputGuess.value);
				inputGuess.value = null;
			}
		});
		divGuess.appendChild(inputGuess);
		const btnGuess = document.createElement("button");
		btnGuess.id = "btnGuess";
		btnGuess.className = "btn btn-success";
		btnGuess.textContent = "Guess";
		btnGuess.addEventListener("click", () => {
			guess(inputGuess.value);
			inputGuess.value = null;
		});
		divGuess.appendChild(btnGuess);
		divGame.appendChild(divGuess);

		// Player's item to be guessed
		const pTries = document.createElement("p");
		pTries.id = "pTries";
		pTries.innerText = `Tries left: ${_tries}`;
		divGame.appendChild(pTries);
	}

	function guess(_name) {
		const payload = {
			"method": "guess",
			"gameId": gameId,
			"username": thisConnection.username,
			"guess": _name
		};

		ws.send(JSON.stringify(payload));
	}

	function showLeaderboardLayout(_data) {
		clearScreen();

		const divLeaderboardLayout = document.createElement("div");
		divLeaderboardLayout.id = "divLeaderboardLayout";
		document.getElementById("screen").appendChild(divLeaderboardLayout);

		const btnBack = document.createElement("button");
		btnBack.id = "btnBack";
		btnBack.className = "btn btn-secondary";
		btnBack.textContent = "Back";
		btnBack.addEventListener("click", () => {
			showMainMenuLayout();
		});
		divLeaderboardLayout.appendChild(btnBack);

		divLeaderboardLayout.appendChild(document.createElement("br"));
		divLeaderboardLayout.appendChild(document.createElement("br"));

		const leaderboardTitle = document.createElement("h3");
		leaderboardTitle.id = "leaderboardTitle";
		leaderboardTitle.textContent = "Top 100 Best Players by Points";
		divLeaderboardLayout.appendChild(leaderboardTitle);

		divLeaderboardLayout.appendChild(document.createElement("br"));

		const divLeaderboard = document.createElement("div");
		divLeaderboard.id = "divLeaderboard";
		divLeaderboardLayout.appendChild(divLeaderboard);

		const leaderboardTable = document.createElement("table");
		leaderboardTable.classList.add("table");
		divLeaderboard.appendChild(leaderboardTable);
		const leaderboardTableHead = document.createElement("tr");
		leaderboardTable.appendChild(leaderboardTableHead);
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "User"}));
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "Wins"}));
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "Losses"}));
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "Matches"}));
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "Win Rate"}));
		leaderboardTableHead.appendChild(Object.assign(document.createElement("th"), {className: "col", innerText: "Points"}));

		for (let user of _data) {
			const userRow = document.createElement("tr");
			leaderboardTable.appendChild(userRow);

			const tableName = document.createElement("td");
			tableName.className = "tableName";
			tableName.innerText = `${user.username}`;
			userRow.appendChild(tableName);

			const spanWins = document.createElement("td");
			spanWins.className = "spanWins";
			spanWins.innerText = `${user.wins}`;
			userRow.appendChild(spanWins);

			const spanLosses = document.createElement("td");
			spanLosses.className = "spanLosses";
			spanLosses.innerText = `${user.losses}`;
			userRow.appendChild(spanLosses);

			const spanNMatches = document.createElement("td");
			spanNMatches.className = "spanNMatches";
			spanNMatches.innerText = `${user.total}`;
			userRow.appendChild(spanNMatches);

			const spanWinRate = document.createElement("td");
			spanWinRate.className = "spanWinRate";
			spanWinRate.innerText = `${user.win_rate}%`;
			userRow.appendChild(spanWinRate);

			const spanPoints = document.createElement("td");
			spanPoints.className = "spanPoints";
			spanPoints.innerText = `${user.points}`;
			userRow.appendChild(spanPoints);

			leaderboardTable.appendChild(userRow);

		}
	}

	function getProfileInfo(_userInfo, _matchHistory) {
		const profileModalHeader = document.getElementById("profileModalHeader");
		const profileModalBody = document.getElementById("profileModalBody");

		profileModalHeader.innerHTML = null;
		profileModalBody.innerHTML = null;

		const username = _userInfo.username;
		const hModalTitle = document.createElement("h5");
		hModalTitle.className = "modal-title";
		if (thisConnection.username === _userInfo.username) hModalTitle.innerHTML = "Your Profile";
		else hModalTitle.innerHTML = `${username}'s Profile`;
		profileModalHeader.appendChild(hModalTitle);
		const btnClose = document.createElement("button");
		btnClose.type = "button";
		btnClose.className = "btn-close";
		btnClose.setAttribute("data-bs-dismiss", "modal");
		btnClose.setAttribute("aria-label", "Close");
		profileModalHeader.appendChild(btnClose);

		const html = document.createElement("div");

		const divPictureModal = document.createElement("div");
		divPictureModal.className = "divPictureModal";
		const imgPictureModal = document.createElement("img");
		imgPictureModal.className = "imgPictureModal";
		imgPictureModal.src = `https://gravatar.com/avatar/${_userInfo.email}?d=identicon`;
		divPictureModal.appendChild(imgPictureModal);
		html.appendChild(divPictureModal);

		const divStats = document.createElement("div");
		divStats.className = "divStats";
		const spanWins = document.createElement("span");
		spanWins.className = "spanWins";
		spanWins.innerHTML = `<b>Wins:</b> ${_userInfo.wins}`;
		divStats.appendChild(spanWins);

		const spanLosses = document.createElement("span");
		spanLosses.className = "spanLosses";
		spanLosses.innerHTML = `<b>Losses:</b> ${_userInfo.losses}`;
		divStats.appendChild(spanLosses);

		const spanNMatches = document.createElement("span");
		spanNMatches.className = "spanNMatches";
		spanNMatches.innerHTML = `<b>Total:</b> ${_userInfo.total}`;
		divStats.appendChild(spanNMatches);

		const spanWinRate = document.createElement("span");
		spanWinRate.className = "spanWinRate";
		spanWinRate.innerHTML = `<b>Win Rate:</b> ${_userInfo.win_rate}%`;
		divStats.appendChild(spanWinRate);

		const spanPoints = document.createElement("span");
		spanPoints.className = "spanPoints";
		spanPoints.innerHTML = `<b>Points:</b> ${_userInfo.points}`;
		divStats.appendChild(spanPoints);
		html.appendChild(divStats);

		html.appendChild(document.createElement("br"));

		const matchHistoryTitle = document.createElement("h4");
		matchHistoryTitle.id = "matchHistoryTitle";
		matchHistoryTitle.textContent = "Last 20 Matches";
		html.appendChild(matchHistoryTitle);

		html.appendChild(document.createElement("br"));

		const divMatchHistory = document.createElement("div");
		divMatchHistory.id = "divMatchHistory";
		divMatchHistory.className = "row";
		html.appendChild(divMatchHistory);

		for (let match of _matchHistory) {
			const player1Id = match.player1_id;
			const player2Id = match.player2_id;
			const player1Username = match.player1_username;
			const player2Username = match.player2_username;
			const divMatch = document.createElement("div");
			divMatch.className = "divMatch";

			const divPlayersMatch = document.createElement("div");
			divPlayersMatch.className = "divPlayersMatch";
			let color;
			if (player1Id === match.winner_id) color = "green";
			else color = "red";
			divPlayersMatch.appendChild(drawProfile("match", player1Id, player1Username, match.player1_email, match.player1_tries, color));
			const spanVS = document.createElement("span");
			spanVS.className = "vs";
			spanVS.innerHTML = "VS";
			spanVS.style.margin = "0 10px 0 10px";
			divPlayersMatch.appendChild(spanVS);
			if (player2Id === match.winner_id) color = "green";
			else color = "red";
			divPlayersMatch.appendChild(drawProfile("match", player2Id, player2Username, match.player2_email, match.player2_tries, color));
			divMatch.appendChild(divPlayersMatch);

			const spanCategory = document.createElement("span");
			spanCategory.className = "spanCategory";
			spanCategory.innerHTML = `<b>Category:</b> ${match.category_name}`;
			divMatch.appendChild(spanCategory);

			const spanDuration = document.createElement("span");
			spanDuration.className = "spanDuration";
			spanDuration.innerHTML = `<b>Duration:</b> ${new Date(match.duration).toLocaleTimeString(navigator.language, { minute: "2-digit", second: "2-digit" })}`;
			divMatch.appendChild(spanDuration);

			const spanDateTime = document.createElement("span");
			spanDateTime.className = "spanDateTime";
			spanDateTime.innerHTML = new Date(match.created_at).toLocaleDateString(navigator.language, { day: "numeric", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
			divMatch.appendChild(spanDateTime);

			divMatchHistory.appendChild(divMatch);

			if (html.lastElementChild !== divMatch) divMatchHistory.appendChild(document.createElement("br"));
		}

		profileModalBody.innerHTML = html.innerHTML;
		new bootstrap.Modal(document.getElementById("profileModal")).show();
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
		divPlayers.innerHTML = null;

		let i = 0;

		for (const player of _arrayPlayers) {
			const divPlayer = document.createElement("div");
			divPlayer.className = "player";
			const spanPlayer = document.createElement("span");
			spanPlayer.className = "clickable";
			spanPlayer.innerHTML = player.username === thisConnection.username ? "You" : player.username;
			spanPlayer.addEventListener("click", () => {
				const payload = {
					"method": "getProfile",
					"userId": player.id
				};

				ws.send(JSON.stringify(payload));
			});
			divPlayer.innerHTML = `<b>Player ${++i}: </b>`;
			divPlayer.appendChild(spanPlayer);
			divPlayers.appendChild(divPlayer);
		}

		if (_arrayPlayers[0].username === thisConnection.username) document.getElementById("btnStart").hidden = false;

		if (_arrayPlayers.length <= 1) document.getElementById("btnStart").disabled = true;
		else document.getElementById("btnStart").disabled = false;
	}

	function updateTries(_nTries) {
		const tries = document.getElementById("pTries");

		tries.innerHTML = `Tries left: ${_nTries}`;
		tries.style.color = "red";
		setTimeout(function () {
			tries.style.transition = "color 1.5s ease";
			tries.style.color = "black";
		}, 500);
	}

	function clearScreen() {
		document.getElementById("screen").innerHTML = null;
	}

	function notify(_title, _message, _redirect) {
		const header = document.getElementById("notificationModalHeader");

		header.innerHTML = null;
		document.getElementById("notificationModalBody").innerHTML = _message;

		if (_title) {
			const hModalTitle = document.createElement("h5");
			hModalTitle.className = "modal-title";
			hModalTitle.innerHTML = _title;
			header.appendChild(hModalTitle);
			const btnClose = document.createElement("button");
			btnClose.type = "button";
			btnClose.className = "btn-close";
			btnClose.setAttribute("data-bs-dismiss", "modal");
			btnClose.setAttribute("aria-label", "Close");
			header.appendChild(btnClose);
		}
		if (_redirect) document.getElementById("notificationModalButton").addEventListener("click", () => window.location.replace(domainURL));

		// eslint-disable-next-line no-undef
		new bootstrap.Modal(document.getElementById("notificationModal")).show();
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

	function profanityFilter(string) {
		let sanitizedMessage = string;

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

				if (batch.toLowerCase() === word) string = string.slice(0, i) + "*".repeat(word.length) + string.slice(i + word.length);
			}
		}

		return string;
	}

	badWords = ["anal", "anus", "arrse", "arse", "ass", "asses", "assfukka", "asshole", "assholes", "asswhole", "ballbag", "balls", "ballsack", "bastard", "beastial", "beastiality", "bellend", "bestial", "bestiality", "biatch", "bitch", "bitches", "bitchin", "bitching", "bloody", "blow job", "blowjob", "blowjobs", "boceta", "boiola", "boiolas", "bollock", "bollok", "boner", "boob", "boobs", "breasts", "bugger", "bum", "butt", "butthole", "carpet muncher", "cawk", "chink", "cipa", "clit", "clitoris", "clits", "cnut", "cock", "cockface", "cockhead", "cockmunch", "cocks", "cocksuck", "cocksuka", "cocksukka", "cok", "cokmuncher", "coksucka", "coon", "cox", "crap", "cum", "cumm", "cumming", "cummm", "cums", "cumshot", "cunilingus", "cunillingus", "cunnilingus", "cunt", "cuntlick", "cuntlicking", "cunts", "cyalis", "cyberfuc", "damn", "dick", "dildo", "dildos", "dink", "dinks", "dirsa", "doggin", "dogging", "donkeyribber", "doosh", "douche", "duche", "dyke", "ejaculate", "ejaculated", "ejaculates", "ejaculating", "ejaculatings", "ejaculation", "ejakulate", "fag", "fagging", "faggitt", "faggot", "faggs", "fagot", "fagots", "fags", "fanny", "fanyy", "fatass", "feck", "fecker", "felching", "fellate", "fellatio", "flange", "flap", "fook", "fuck", "fudge packer", "fudgepacker", "fuk", "fukk", "fukkin", "fukkk", "fuks", "fukwhit", "fukwit", "fux", "gangbang", "gangbanged", "gangbangs", "gaylord", "gaysex", "goatse", "God", "god-dam", "god-damned", "goddamn", "goddamned", "hardcoresex", "hell", "heshe", "hoar", "hoare", "hoer", "homo", "hore", "horniest", "horny", "hotsex", "jack-off", "jackoff", "jap", "jerk-off", "jism", "jiz", "jizm", "jizz", "kawk", "knob", "knobead", "knobed", "knobend", "knobhead", "knobjocky", "knobjokey", "kock", "kondum", "kondums", "kum", "kumm", "kumming", "kummm", "kums", "kunilingus", "labia", "masochist", "master-bate", "masterbate", "masterbation", "masturbate", "mo-fo", "mofo", "mothafuck", "mothafucka", "mothafuckas", "mothafuckaz", "mothafucked", "mothafuckin", "mothafucking", "mothafuckings", "mothafucks", "mother fuck", "motherfuck", "muff", "mutha", "muthafuckk", "muther", "mutherfuck", "nazi", "nigga", "niggah", "niggas", "niggaz", "nigger", "nob", "nob jokey", "nobhead", "nobjocky", "nobjokey", "numbnuts", "nutsack", "orgasim", "orgasims", "orgasm", "orgasms", "pawn", "pecker", "penis", "phonesex", "phuck", "phuk", "phuked", "phuking", "phukked", "phukking", "phuks", "phuq", "pimpis", "piss", "pissed", "pisses", "pissin", "pissing", "pissoff", "poop", "porn", "porno", "pornos", "prick", "pricks", "pube", "pusse", "pussi", "pussies", "pussy", "pussys", "rectum", "retard", "rimjaw", "rimming", "s.o.b.", "sadist", "schlong", "screwing", "scroat", "scrote", "scrotum", "semen", "sex", "shag", "shagger", "shaggin", "shagging", "shemale", "shit", "skank", "slut", "sluts", "smegma", "smut", "snatch", "son-of-a-bitch", "spac", "spunk", "teets", "teez", "testical", "testicle", "tit", "tits", "tittie", "titty", "tittywank", "titwank", "tosser", "turd", "twat", "twathead", "twatty", "twunt", "vagina", "viagra", "vulva", "wang", "wank", "wanky", "whoar", "whore", "willies", "willy", "xrated", "xxx", "2girls1cup", "arbeit macht frei", "ausschwitz", "buttfucker", "cock sucker", "cocksucker", "comepollas", "drecksjude", "endl sung", "falangista", "fils de pute", "gilipollas", "grosse", "hacer un dedo", "hacerse una paja", "hago una paja", "heil hitler", "hice un dedo", "ijosdeputa", "jilipollas", "judenmutter", "masturbaci", "masturbacion", "masturbarse", "me la pela", "me la suda", "merde", "mierdecilla", "motherfucker", "motherfucking", "pierdol", "pierdoli&h107", "pierdolona", "prostituir", "przejebane", "raecarruth", "rassenlehre", "reichskristall", "reisfresser", "rozpierdala", "rozpierdala&h107", "rozpierdolone", "rozpierdolony", "rucha&h107", "sackgesicht", "sado-masochistic", "sadomasochistic", "sadomasoquismo", "sadomasoquista", "samckdaddy", "sandnigger", "sauhund", "sausagejockey", "schlitzauge", "schutzstaffel", "schwuchtel", "shadybackroomdealings", "shadydealings", "shawtypimp", "sheep-l0ver", "sheep-l0vers", "sheep-lover", "sheep-lovers", "sheep-shaggers", "sheepl0ver", "sheepl0vers", "sheeplover", "sheepshaggers", "sheetheads", "shit4brains", "shitbagger", "shitbrains", "shitbreath", "shitfaced", "shitforbrains", "shitfucker", "shithapens", "shithappens", "shitings", "shitoutofluck", "shitspitter", "shitstabber", "shitstabbers", "sinnfein's", "slanderyou2.blogspot.com", "smackdaddy", "smackthemonkey", "snortingcoke", "sonofabitch", "sonofbitch", "soplapollas", "spunkbubble", "subnormales", "te faire enculer", "wyjeb&h107", "zajeba&h107"]
}

main();