import seedRandom from "seedrandom";
import { GameMode, ms } from "./enums";
import wordList from "./words_5";

export const ROWS: number = 6;
export const COLS: number = 5;
export let app: GameState;
export let botRoot: BotNode;

export let appSettings: Settings;

export const words = {
	...wordList,
	contains: (word: string) => {
		return wordList.answers.includes(word) || wordList.otherGuesses.includes(word);
	},
};

export function countOfAinB(a: string, b: string): number {
	return b.split(a).length - 1;
}

/** Returns groupId string with # = green, $ = yellow, and - = blank. */
export function calculateGroupId(key: string, test: string): string {
	let yi: number;
	/** Array of possible yellow test leters. */
	let yKey: Array<string> = [...key]; 
	/** Array of possible yellow test leters. */
	let yTest: Array<[number, string]> = []; 
	let groupId = Array<string>(COLS).fill("-");

	// Loop through the test and key words backwards
	// so that, even as letters are removed from
	// the yKey array, yKey[i] is still equal to key[i]
	// (for the letters still to be tested).
	for (let i = COLS - 1; i >= 0; i--) {
		if (test[i] === key[i]) {
			groupId[i] = "#"; // set groupId[i] = green letter
			yKey.splice(i, 1); // remove letter i from the yKey array
		} else yTest.push([i, test[i]]);
	}

	for (let i = 0; i < yTest.length; i++) {
		yi = yKey.indexOf(yTest[i][1]);
		if (yi >= 0) {
			groupId[yTest[i][0]] = "$"; // set found char in groupId to yellow
			yKey.splice(yi, 1); // remove letter yi from the yKey array
		}
	}
	return groupId.join("");
}

export function contractNum(n: number) {
	switch (n % 10) {
		case 1: return `${n}st`;
		case 2: return `${n}nd`;
		case 3: return `${n}rd`;
		default: return `${n}th`;
	}
}

export const keys = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/**
 * Return a deterministic number based on the given 
 * mode and current or given time.
 * @param mode - The mode
 * @param time - The time. If omitted current time is used
 */
export function newSeed(mode: GameMode, time?: number) {
	const now = time ?? Date.now();
	switch (mode) {
		case GameMode.daily:
			// Adds time zone offset to UTC time, calculates how many days that falls after 1/1/1970
			// and returns the unix time for the beginning of that day.
			return Date.UTC(1970, 0, 1 + Math.floor((now - (new Date().getTimezoneOffset() * ms.MINUTE)) / ms.DAY));
		case GameMode.hourly:
			return now - (now % ms.HOUR);
		// case GameMode.minutely:
		// 	return now - (now % ms.MINUTE);
		case GameMode.infinite:
			return now - (now % ms.SECOND);
		case GameMode.ai:
			return now - (now % ms.SECOND);
		}
}

export const modeData: ModeData = {
	default: GameMode.daily,
	modes: [
		{
			name: "Daily",
			unit: ms.DAY,
			start: 1642370400000,	// 17/01/2022 UTC+2
			seed: newSeed(GameMode.daily),
			historical: false,
			streak: true,
			useTimeZone: true,
		},
		{
			name: "Hourly",
			unit: ms.HOUR,
			start: 1642528800000,	// 18/01/2022 8:00pm UTC+2
			seed: newSeed(GameMode.hourly),
			historical: false,
			streak: true,
		},
		{
			name: "Infinite",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
			streak: true,
		},
		{
			name: "AI",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
			streak: true,
		},
		{
			name: "Solver",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
			streak: true,
		},
		// {
		// 	name: "Minutely",
		// 	unit: ms.MINUTE,
		// 	start: 1642528800000,	// 18/01/2022 8:00pm
		// 	seed: newSeed(GameMode.minutely),
		// 	historical: false,
		// 	icon: "m7,200v-200l93,100l93,-100v200",
		// 	streak: true,
		// },
	]
};
/**
 * Return the word number for the given mode at the 
 * time that that mode's seed was set.
 * @param mode - The game mode
 * @param current - If true the word number will be for 
 * the current time rather than for the current
 * seed for the given mode. Useful if you want the current 
 * game number during a historical game.
 */
export function getWordNumber(mode: GameMode, current?: boolean) {
	const seed = current ? newSeed(mode) : modeData.modes[mode].seed;
	return Math.round((seed - modeData.modes[mode].start) / modeData.modes[mode].unit) + 1;
}

