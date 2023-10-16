import categories from "../categories.json";

const items = categories.people;

function makeBoard() {
	const cells = document.getElementById("table").querySelectorAll("button");

	for (let i = 0; i < items.length; i++) {
		cells[i].textContent = items[i];
	}

	// const answer = document.getElementById("myAnswer").innerText = items[Math.floor(Math.random() * names.length)];
}

/*function toggleUpDown(id) {
	if (document.getElementById(id).style.color == "limegreen") document.getElementById(id).style.color = "red";
	else document.getElementById(id).style.color = "limegreen";
}*/

makeBoard();