// Bruger grænseflade
"use strict";

const NIVEAUER = {
	beginner: { 
		navn: "Let", 
		rows: 9, 
		cols: 9, 
		mines: 10 
	},
	intermediate: { 
		navn: "Mellem", 
		rows: 16, 
		cols: 16, 
		mines: 40 
	},
	expert: { 
		navn: "Svær", 
		rows: 16, 
		cols: 30, 
		mines: 99 
	}
};

// Variabler, som bruges flere steder i programmet
let board;
let niveau;
let spilTilstand = "klar"; // "klar", "spiller" eller "slut"
let tidsgraenseMs = 0;
let startTidspunkt = 0;
let timerId = null;
let bruger = sessionStorage.getItem("bruger");
let rekorder = null;

// Viser tid i sekunder med komma som decimalseparator
function formaterTid(millisekunder, antalDecimaler) {
	return (millisekunder / 1000).toFixed(antalDecimaler).replace(".", ",");
}


// ---------- Spillet ----------

function nytSpil() {
	stopTimer();

	niveau = document.getElementById("niveau").value;
	tidsgraenseMs = Number(document.getElementById("tidsgraense").value) * 1000;

	const indstillinger = NIVEAUER[niveau];
	board = new Board(indstillinger.rows, indstillinger.cols, indstillinger.mines);
	spilTilstand = "klar";

	document.getElementById("tid").textContent = "0,0";
	document.getElementById("nedtaellingBoks").hidden = tidsgraenseMs === 0;
	document.getElementById("nedtaelling").textContent = formaterTid(tidsgraenseMs, 1);
	document.getElementById("smiley").textContent = "🙂";
	document.getElementById("besked").textContent = "";

	tegnBraet();
	visRekorder();
}

// Opretter knapperne på spillebrættet
function tegnBraet() {
	const braet = document.getElementById("braet");
	braet.innerHTML = "";

	// Tilpas felterne til bredden på spilområdet
	const bredde = document.getElementById("spilomraade").clientWidth - 16;
	const celleStoerrelse = Math.floor(bredde / board.cols);
	const celle = Math.max(22, Math.min(32, celleStoerrelse));

	braet.style.gridTemplateColumns = "repeat(" + board.cols + ", " + celle + "px)";

	for (let række = 0; række < board.rows; række++) {
		for (let kolonne = 0; kolonne < board.cols; kolonne++) {
			const knap = document.createElement("button");

			knap.className = "celle";
			knap.dataset.r = række;
			knap.dataset.c = kolonne;
			knap.style.height = celle + "px";
			knap.style.fontSize = Math.round(celle * 0.5) + "px";

			braet.appendChild(knap);
		}
	}
	opdaterBraet();
}

// Opdaterer felternes udseende
function opdaterBraet() {
	const knapper = document.getElementById("braet").children;

	for (let i = 0; i < knapper.length; i++) {
		const knap = knapper[i];

		const række = Number(knap.dataset.r);
		const kolonne = Number(knap.dataset.c);

		const celle = board.grid[række][kolonne];

		if (celle.revealed && celle.mine) {
			knap.className = "celle aaben mine";
			knap.textContent = "💣";
		} else if (celle.revealed) {
			knap.className = "celle aaben n" + celle.adjacent;
			if (celle.adjacent > 0) {
				knap.textContent = celle.adjacent;
			} else {
				knap.textContent = "";
			}
		} else if (celle.flagged) {
			knap.className = "celle";
			knap.textContent = "🚩";
		} else {
			knap.className = "celle";
			knap.textContent = "";
		}
	}

	document.getElementById("mineTaeller").textContent = board.mines - board.flagsUsed;
}

// Venstreklik åbner et felt
function klik(event) {
	const knap = event.target.closest(".celle");

	if (!knap || spilTilstand === "slut") {
		return;
	}

	const række = Number(knap.dataset.r);
	const kolonne = Number(knap.dataset.c);

	if (board.grid[række][kolonne].flagged) {
		return;
	}

	// Timeren starter ved spillerens første gyldige klik
	if (spilTilstand === "klar") {
		spilTilstand = "spiller";
		startTimer();
	}

	const resultat = board.reveal(række, kolonne);

	if (resultat === "mine") {
		tab("Du ramte en mine 💥");
	} else if (board.won) {
		vind();
	}
	opdaterBraet();
}

// Højreklik sætter eller fjerner et flag
function hoejreklik(event) {
	const knap = event.target.closest(".celle");

	if (!knap) {
		return;
	}

	event.preventDefault();

	if (spilTilstand === "slut") {
		return;
	}

	const række = Number(knap.dataset.r);
	const kolonne = Number(knap.dataset.c);

	board.toggleFlag(række, kolonne);

	opdaterBraet();
}

// Spilleren har tabt
function tab(besked) {
	spilTilstand = "slut";

	stopTimer();
	board.revealMines();
	opdaterBraet();

	document.getElementById("smiley").textContent = "😵";
	document.getElementById("besked").textContent = besked + " Tryk på smileyen for at prøve igen.";
}

// Spilleren har vundet
function vind() {
	spilTilstand = "slut";

	const brugtTidMs = stopTimer();

	document.getElementById("smiley").textContent = "😎";
	document.getElementById("besked").textContent = "Du vandt på " + formaterTid(brugtTidMs, 2) + " sekunder! 🎉";

	if (bruger) {
		gemTid(brugtTidMs);
	} else {
		document.getElementById("besked").textContent += " Log ind for at gemme dine tider.";
	}
}