export function seededRandomInt(min: number, max: number, seed: number) {
	const rng = seedRandom(`${seed}`);
	return Math.floor(min + (max - min) * rng());
}

export const DELAY_INCREMENT = 200;

export const PRAISE = [
	"Genius",
	"Magnificent",
	"Impressive",
	"Splendid",
	"Great",
	"Phew",
];

abstract class Storable {
	toString() { return JSON.stringify(this); }
}

/** groupsIdFromColors( rowIndex ) returns [ groupId, errorIndex ]. */
export function groupIdFromColors(ri: number): 
	[ string, number ] {
	const state = app.board.state[ri];
	const id = Array<string>(COLS).fill(" ");
	let errorIndex = -1; // -1 means no failure.
	for (let c =0; c < COLS; c++) {
		switch (state[c]) {
			case "⬛": id[c] = "-"; break; // blank tile
			case "🟨": id[c] = "$"; break; // yellow tile
			case "🟩": id[c] = "#"; break; // green tile
		}
	}
	errorIndex = id.indexOf(" ");
	// console.log("groupIdFromRow:", id, errorIndex);
	return [id.join(""), errorIndex];
}

/** colorArray returns the color pattern of a groupId. */
export function colorArray(groupId: string): LetterState[] {
	const p = Array<LetterState>(COLS).fill("⬛");
	for (let c =0; c < COLS; c++) {
		switch (groupId[c]) {
			case "$": p[c] = "🟨"; break; // yellow tile
			case "#": p[c] = "🟩"; break; // green tile
		}
	}
	return p;
}

/** colorString returns the color pattern of a groupId. */
export function colorString(groupId: string): string {
	return colorArray(groupId).join("");
}

/** easyOrHard(guess, ri) returns "Easy" or "Hard" for
 * the guess of the row with row index ri. 
 * Note. This easyOrHard function does not work for any 
 * BotNode whose parent is not on the human tree.*/
export function easyOrHard(guess: string, ri: number) {
	if (ri === 0) return "Hard";
	if (calculateGroupId(guess, app.guesses[ri-1]) === app.guessGroupIds[ri-1] ) {
		return "Hard";
	} else {
		return "Easy";
	}
}

export function randomSample(anArray: Array<any>) {
	let i: number = Math.random() * anArray.length;
	let [rs] = anArray.splice(i, 1);
	// console.log("randomSample", rs, anArray);
	return rs;
}

export enum GameStatus {
	"active",
	"won",
	"lost",
};

export class GameState extends Storable {
	public status: GameStatus;
	/** Number of completely crunched guesses. */
	public nGuesses: number;
	public validHard: boolean;
	public time: number;
	public solutionNumber: number;
	public solution: string;
	public board: GameBoard;
	/** Space separated list of top 12 New York Times 
	 * WordleBot openers (each with 97+ NYT WordleBot score). */
	public openers = "trace crane slate crate plate saint least stare stale snare plane place";
	// Bot scores: trace 2165, crane 2173, slate 2168, crate 2167, plate 2184,
	// saint 2186, least 2175, stare 2182, stale 2173, snare 2183, plane 2183, place 2187
	public errorString: string = "";
	public botTreeNodes: Array<string> = [];
	public nBotTreeLeaves: number = 0;
	/** Incremented each time a new BotNode is created.
	 * calculateGroups() is usually performed once per new node.
	 */
	public nNodesCreated: number = 0;
	public nBotTreeNodes: number = 0;
	public easyGroup: Array<string>;

	#valid = false;
	mode: GameMode;

	/** These are the Bot Row Arrays and their modes. */
	public human: Array<BotNode>;
	public aiMaxGroupsHard: Array<BotNode>;
	public aiMaxGroupsEasy: Array<BotNode>;
	public aiMinSumOfSquaresHard: Array<BotNode>;
	public aiMinSumOfSquaresEasy: Array<BotNode>;
	public botLeftMode: BotMode;
	public botRightMode: BotMode;
	
	/** guesses[rowIndex]. 
	 * Array of each row's guess. 
	 * guesses is an alias for board.words. */
	public guesses = Array<string>(ROWS+1).fill("");
	/** guessGroupIds[rowIndex]. 
	 * GroupId of the row's guess. */
	public guessGroupIds = Array<string>(ROWS+1).fill("");

