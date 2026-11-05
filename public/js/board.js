// Selve spille logikken
"use strict";

class Cell {
	mine = false;
	revealed = false;
	flagged = false;
	adjacent = 0; // antal miner i nabofelterne
}

class Board {
	#minesPlaced = false;

	constructor(rows, cols, mines) {
		this.rows = rows;
		this.cols = cols;
		this.mines = mines;
		this.revealedCount = 0;
		this.grid = [];
		for (let r = 0; r < rows; r++) {
			this.grid.push([]);
			for (let c = 0; c < cols; c++) {
				this.grid[r].push(new Cell());
			}
		}
	}

	// Alle (op til 8) nabofelter til (r, c)
	neighbours(r, c) {
		const list = [];
		for (let dr = -1; dr <= 1; dr++) { // offset omkring cellen der blev klikket
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0) continue;
		
				const nr = r + dr;
				const nc = c + dc;
				if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) { // hvis nabofelterne er inde i spillebrættet
					list.push([nr, nc]);
				}
			}
		}
		return list;
	}

	// Minerne placeres efter første klik, så det første felt og naboerne altid er sikre
	placeMines(safeR, safeC) {
		let placed = 0;
	
		while (placed < this.mines) {
			const r = Math.floor(Math.random() * this.rows);
			const c = Math.floor(Math.random() * this.cols);
	  
			const nearFirstClick = 
				Math.abs(r - safeR) <= 1 && 
				Math.abs(c - safeC) <= 1;
		
			if (!this.grid[r][c].mine && !nearFirstClick) { // Hvis feltet ikke allerede er en mine eller i nærheden af first click
				this.grid[r][c].mine = true;
				placed++;
			}
		}
	
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				for (const [nr, nc] of this.neighbours(r, c)) { // Loop igennem listen af nabofelter i hver celle
					if (this.grid[nr][nc].mine) {
						this.grid[r][c].adjacent++; // Tæller antal miner i nabofelterne
					}
				}
			}
		}
		this.#minesPlaced = true;
	}

	// Afdækker et felt og returnerer "mine" eller "ok"
	reveal(r, c) {
		if (!this.#minesPlaced) {
			this.placeMines(r, c);
		}
	
		const cell = this.grid[r][c];
		if (cell.flagged || cell.revealed) {
			return "ok";
		}
		if (cell.mine) {
			cell.revealed = true;
			return "mine";
		}
		// Felter uden nabominer åbner deres naboer.
		const stack = [[r, c]];
		while (stack.length > 0) { // Så længe stacken ikke a tom
			const [cr, cc] = stack.pop(); // Fjerne nuværende felt fra stacken
			const current = this.grid[cr][cc];
			if (current.revealed || current.flagged) continue; // Spring over felter der er revealed eller flagged
			current.revealed = true;
			this.revealedCount++;
	  
			// Hvis feltet ikke har miner i nabofelterne, så læg nabo felterne til stacken, gentag indtil stacken er tom.
			if (current.adjacent === 0) {
				stack.push(...this.neighbours(cr, cc));
			}
		}
		return "ok";
	}

	toggleFlag(r, c) {
		const cell = this.grid[r][c];
		if (!cell.revealed) {
			cell.flagged = !cell.flagged;
		}
	}

	revealMines() {
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell.mine) {
					cell.revealed = true;
				}
			}
		}
	}

	get flagsUsed() {
		let n = 0;
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell.flagged) {
					n++;
				}
			}
		}
		return n;
	}

	get won() {
		return this.revealedCount === this.rows * this.cols - this.mines;
	}
}