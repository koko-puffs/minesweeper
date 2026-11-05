// Serverer filerne i /public og et lille JSON-API.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const PUBLIC = path.join(__dirname, "public");
const DB_FIL = path.join(__dirname, "data", "users.json");
const NIVEAUER = ["beginner", "intermediate", "expert"];
const TYPER = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };

let db = { users: {} };

// ---------- Data (gemmes i data/users.json) ----------

async function indlæsDb() {
	try {
		db = JSON.parse(await fs.promises.readFile(DB_FIL, "utf-8"));
	} catch {
		await gemDb(); // filen findes ikke endnu
	}
}

async function gemDb() {
	await fs.promises.mkdir(path.dirname(DB_FIL), { recursive: true });
	await fs.promises.writeFile(DB_FIL, JSON.stringify(db, null, 2));
}

// ---------- Hjælpefunktioner ----------

function læsBody(req) {
	return new Promise(function (resolve, reject) {
		const chunks = [];
		req.on("data", function (chunk) { chunks.push(chunk); });
		req.on("end", function () {
			try { 
				resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); 
			} catch (fejl) { 
				reject(fejl); 
			}
		});
	});
}

function sendJson(res, status, data) {
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(data));
}

// Kodeord gemmes som en SHA-256 hash
function hash(kodeord) {
	return crypto.createHash("sha256").update(kodeord).digest("hex");
}

// ---------- API ----------

async function håndterApi(req, res, url) {
	const body = req.method === "POST" ? await læsBody(req) : {};
	const brugernavn = String(body.username ?? url.searchParams.get("user") ?? "").trim();
	const nøgle = brugernavn.toLowerCase();
	const bruger = db.users[nøgle];

	// Opret bruger
	if (req.method === "POST" && url.pathname === "/api/register") {
		if (brugernavn.length < 3 || brugernavn.length > 16) {
			return sendJson(res, 400, { error: "Brugernavnet skal være 3-16 tegn" });
		}
		if (String(body.password ?? "").length < 4) {
			return sendJson(res, 400, { error: "Kodeordet skal være mindst 4 tegn" });
		}
		if (bruger) {
			return sendJson(res, 409, { error: "Brugernavnet er taget" });
		}
		db.users[nøgle] = { name: brugernavn, password: hash(body.password), scores: { beginner: [], intermediate: [], expert: [] } };
		await gemDb();
		return sendJson(res, 201, { 
			username: brugernavn, 
			scores: db.users[nøgle].scores 
		});
	}

	// Log ind
	if (req.method === "POST" && url.pathname === "/api/login") {
		if (!bruger || bruger.password !== hash(String(body.password ?? ""))) {
			return sendJson(res, 401, { error: "Forkert brugernavn eller kodeord" });
		}
		return sendJson(res, 200, { 
			username: bruger.name, 
			scores: bruger.scores 
		});
	}

	// Hent en spillers tider
	if (req.method === "GET" && url.pathname === "/api/scores") {
		if (!bruger) {
			return sendJson(res, 404, { error: "Ukendt bruger" });
		}
		return sendJson(res, 200, { 
			username: bruger.name, 
			scores: bruger.scores 
		});
	}

	// Gem en vundet tid
	if (req.method === "POST" && url.pathname === "/api/scores") {
		const tidMs = Number(body.timeMs);
		if (!bruger || !NIVEAUER.includes(body.level) || !(tidMs > 0)) {
			return sendJson(res, 400, { error: "Ugyldig score" });
		}
		const liste = bruger.scores[body.level];
		const ny = { timeMs: tidMs, date: new Date().toISOString() };
		liste.push(ny);
		liste.sort(function (a, b) { return a.timeMs - b.timeMs; });
		liste.splice(3);
		await gemDb();
		return sendJson(res, 200, { 
			scores: bruger.scores, 
			placement: liste.indexOf(ny) + 1 
		}); // 0 = ikke top 3
	}

	sendJson(res, 404, { error: "Ukendt adresse" });
}

// ---------- Statiske filer ----------

async function sendFil(res, url) {
	const filSti = path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
	try {
		const data = await fs.promises.readFile(filSti);
		res.writeHead(200, { "Content-Type": TYPER[path.extname(filSti)] ?? "text/plain" });
		res.end(data);
	} catch {
		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Ikke fundet");
	}
}

// ---------- Server ----------

const server = http.createServer(async function (req, res) {
	const url = new URL(req.url, "http://localhost");
	try {
		if (url.pathname.startsWith("/api/")) {
			await håndterApi(req, res, url);
		} else {
			await sendFil(res, url);
		}
	} catch (fejl) {
		console.error(fejl);
		sendJson(res, 500, { error: "Serverfejl" });
	}
});

indlæsDb().then(function () {
	server.listen(PORT, function () {
		console.log(`Minesweeper kører på http://localhost:${PORT}`);
	});
});