	constructor(mode: GameMode, data?: string) {
		super();
		this.mode = mode;
		// if (data) {
		// 	this.parse(data);
		// }
		if (!this.#valid) {
			this.status = GameStatus.active;
			this.nGuesses = 0;
			this.validHard = true;
			this.time = modeData.modes[mode].seed;
			this.solutionNumber = getWordNumber(mode);
			let solutionIndex = seededRandomInt(0, words.answers.length, this.time);
			this.solution = words.answers[solutionIndex];
			this.board = {
				guesses: Array(ROWS).fill(""),
				state: Array.from({ length: ROWS }, () => (Array(COLS).fill("🔳"))),
			};

			this.guesses = this.board.guesses;
			this.#valid = true;

			if (mode === GameMode.solver) {
				this.board.state[0].fill("⬛");
				this.solution = "";
			}
		}
		this.errorString = "";
		this.botLeftMode = BotMode.Human;
		this.botRightMode = BotMode["Bot Max Groups Easy"];
		this.aiMaxGroupsHard = [];
		this.aiMaxGroupsEasy = [];
		this.aiMinSumOfSquaresHard = [];
		this.aiMinSumOfSquaresEasy = [];
	
		app = this;
		console.log("app = new GameState:", app);
	}

	get latestWord() { return this.board.guesses[this.nGuesses]; }

	get lastState() { return this.board.state[this.nGuesses - 1]; }

	get lastWord() { return this.board.guesses[this.nGuesses - 1]; }

	get active() { return this.status === GameStatus.active; }