// ---------- Tidtagning ----------

function startTimer() {
	startTidspunkt = performance.now();
	timerId = setInterval(opdaterTid, 100);
}

function stopTimer() {
	if (timerId === null) {
		return 0;
	}

	clearInterval(timerId);
	timerId = null;

	const brugtTidMs = Math.round(performance.now() - startTidspunkt);

	document.getElementById("tid").textContent = formaterTid(brugtTidMs, 1);

	return brugtTidMs;
}

// Opdaterer tiden hvert 100 millisekund
function opdaterTid() {
	const brugtTidMs = performance.now() - startTidspunkt;

	document.getElementById("tid").textContent = formaterTid(brugtTidMs, 1);

	if (tidsgraenseMs > 0) {
		const tidTilbageMs = Math.max(0, tidsgraenseMs - brugtTidMs);

		document.getElementById("nedtaelling").textContent = formaterTid(tidTilbageMs, 1);

		if (tidTilbageMs === 0) {
			tab("Tiden løb ud ⏳");
		}
	}
}


// ---------- Login og rekorder ----------

// Bruges både til login og oprettelse af en bruger
async function login(sti) {
	try {
		const svar = await api(sti, {
			username: document.getElementById("brugernavn").value,
			password: document.getElementById("kodeord").value
		});

		bruger = svar.username;
		rekorder = svar.scores;

		sessionStorage.setItem("bruger", bruger);

		document.getElementById("kodeord").value = "";
		document.getElementById("loginFejl").textContent = "";

		visBruger();
	} catch (fejl) {
		document.getElementById("loginFejl").textContent = fejl.message;
	}
}

// Logger brugeren ud
function logUd() {
	bruger = null;
	rekorder = null;

	sessionStorage.removeItem("bruger");

	visBruger();
}

// Gemmer en vundet tid på serveren
async function gemTid(tidMs) {
	try {
		const svar = await api("/api/scores", {
			username: bruger,
			level: niveau,
			timeMs: tidMs
		});

		rekorder = svar.scores;

		visRekorder();

		if (svar.placement === 1) {
			document.getElementById("besked").textContent += " 🏆 Ny rekord!";
		} else if (svar.placement > 1) {
			document.getElementById("besked").textContent += " Nr. " + svar.placement + " på din top 3.";
		}
	} catch (fejl) {
		document.getElementById("besked").textContent += " Tiden kunne ikke gemmes: " + fejl.message;
	}
}

// Henter brugerens rekorder fra serveren
async function hentRekorder() {
	try {
		const svar = await api("/api/scores?user=" + encodeURIComponent(bruger));

		rekorder = svar.scores;

		visRekorder();
	} catch (fejl) {
		logUd(); // Brugeren findes ikke længere på serveren
	}
}

// Viser eller skjuler login afhængigt af brugerens status
function visBruger() {
	if (bruger) {
		document.getElementById("loginForm").hidden = true;
		document.getElementById("loggetInd").hidden = false;
	} else {
		document.getElementById("loginForm").hidden = false;
		document.getElementById("loggetInd").hidden = true;
	}

	document.getElementById("brugerNavn").textContent = bruger || "";

	visRekorder();
}

// Viser de tre bedste tider for den valgte sværhedsgrad
function visRekorder() {
	const liste = document.getElementById("rekordListe");

	liste.innerHTML = "";

	document.getElementById("rekordNiveau").textContent = NIVEAUER[niveau].navn;

	if (!bruger) {
		document.getElementById("rekordInfo").textContent = "Log ind for at gemme dine tider.";
		return;
	}

	let tider = [];

	if (rekorder && rekorder[niveau]) {
		tider = rekorder[niveau];
	}

	if (tider.length === 0) {
		document.getElementById("rekordInfo").textContent = "Ingen tider endnu – vind et spil!";
	} else {
		document.getElementById("rekordInfo").textContent = "";
	}

	for (let i = 0; i < tider.length; i++) {
		const tid = tider[i];

		const listeElement = document.createElement("li");
		const tidElement = document.createElement("strong");
		const datoElement = document.createElement("span");

		const dato = new Date(tid.date);

		tidElement.textContent = formaterTid(tid.timeMs, 2) + " s";

		datoElement.textContent = dato.toLocaleString("da-DK", {
			dateStyle: "medium",
			timeStyle: "short"
		});

		listeElement.appendChild(tidElement);
		listeElement.appendChild(datoElement);
		liste.appendChild(listeElement);
	}
}


// ---------- Event listeners ----------

// Spilbrættet
document.getElementById("braet").addEventListener("click", klik);
document.getElementById("braet").addEventListener("contextmenu", hoejreklik);

// Start et nyt spil
document.getElementById("smiley").addEventListener("click", nytSpil);
document.getElementById("nytSpilKnap").addEventListener("click", nytSpil);

// Skift sværhedsgrad eller tidsgrænse
document.getElementById("niveau").addEventListener("change", nytSpil);
document.getElementById("tidsgraense").addEventListener("change", nytSpil);

// Login
document.getElementById("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();

  login("/api/login");
});

// Opret bruger
document.getElementById("opretKnap").addEventListener("click", function () {
  login("/api/register");
});

// Log ud
document.getElementById("logUdKnap").addEventListener("click", logUd);


// ---------- Start ----------

nytSpil();
visBruger();

if (bruger) {
	hentRekorder();
}