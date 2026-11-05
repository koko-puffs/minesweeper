// Sender data til serveren og får JSON tilbage
"use strict";

async function api(sti, data) {
	const options = data ? { 
		method: "POST", 
		headers: { "Content-Type": "application/json" }, 
		body: JSON.stringify(data) 
	} : {};
	let svar;
	try {
		svar = await fetch(sti, options);
	} catch {
		throw new Error("Kan ikke nå serveren. Kører server.js?");
	}
	const indhold = await svar.json();
	if (!svar.ok) {
		throw new Error(indhold.error);
	}
	return indhold;
}