	/** The Bot processes the latest human guess
	 *  and searches for its next guess. */
	updateBot() {
		// Set ri for this guess.
		let ri = this.nGuesses;
		let guess = this.guesses[ri];

		// Initialize guessGroupIds[ri]
		if ( this.mode !== GameMode.solver) {
			this.guessGroupIds[ri] = calculateGroupId(this.solution, guess);
		}

		if (ri === 0) {
			/** Calculate Bot Tree and initialize the human and ai BotNode arrays. */
			this.human = [];
			this.aiMaxGroupsHard = [];
			this.aiMaxGroupsEasy = [];
			this.aiMinSumOfSquaresHard = [];
			this.aiMinSumOfSquaresEasy = [];
			calculateBotTree(app.board.guesses[0], app.guessGroupIds[0]);
			this.human.push(botRoot);
			this.aiMaxGroupsHard.push(botRoot);
			this.aiMaxGroupsEasy.push(botRoot);
			this.aiMinSumOfSquaresHard.push(botRoot);
			this.aiMinSumOfSquaresEasy.push(botRoot);
			if (this.guessGroupIds[0] !== "#####") {
				let gang: GangTuple;
				if ( app.mode === GameMode.solver ) {
					gang = this.human[0].gangs.get(app.guessGroupIds[0]);
					this.aiMaxGroupsHard.push(gang[2]);
					this.aiMaxGroupsEasy.push(gang[3]);
					this.aiMinSumOfSquaresHard.push(gang[4]);
					this.aiMinSumOfSquaresEasy.push(gang[5]);
				} else {
					let i = 0;
					while (true) {
						gang = this.aiMaxGroupsHard[i].gangs.get(calculateGroupId(this.solution, this.aiMaxGroupsHard[i].guess));
						if (gang[2] === null) break;
						else this.aiMaxGroupsHard.push(gang[2]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMaxGroupsEasy[i].gangs.get(calculateGroupId(this.solution, this.aiMaxGroupsEasy[i].guess));
						if (gang[3] === null) break;
						else this.aiMaxGroupsEasy.push(gang[3]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMinSumOfSquaresHard[i].gangs.get(calculateGroupId(this.solution, this.aiMinSumOfSquaresHard[i].guess));
						if (gang[4] === null) break;
						else this.aiMinSumOfSquaresHard.push(gang[4]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMinSumOfSquaresEasy[i].gangs.get(calculateGroupId(this.solution, this.aiMinSumOfSquaresEasy[i].guess));
						if (gang[5] === null) break;
						else this.aiMinSumOfSquaresEasy.push(gang[5]);
						i++;
					}
				}	
			}
		} else {
			// Find or create this human guess in the bot tree.
			let pGang: GangTuple;
			pGang = this.human[ri-1].gangs.get(this.guessGroupIds[ri-1]);
			let pGroup = pGang[0];
			if (guess === pGang[2].guess) this.human.push(pGang[2]);
			else if (guess === pGang[3].guess) this.human.push(pGang[3]);
			else if (guess === pGang[4].guess) this.human.push(pGang[4]);
			else if (guess === pGang[5].guess) this.human.push(pGang[5]);
			else {
				// Guess BotNode not found.
				// Thus create new BotNode for the guess 
				// and create kids for the new BotNode.
				let gangs = calculateGroups(guess, pGroup);
				if (gangs.get(this.guessGroupIds[ri]) === undefined) {
					this.errorString =`No possible solutions left. Did you enter ` +
					`some color(s) wrong? Or perhaps the other Wordle's solution ` + 
					`dictionary is not the same as mine. Click the refresh icon ` +
					`to try again.`;
					let e = new Error('updateBot: No possible solutions left.');
					app.status = GameStatus.lost; // Abort the game.
					throw e; 		
				}
				this.human.push(new BotNode( [this.human[ri-1], this.guessGroupIds[ri-1], pGang], ri, guess, gangs));
				createKids(this.human[ri]);
			}
		}

		if (this.guessGroupIds[ri] === "#####") {
			this.status = GameStatus.won;
			this.solution = this.guesses[ri]; // needed for solver mode
		} else if (this.nGuesses === (ROWS - 1)) this.status = GameStatus.lost;

		if (!this.active) {

			console.log(`easyGroup.length: ${this.easyGroup.length}.`);
			this.human.forEach ( (bn, bni) => {
				console.log("human:", this.guessGroupIds[bni], bn);
				// if (bni > 0) console.log(`${bn.guess} parent ${bn.parent[0].guess} with kids: ${bn.parent[2][2].guess}, ${bn.parent[2][3].guess}, ${bn.parent[2][4].guess}, ${bn.parent[2][5].guess}`);
			});
			console.log("GameState:", this);
			console.log("botRoot:", botRoot);
		}

		app.nGuesses++;
		app = this; // tell svelte to react to change in app
	}

	/**
	* Returns an object containing the position of the 
	* character in the latest word that violates
	* hard mode, and what type of violation it is, 
	* if there is a violation.
	*/
	checkHardMode(): HardModeData {
		let ri = this.nGuesses - 1;
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[ri][i] === "🟩" && this.board.guesses[ri][i] !== this.board.guesses[this.nGuesses][i]) {
				return { pos: i, char: this.board.guesses[ri][i], type: "🟩" }; // green tile
			}
		}
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[ri][i] === "🟨" && !this.board.guesses[this.nGuesses].includes(this.board.guesses[ri][i])) {
				return { pos: i, char: this.board.guesses[ri][i], type: "🟨" }; // yellow tile
			}
		}
		return { pos: -1, char: "", type: "⬛" };
	}

	guess(solution: string): LetterState[] {
		return colorArray(calculateGroupId(solution, this.latestWord));
	}

	private parse(str: string) {
		const parsed = JSON.parse(str) as GameState;
		if (parsed.solutionNumber !== getWordNumber(this.mode)) return;
		this.status = parsed.status;
		this.nGuesses = parsed.nGuesses;
		this.validHard = parsed.validHard;
		this.time = parsed.time;
		this.solutionNumber = parsed.solutionNumber;
		this.solution = parsed.solution;
		this.board = parsed.board;
		this.guesses = this.board.guesses;

		this.#valid = true;
	}

}

export class Settings extends Storable {
	public hard = new Array(modeData.modes.length).fill(false);
	public aiMode: aiModes = aiModes["AI Max Groups Easy"];
	public dark = true;
	public colorblind = false;
	public tutorial: 0 | 1 | 2 | 3 = 3;
	/** Maximum number of words to show on any stat words left list. */
	public maxStatWords: number = 30;

	constructor(settings?: string) {
		super();
		if (settings) {
			const parsed = JSON.parse(settings) as Settings;
			this.hard = parsed.hard;
			this.aiMode = parsed.aiMode;
			this.dark = parsed.dark;
			this.colorblind = parsed.colorblind;
			this.tutorial = parsed.tutorial;
			this.maxStatWords = parsed.maxStatWords;
		}
		this.maxStatWords = 30; // DELETE?
		appSettings = this;
	}
}

export class Stats extends Storable {
	public played = 0;
	public lastGame = 0;
	public guesses = {
		fail: 0,
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
	};
	public streak: number;
	public maxStreak: number;
	#hasStreak = false;

	constructor(param: string | GameMode) {
		super();
		if (typeof param === "string") {
			this.parse(param);
		} else if (modeData.modes[param].streak) {
			this.streak = 0;
			this.maxStreak = 0;
			this.#hasStreak = true;
		}
	}
	private parse(str: string) {
		const parsed = JSON.parse(str) as Stats;
		this.played = parsed.played;
		this.lastGame = parsed.lastGame;
		this.guesses = parsed.guesses;
		if (parsed.streak != undefined) {
			this.streak = parsed.streak;
			this.maxStreak = parsed.maxStreak;
			this.#hasStreak = true;
		}
	}
	
	
	addWin(guesses: number, mode: Mode) {
		++this.guesses[guesses];
		++this.played;
		if (this.#hasStreak) {
			this.streak = mode.seed - this.lastGame > mode.unit ? 1 : this.streak + 1;
			this.maxStreak = Math.max(this.streak, this.maxStreak);
		}
		this.lastGame = mode.seed;
	}

	addLoss(mode: Mode) {
		++this.guesses.fail;
		++this.played;
		if (this.#hasStreak) this.streak = 0;
		this.lastGame = mode.seed;
	}
	get hasStreak() { return this.#hasStreak; }
}

export class LetterStates {
	public a: LetterState = "🔳";
	public b: LetterState = "🔳";
	public c: LetterState = "🔳";
	public d: LetterState = "🔳";
	public e: LetterState = "🔳";
	public f: LetterState = "🔳";
	public g: LetterState = "🔳";
	public h: LetterState = "🔳";
	public i: LetterState = "🔳";
	public j: LetterState = "🔳";
	public k: LetterState = "🔳";
	public l: LetterState = "🔳";
	public m: LetterState = "🔳";
	public n: LetterState = "🔳";
	public o: LetterState = "🔳";
	public p: LetterState = "🔳";
	public q: LetterState = "🔳";
	public r: LetterState = "🔳";
	public s: LetterState = "🔳";
	public t: LetterState = "🔳";
	public u: LetterState = "🔳";
	public v: LetterState = "🔳";
	public w: LetterState = "🔳";
	public x: LetterState = "🔳";
	public y: LetterState = "🔳";
	public z: LetterState = "🔳";

	constructor(board?: GameBoard) {
		if (board) {
			for (let row = 0; row < ROWS; ++row) {
				for (let col = 0; col < board.guesses[row].length; ++col) {
					if (this[board.guesses[row][col]] === "🔳" || board.state[row][col] === "🟩") {
						this[board.guesses[row][col]] = board.state[row][col];
					}
				}
			}
		}
	}

	update(state: LetterState[], word: string) {
		state.forEach((e, i) => {
			const ls = this[word[i]];
			if (ls === "🔳" || e === "🟩") {
				this[word[i]] = e;
			}
		});

	}
}

export function timeRemaining(m: Mode) {
	if (m.useTimeZone) {
		return m.unit - (Date.now() - (m.seed + new Date().getTimezoneOffset() * ms.MINUTE));
	}
	return m.unit - (Date.now() - m.seed);
}

export function createKids(pNode: BotNode) {

	// Prevent a leaf node from creating kids.
	// And build app.botTreeNodes, the path through the botTree.
	app.nBotTreeNodes++
	if (pNode.isLeaf()) { 
		app.nBotTreeLeaves++;
		// app.botTreeNodes.push(`L${pNode.ri}${pNode.guess}`);
		return; 
	}
	// app.botTreeNodes.push(`${pNode.ri}${pNode.guess}`);

	let kid: BotNode;

	pNode.gangs.forEach((pGang, pGroupId) => {
		if (pGroupId === "#####") { return; } // skip to next pGroupId

		let [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy] = pGang;

		// Create hard mode kids.
		for (let gi = 0; gi < pGroup.length; gi++) {
			let gangs = calculateGroups(pGroup[gi], pGroup);
			kid = new BotNode([pNode, pGroupId, null], pNode.ri + 1, pGroup[gi], gangs);
			if ( kid.nGroups === pGroup.length) {
				pPerfectKid = true; // hard mode perfect kid
				pMgKidHard = kid;
				pMgKidEasy = kid;
				pSosKidHard = kid;
				pSosKidEasy = kid;
				pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
				pNode.gangs.set(pGroupId, pGang);
				kid.parent[2] = pGang;
				createKids(kid);
				return; // skip to next pGang
			}
			if (pMgKidHard === null || kid.nGroups > pMgKidHard.nGroups) {
				pMgKidHard = kid;
				pMgKidEasy = kid;
				pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
				pNode.gangs.set(pGroupId, pGang);
				kid.parent[2] = pGang;
			} 
			if (pSosKidHard === null || kid.sumOfSquares < pSosKidHard.sumOfSquares) {
				pSosKidHard = kid;
				pSosKidEasy = kid;
				pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
				pNode.gangs.set(pGroupId, pGang);
				kid.parent[2] = pGang;
			} 
		}
		if ( pPerfectKid ) {
			console.log("WARNING. Unexpectedly creating kids", pPerfectKid, pMgKidHard);
			let iNode = pMgKidHard;
			let guessId = pGroupId;
			while (iNode !== null) {
				botNodeInfo(iNode, guessId);
				guessId = iNode.parent2[1];
				iNode = iNode.parent2[0];
			}
		}
		createKids(pMgKidHard);
		if ( pSosKidHard.sumOfSquares < pMgKidHard.sumOfSquares ) createKids(pSosKidHard);

		// Create easy mode kids if not almost the last allowed guess.
		// For example, when ROWS = 6, the 5th guess (ri = 4 = ROWS - 2) 
		// must have a hard kid, never an easy kid.
		if (pNode.ri < (ROWS - 2)) {
			for (let gi = 0; gi < app.easyGroup.length; gi++) {
				let gangs = calculateGroups(app.easyGroup[gi], pGroup);
				kid = new BotNode([pNode, pGroupId, null], pNode.ri + 1, app.easyGroup[gi], gangs);
				if ( kid.nGroups === pGroup.length) {
					pPerfectKid = true; // easy mode perfect kid
					pMgKidEasy = kid;
					pSosKidEasy = kid;
					pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
					pNode.gangs.set(pGroupId, pGang);
					kid.parent[2] = pGang;
					createKids(kid);
					return; // skip to next pGang
				}
				if (pMgKidEasy === null || kid.nGroups > pMgKidEasy.nGroups) {
					pMgKidEasy = kid;
					pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
					pNode.gangs.set(pGroupId, pGang);
					kid.parent[2] = pGang;
				} 
				if (pSosKidEasy === null || kid.sumOfSquares < pSosKidEasy.sumOfSquares) {
					pSosKidEasy = kid;
					pGang = [ pGroup, pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
					pNode.gangs.set(pGroupId, pGang);
					kid.parent[2] = pGang;
				} 
			}
			if ( pMgKidEasy.nGroups > pMgKidHard.nGroups) createKids(pMgKidEasy);
			if ( pSosKidEasy.sumOfSquares < pMgKidEasy.sumOfSquares &&
				pSosKidEasy.sumOfSquares < pSosKidHard.sumOfSquares ) 
				createKids(pSosKidEasy);
	
		} 
	});
}

export function calculateBotTree(rootGuess: string, rootGuessId: string) {
	let gangs: Gangs;

	// First create the botRoot with the all gangs so that
	// it contains the correct nGroups and sumOfSquares values.
	gangs = calculateGroups(rootGuess, words.answers);
	let pGang = gangs.get(rootGuessId);
	botRoot = new BotNode([null, "", null], 0, rootGuess, gangs);

	// To reduce the BotTree size and calculation time,
	// reduce the botRoot gangs map down to 1 or 2 groups. 
	let gangs2: Gangs = new Map< string, GangTuple >;
	gangs2.set(rootGuessId, pGang);


	// Find a good easyGang with a good easyGroup.
	// The best easyGroup is the one with groupId "-----".
	// But if the first guess has groupId "-----"
	// then use an alternate easyGroup.
	// Also, add easyGroup to map2 because that group
	// is a great pool of potential optimal easy mode guesses.
	let easyGang: GangTuple;
	let easyGroupId: string;
	if (rootGuessId !== "-----") easyGroupId = "-----";
	else {
		// Find a gang pair wihose groupId has the most 
		// dashes (up to 4 dashes, 5dashes is not allowed).
		let maxDashes = -1;
		let dashes: number;
		for (const pGroupId of gangs.keys()) {
			dashes = countOfAinB("-", pGroupId);
			if (dashes === 5) continue;
			if (dashes > maxDashes) {
				maxDashes = dashes;
				easyGroupId = pGroupId;
				if (dashes === 4) break;
			}
		}
	}
	easyGang = gangs.get(easyGroupId);
	app.easyGroup = easyGang[0];
	gangs2.set(easyGroupId, easyGang);
	botRoot.gangs = gangs2;

	createKids(botRoot);
}

/** calculateGroups returns a Gang<groupId key, GangTuple>
 * of the groups given the guess and the pg (parent group) of
 * words remaining before the guess.
 */
export function calculateGroups(guess: string, pg: Array<string>) {
	let group: Array<string>;
	let tuple: GangTuple;
	let gangs: Gangs = new Map<string, GangTuple>;
	let gid: string;
	for (let a = 0; a < pg.length; a++) {
		gid = calculateGroupId(pg[a], guess);
		tuple = gangs.get(gid);
		(tuple === undefined) ? group = undefined : group = tuple[0];
		if (group === undefined) {
			group = new Array<string>;
			group.push(pg[a]);
			gangs.set(gid, [group, false, null, null, null, null]);
		}
		else group.push(pg[a]);
	}
	return gangs;
}

/** A BotNode represents a guess before it gets its colors. */	
export class BotNode // extends TreeNode 
{ 
	public ri: number;
	public guess: string;
	/** guess divides the parent group  
	 * remaining words into nGroups = map.size. */
	public nGroups: number;
	/** sum of each group.length^2 */
	public sumOfSquares: number;
	/** Tuple [groupWordListArray, groupId] */
	public parent: ParentTuple;

	//** gang<groupId, GangTuple > */
	public gangs: Gangs;
 
	constructor(parent:ParentTuple, ri: number, guess: string, gangs: Gangs )
	{ 
		this.parent = parent;
		this.ri = ri;
		this.guess = guess;
		this.gangs = gangs;
		this.nGroups = gangs.size;
		this.sumOfSquares = 0;
		gangs.forEach(([group], _) => { this.sumOfSquares += group.length ** 2; });
		app.nNodesCreated++;
	}

	/** Two types of leaves.
	 * 1. A true leaf, which has only 1 word left (itself).
	 * 2. And a "no more gueses remaining" leaf.
	 * This function returns true for both types.
	 */
  	isLeaf() { return (this.sumOfSquares === 1 || this.ri === (ROWS - 1)); }

}

export enum BotMode {
	"Human",
	"Bot Max Groups Hard",
	"Bot Max Groups Easy",

	"Bot Min Sum of Squares Hard",
	"Bot Min Sum of Squares Easy",

	"AI Max Groups Hard",
	"AI Max Groups Easy",

	"AI Min Sum of Squares Hard",
	"AI Min Sum of Squares Easy",
};

export enum aiModes {
	"Max Groups Hard",
	"Max Groups Easy",
	"Min Sum of Squares Hard",
	"Min Sum of Squares Easy",
}

export function botNodeInfo (botNode: BotNode, guessId = "") {
	let info: BotNodeTuple = [,,,,,,,,,,,,,,]; // Initialize a multi element empty tuple.

	info[0] = "";
	info[1] = 0;
	info[2] = 0;
	info[3] = 0;
	info[4] = "";
	info[5] = 0;
	info[6] = "";
	info[7] = guessId;
	info[8] = "";
	info[9] = 0;
	info[10] = "";
	info[11] = 0;
	info[12] = null;
	info[13] = "";

	if (guessId === "" && app.solution !== "") {
		guessId = calculateGroupId(app.solution, botNode.guess);
		info[7] = guessId;
	}

	info[0] = botNode.guess.toUpperCase();
	info[1] = botNode.ri;
	info[2] = botNode.nGroups;
	info[3] = botNode.sumOfSquares;
	info[7] = guessId;

	let wordsBefore: Array<string> = [];
	info[5] = 0; // wordsLeftBefore
	botNode.gangs.forEach((pGang, pGroupId) => {
		let pGroup = pGang[0];
		wordsBefore.push(pGroup.join(" "));
		if (guessId === pGroupId) {
			info[8] = colorString(guessId);
			info[11] = pGroup.length; // wordsLeftAfter
			info[10] = pGroup.join(" "); // wordListAfter
			info[13] = pGroup.slice(0, appSettings.maxStatWords).join(" "); // statWordListAfter
			info[12] = pGang[3]; // maxGroupsKidEasy
		}	
	});

	if (botNode.ri === 0) {
		info[5] = words.answers.length; // wordsLeftBefore
		info[4] = ""; // wordListBefore
		info[6] = "Hard"; // easyOrHard
	} else {
		info[4] = wordsBefore.join(", "); // wordListBefore
		info[5] = botNode.parent[2][0].length; // wordsLeftBefore
		if (countOfAinB(botNode.guess, info[4]) > 0) info[6] = "Hard"; // easyOrHard
		else info[6] = "Easy"; // easyOrHard
	}

	if (guessId === "") {
		info[7] = ""; // guessId
		info[8] = ""; // colorString
		info[9] = 0; // wordsEliminated
		info[10] = ""; // wordListAfter
		info[13] = ""; // statWordListAfter
		info[11] = 0; // wordsLeftAfter
		info[12] = null; // maxGroupsKidEasy
	} else { // wordsEliminated = wordsLeftBefore - wordsLeftAfter
		info[9] = info[5] - info[11];
	}

	// logInfo(); // console.log()

	return info;

	function logInfo() {
		console.log(`ri ${info[1]} ${info[6]} ${info[0]} nGroups vs sumOfSquares: ${info[2]} vs ${info[3]}`);
		console.log(`isLeaf? ${botNode.isLeaf()}`);
		console.log (`${info[7]} ${info[8]} eliminated ${info[9]} words`);
		if (botNode.ri > 0) console.log(`${botNode.parent[0].guess} parent (from parentTuple) with kids: ${botNode.parent[2][2].guess}, ${botNode.parent[2][3].guess}, ${botNode.parent[2][4].guess}, ${botNode.parent[2][5].guess}`);
		console.log (`${info[11]} words after: ${info[10]}`);
		console.log (`${info[5]} words before: ${info[4]}`);
		if (botNode.ri > 0) console.log (`${botNode.parent[2][0].length} words before (from parentTuple): ${botNode.parent[2][0].join(" ")}`);
		console.log("");	
	}
}

/** Calculates and returns botInfoArray based on app.botLeft/RightMode.  */
export function calculateBotInfoArray(botSide : "left" | "right" ) {
	let botMode: BotMode;
	let botRowArray: Array<BotNode> = [];
	let tuple: GangTuple;
	let botInfoArray: Array<BotNodeTuple> = [];

	switch (botSide) {
		case "left": botMode = app.botLeftMode; break;
		case "right": botMode = app.botRightMode; break;
		default:
			let e = new Error('calculateBotRowArray: statSide must be "left" or "right".');
			console.log(e);
			throw e; 
	}

	botRowArray.push(botRoot);
	switch (botMode) {
		case BotMode.Human:
			botRowArray = app.human;
			botRowArray.forEach((node, ri) => {	botInfoArray.push(botNodeInfo(node, app.guessGroupIds[ri])); });
			return botInfoArray;
		case BotMode["Bot Max Groups Hard"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[2]);
			}
		break;
		case BotMode["Bot Max Groups Easy"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[3]);
			}
		break;
		case BotMode["Bot Min Sum of Squares Hard"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				let tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[4]);
			}
		break;
		case BotMode["Bot Min Sum of Squares Easy"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				let tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[5]);
			}
		break;
		case BotMode["AI Max Groups Hard"]:
			botRowArray = app.aiMaxGroupsHard;
		break;
		case BotMode["AI Max Groups Easy"]:
			botRowArray = app.aiMaxGroupsEasy;
		break;
		case BotMode["AI Min Sum of Squares Hard"]:
			botRowArray = app.aiMinSumOfSquaresHard;
		break;
		case BotMode["AI Min Sum of Squares Easy"]:
			botRowArray = app.aiMinSumOfSquaresEasy;
		break;
	}

	botRowArray.forEach((node) => {	botInfoArray.push(botNodeInfo(node)); });
	return botInfoArray;
}
