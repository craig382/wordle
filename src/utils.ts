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

export async function pause(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Given anEnumDef, this function returns a string array
 * containing all the names of the enum.
 */
export function namesOf(anEnumDef) {
	return Object.keys(anEnumDef).filter((v) => isNaN(Number(v)));
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
			useTimeZone: true,
		},
		{
			name: "Hourly",
			unit: ms.HOUR,
			start: 1642528800000,	// 18/01/2022 8:00pm UTC+2
			seed: newSeed(GameMode.hourly),
			historical: false,
		},
		{
			name: "Infinite",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
		},
		{
			name: "AI",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
		},
		{
			name: "Solver",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
		},
		// {
		// 	name: "Minutely",
		// 	unit: ms.MINUTE,
		// 	start: 1642528800000,	// 18/01/2022 8:00pm
		// 	seed: newSeed(GameMode.minutely),
		// 	historical: false,
		// 	icon: "m7,200v-200l93,100l93,-100v200",
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
	public opener: string;
	/** Space separated list of top 12 New York Times 
	 * WordleBot openers (each with 97+ NYT WordleBot score). */
	public openers = "trace crane slate crate plate saint least stare stale snare plane place";
	// Bot scores: trace 2165, crane 2173, slate 2168, crate 2167, plate 2184,
	// saint 2186, least 2175, stare 2182, stale 2173, snare 2183, plane 2183, place 2187
	public errorString: string = "";
	public botTree: Array<Array<BotNode>> = Array(COLS + 1).fill(null).map(() => []);
	/** Incremented each time a new BotNode is created.
	 * calculateGroups() is usually performed once per new node.
	 */
	public nNodesCreated: number = 0;
	public easyGroup: Array<string>;

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
	 * guesses is an alias for board.guesses. */
	public guesses: Array<string>;
	/** guessGroupIds[rowIndex]. 
	 * GroupId of the row's guess. */
	public guessGroupIds = Array<string>(ROWS+1).fill("");

	constructor(mode: GameMode) {
		super();
		this.mode = mode;
		
		this.status = GameStatus.active;
		this.nGuesses = 0;
		this.validHard = true;
		this.time = modeData.modes[mode].seed;
		this.solutionNumber = getWordNumber(mode);
		let solutionIndex = seededRandomInt(0, words.answers.length, this.time);
		this.solution = words.answers[solutionIndex];
		this.board = {
			guesses: Array(ROWS+1).fill(""),
			state: Array.from({ length: ROWS }, () => (Array(COLS).fill("🔳"))),
		};

		this.guesses = this.board.guesses;

		if (mode === GameMode.solver) {
			this.board.state[0].fill("⬛");
			this.solution = "";
		}

		this.botLeftMode = BotMode.Human;
		this.botRightMode = BotMode["Bot Max % Groups Easy"];	

		this.errorString = "";
		this.aiMaxGroupsHard = [];
		this.aiMaxGroupsEasy = [];
		this.aiMinSumOfSquaresHard = [];
		this.aiMinSumOfSquaresEasy = [];
	
		app = this; // tell svelte to react to change in app
		
		// console.log("app = new GameState:", app);
		// console.log(new Error(`GameState.constructor() stack. No Error.`));
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
			appSettings.prevOpener = app.board.guesses[0];
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
					this.aiMaxGroupsHard.push(gang[1][1]);
					this.aiMaxGroupsEasy.push(gang[1][2]);
					this.aiMinSumOfSquaresHard.push(gang[1][3]);
					this.aiMinSumOfSquaresEasy.push(gang[1][4]);
				} else {
					let i = 0;
					while (true) {
						gang = this.aiMaxGroupsHard[i].gangs.get(calculateGroupId(this.solution, this.aiMaxGroupsHard[i].guess));
						if (gang[1][1] === null) break;
						else this.aiMaxGroupsHard.push(gang[1][1]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMaxGroupsEasy[i].gangs.get(calculateGroupId(this.solution, this.aiMaxGroupsEasy[i].guess));
						if (gang[1][2] === null) break;
						else this.aiMaxGroupsEasy.push(gang[1][2]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMinSumOfSquaresHard[i].gangs.get(calculateGroupId(this.solution, this.aiMinSumOfSquaresHard[i].guess));
						if (gang[1][3] === null) break;
						else this.aiMinSumOfSquaresHard.push(gang[1][3]);
						i++;
					}
					i = 0;
					while (true) {
						gang = this.aiMinSumOfSquaresEasy[i].gangs.get(calculateGroupId(this.solution, this.aiMinSumOfSquaresEasy[i].guess));
						if (gang[1][4] === null) break;
						else this.aiMinSumOfSquaresEasy.push(gang[1][4]);
						i++;
					}
				}	
			}
		} else {
			// Find or create this human guess in the bot tree.
			let pGang: GangTuple;
			pGang = this.human[ri-1].gangs.get(this.guessGroupIds[ri-1]);
			if (pGang === undefined) {
				this.errorString =`Previous human[${ri - 1}] guess ` +
					`"${this.human[ri - 1].guess}" has no gang or group matching ` + 
					`its colors (its groupId = ${this.guessGroupIds[ri-1]}).`;
					let e = new Error('updateBot: Human guess group not found.');
					app.status = GameStatus.lost; // Abort the game.
					throw e; 		
			}
			let bnExisting = pGang[2].find((bn) => bn.guess === guess);
			if (bnExisting === undefined) {
				// Existing Guess BotNode not found.
				// Thus create new BotNode for the guess 
				// and create kids for the new BotNode.
				let pGroup = pGang[0];
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
				this.human.push(new BotNode( this.human[ri-1], this.guessGroupIds[ri-1], ri, guess, gangs, pGroup.length));
				createKids(this.human[ri]);
			} else {
				this.human.push(bnExisting);
				if ( !this.human[ri].hasKids ) createKids(this.human[ri]);
			} 			
		}

		console.log(`${this.human[ri].guess}[${ri}]:`, this.guessGroupIds[ri], this.human[ri]);

		if (this.guessGroupIds[ri] === "#####") {
			this.status = GameStatus.won;
			this.solution = this.guesses[ri]; // needed for solver mode
		} else if (this.nGuesses === (ROWS - 1)) this.status = GameStatus.lost;

		if (!this.active) {

			if (this.status === GameStatus.won || this.mode !== GameMode.solver ) {
				if (this.solution === appSettings.prevSolution) {
					modeData.modes[this.mode].historical = true;
				}
				appSettings.prevSolution = this.solution;
			}
			
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

}

export class Settings extends Storable {
	public hard = new Array(modeData.modes.length).fill(false);
	public aiMode: aiModes = aiModes["Max % Groups Easy"];
	public openerMode: OpenerModes = OpenerModes["Random NYT WordleBot"];
	public prevOpener: string = "slate";
	public prevSolution: string = "happy";
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
			this.openerMode = parsed.openerMode;
			this.prevOpener = parsed.prevOpener;
			this.prevSolution = parsed.prevSolution;
			this.dark = parsed.dark;
			this.colorblind = parsed.colorblind;
			this.tutorial = parsed.tutorial;
			this.maxStatWords = parsed.maxStatWords;
		}
		appSettings = this;
	}
}

export class Stats extends Storable {
	public played = 0;
	public guesses = {
		fail: 0,
		1: 0,
		2: 0,
		3: 0,
		4: 0,
		5: 0,
		6: 0,
	};
	public streak: number = 0;
	public maxStreak: number = 0;

	constructor(param: string | GameMode) {
		super();
		if (typeof param === "string") {
			this.parse(param);
		} else if (modeData.modes[param].streak) {
			this.streak = 0;
			this.maxStreak = 0;
		}
	}
	private parse(str: string) {
		const parsed = JSON.parse(str) as Stats;
		this.played = parsed.played;
		this.guesses = parsed.guesses;
		if (parsed.streak != undefined) {
			this.streak = parsed.streak;
			this.maxStreak = parsed.maxStreak;
		}
	}
	
	
	addWin(guesses: number) {
		++this.guesses[guesses];
		++this.played;
		++this.streak;
		this.maxStreak = Math.max(this.streak, this.maxStreak);

		// console.log("Stats after win:", this);
	}

	addLoss() {
		++this.guesses.fail;
		++this.played;
		this.streak = 0;

		// console.log("Stats after loss:", this);
	}

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
			const ls: LetterState = this[word[i]];
			if ( colorIndex[e] > colorIndex[ls] ) this[word[i]] = e;
			// console.log("LetterStates.update for word, letter", word, word[i], colorIndex[e], e, "colorIndex[e] > colorIndex[ls] ?", (colorIndex[e] > colorIndex[ls]), colorIndex[ls], ls, "this[word[i]]:", this[word[i]] );
		});

	}
}

export const colorIndex = {
	"🔳": 0, // undefined
	"⬛": 1, // blank
	"🟨": 2, // yellow
	"🟩": 3, // green
}

export function timeRemaining(m: Mode) {
	if (m.useTimeZone) {
		return m.unit - (Date.now() - (m.seed + new Date().getTimezoneOffset() * ms.MINUTE));
	}
	return m.unit - (Date.now() - m.seed);
}

export function createKids(pNode: BotNode) {

	// Prevent pNode from creating kids if there are no more guesses left.
	if (pNode.ri > (ROWS-2)) return;

	let kid: BotNode;

	pNode.gangs.forEach((pGang, pGroupId) => {
		if (pGroupId === "#####") return; // skip to next forEach iteration
		pNode.hasKids = true;
		let [ pGroup, kids, pGroupNode ] = pGang;
		let [ pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ] = kids;

		// Create hard mode kids.
		for (let gi = 0; gi < pGroup.length; gi++) {
			let gangs = calculateGroups(pGroup[gi], pGroup);
			kid = new BotNode(pNode, pGroupId, pNode.ri + 1, pGroup[gi], gangs, pGroup.length, true);
			if (pPerfectKid === false) {
				if (kid.nGroups === pGroup.length) {
					pPerfectKid = true; // hard mode perfect kid
					pMgKidHard = kid;
					pMgKidEasy = kid;
					pSosKidHard = kid;
					pSosKidEasy = kid;
				} else {
					if (pMgKidHard === null || kid.nGroups > pMgKidHard.nGroups) {
						pMgKidHard = kid;
						pMgKidEasy = kid;
					} 
					if (pSosKidHard === null || kid.sumOfSquares < pSosKidHard.sumOfSquares) {
						pSosKidHard = kid;
						pSosKidEasy = kid;
					}	
				} 	
			}
		}

		// Create hard mode kids.
		createKids(pMgKidHard);
		if ( pSosKidHard.sumOfSquares < pMgKidHard.sumOfSquares ) createKids(pSosKidHard);

		// Create easy mode kids if not almost the last allowed guess.
		// For example, when ROWS = 6, the 5th guess (ri = 4 = ROWS - 2) 
		// must have a hard kid, never an easy kid.
		if ( pPerfectKid === false && (pNode.ri < (ROWS - 2)) ) {
			for (let gi = 0; gi < app.easyGroup.length; gi++) {
				let gangs = calculateGroups(app.easyGroup[gi], pGroup);
				kid = new BotNode(pNode, pGroupId, pNode.ri + 1, app.easyGroup[gi], gangs, pGroup.length);
				if ( pPerfectKid === false && kid.nGroups === pGroup.length) {
					pPerfectKid = true; // easy mode perfect kid
					pMgKidEasy = kid;
					pSosKidEasy = kid;
				} else {
					if (pMgKidEasy === null || kid.nGroups > pMgKidEasy.nGroups) {
						pMgKidEasy = kid;
					} 
					if (pSosKidEasy === null || kid.sumOfSquares < pSosKidEasy.sumOfSquares) {
						pSosKidEasy = kid;
					} 	
				}
			}

			// Create easy mode kids.
			if ( pMgKidEasy.nGroups > pMgKidHard.nGroups) createKids(pMgKidEasy);
			if ( pSosKidEasy.sumOfSquares < pMgKidEasy.sumOfSquares &&
				pSosKidEasy.sumOfSquares < pSosKidHard.sumOfSquares ) 
				createKids(pSosKidEasy);	
		}

		// Update pGang.
		kids = [ pPerfectKid, pMgKidHard, pMgKidEasy, pSosKidHard, pSosKidEasy ];
		pGang = [ pGroup, kids, pGroupNode ];
		pNode.gangs.set(pGroupId, pGang);

	});

}

export function calculateBotTree(rootGuess: string, rootGuessId: string) {
	let gangs: Gangs;

	// First create the botRoot with the all gangs so that
	// it contains the correct nGroups and sumOfSquares values.
	gangs = calculateGroups(rootGuess, words.answers);
	let rootGang = gangs.get(rootGuessId);
	botRoot = new BotNode(null, "", 0, rootGuess, gangs, words.answers.length);

	// To reduce the BotTree size and calculation time,
	// reduce the botRoot gangs map down to 1 or 2 groups. 
	let rootGangs: Gangs = new Map< string, GangTuple >;
	rootGangs.set(rootGuessId, rootGang);


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
		// Find a gang pair whose groupId has the most 
		// dashes (up to 4 dashes, 5 dashes is not allowed).
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

	botRoot.gangs = rootGangs;
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
			gangs.set(gid, [group, [ false, null, null, null, null ], [] ]);
		}
		else group.push(pg[a]);
	}
	return gangs;
}

export class ParentTuple {
	node: BotNode;
	groupId: string;
	private _gang: GangTuple;
	private _kids: KidTuple;

	constructor(node:BotNode, groupId: string)
	{
		this.node = node;
		this.groupId = groupId;
	}

	get gang(): GangTuple {
		this._gang = this.node.gangs.get(this.groupId);
		return this._gang;
	}

	get kids(): KidTuple {
		this._kids = this.gang[1];
		return this._kids;
	}

}

/** A BotNode represents a guess before it gets its colors. */	
export class BotNode // extends TreeNode 
{ 
	public ri: number;
	public guess: string;
	/** guess divides nWordsBefore  
	 * into nGroups. nGroups = gangs.size. */
	public nGroups: number;
	/** sum of each group.length^2 */
	public sumOfSquares: number;
	public largestGroup: number;
	/** number of words left before this guess */
	public nWordsBefore: number;
	/** Tuple [groupWordListArray, groupId] */
	public parent: ParentTuple;
	public hasKids: boolean;

	/** gang<groupId, GangTuple > */
	public gangs: Gangs;
 
	constructor(parentNode: BotNode, parentGroupId: string, ri: number, guess: string, gangs: Gangs, nWordsBefore: number, linkToParent = false )
	{ 
		this.parent = new ParentTuple(parentNode, parentGroupId);
		this.hasKids = false;
		this.ri = ri;
		this.guess = guess;
		this.gangs = gangs;
		this.nWordsBefore = nWordsBefore;
		this.nGroups = gangs.size;
		this.sumOfSquares = 0;
		this.largestGroup = 0;
		gangs.forEach(([group], _) => { 
			this.sumOfSquares += group.length ** 2; 
			if (group.length > this.largestGroup) this.largestGroup = group.length;
		});
		if (linkToParent) {
			let parentGroupNode = this.parent.gang[2];
			if (parentGroupNode === null) parentGroupNode = [this];
			else parentGroupNode.push(this);
		}
		app.nNodesCreated++;
		app.botTree[ri].push(this); // for debugging, save every BotNode
	}

	/** Two types of leaves.
	 * 1. A true leaf, which has only 1 word left (itself).
	 * 2. And a "no more guesses remaining" leaf.
	 * This function returns true for both types.
	 */
  	isLeaf() { 
		let isTrueLeaf = this.sumOfSquares === 1 && this.gangs.entries().next().value[0] === "#####";
		return ( isTrueLeaf || this.ri === (ROWS - 1) ); 
	}

}

export enum BotMode {
	"Human",
	"Bot Max % Groups Hard",
	"Bot Max % Groups Easy",

	"Bot Min Sum of Squares Hard",
	"Bot Min Sum of Squares Easy",

	"AI Max % Groups Hard",
	"AI Max % Groups Easy",

	"AI Min Sum of Squares Hard",
	"AI Min Sum of Squares Easy",
};

export enum aiModes {
	"Max % Groups Hard",
	"Max % Groups Easy",
	"Min Sum of Squares Hard",
	"Min Sum of Squares Easy",
}

export enum OpenerModes {
	"Manual",
	"Random NYT WordleBot",
	"Chain Mode",
	"Auto Repeat",
}

export function botNodeInfo (botNode: BotNode, guessId = "") {

	if (botNode === null) {
		let e = new Error(`botNodeInfo( botNode: ${botNode}, guessId: "${guessId}" ): botNodeInfo called for a null botNode.`);
		console.log(e);
		throw e;
	}

	let info: BotNodeTuple = [,,,,,,,,,,,,,,,,,,,,,]; // Initialize a multi element empty tuple.

	info[0] = ""; // guess
	info[1] = 0; // ri
	info[2] = 0; // nGroups
	info[3] = 0; // sumOfSquares
	info[4] = ""; // wordListBefore
	info[5] = 0; // nWordsBefore
	info[6] = ""; // easyOrHard
	info[7] = guessId; // guessId
	info[8] = ""; // colorString
	info[9] = 0; // nWordsEliminated
	info[10] = ""; // wordListAfter
	info[11] = 0; // nWordsAfter
	info[12] = null; // maxGroupsKidEasy
	info[13] = ""; // statWordListAfter
	info[14] = 0; // groupPercent
	info[15] = 0; // largestGroup
	info[16] = 0; // largestGroupPercent
	info[18] = null; // maxGroupsSibEasy
	info[19] = ""; // wordListAfterOld
	info[20] = ""; // statWordListAfterOld

	if (guessId === "" && app.solution !== "") {
		guessId = calculateGroupId(app.solution, botNode.guess);
		info[7] = guessId;
	}

	info[0] = botNode.guess.toUpperCase();
	info[1] = botNode.ri;
	info[2] = botNode.nGroups;
	info[3] = botNode.sumOfSquares;
	info[5] = botNode.nWordsBefore; // nWordsBefore
	info[7] = guessId;
	info[14] = Math.round(100 * botNode.nGroups / botNode.nWordsBefore); // groupPercent
	info[15] = botNode.largestGroup; // largestGroup
	info[16] = Math.round(100 * botNode.largestGroup / botNode.nWordsBefore); // largestGroupPercent

	let wordsBefore: Array<string> = [];
	botNode.gangs.forEach((gang, groupId) => {
		let group = gang[0];
		wordsBefore.push(group.join(" "));
		if (guessId === groupId) {
			info[8] = colorString(guessId);
			if (guessId !== "#####") { // nWordsAfter is 0 for the solution
				info[11] = group.length; // nWordsAfter

				if (botNode.hasKids) {
					info[12] = gang[1][2]; // maxGroupsKidEasy	

					// Sort gang.groupNodes 1st by max nGroups and 2nd by min sum Of Squares.
					gang[2].sort((a, b) => {
						if (a.nGroups > b.nGroups) return -1;
						else if (a.nGroups < b.nGroups) return +1;
						else if (a.sumOfSquares < b.sumOfSquares) return -1;
						else return 0;
					});

					// Build info[13] (statWordListAfter) string
					// of the truncated sorted list of remaining words.
					let nGroupsNow = gang[2][0].nGroups;
					info[13] = `${gang[2][0].nGroups}:`;
					for (let bni = 0; bni < gang[2].slice(0, appSettings.maxStatWords).length; bni++) {
						let g = gang[2][bni].nGroups;
						if (g !== nGroupsNow) {
							info[13] += `, ${g}:`
							nGroupsNow = g;
						}
						info[13] += ` ${gang[2][bni].guess}`;
					}
				} else if (!botNode.hasKids) {
					// info[19] = group.join(" "); // wordListAfterOld
					info[20] = group.slice(0, appSettings.maxStatWords).join(" "); // statWordListAfterOld
					info[13] = info[20]; // statWordListAfter
				}
			}
		}	
	});

	if (botNode.ri === 0) {
		info[4] = ""; // wordListBefore
		info[6] = "Hard"; // easyOrHard
	} else {
		info[4] = wordsBefore.join(", "); // wordListBefore
		if (countOfAinB(botNode.guess, info[4]) > 0) info[6] = "Hard"; // easyOrHard
		else info[6] = "Easy"; // easyOrHard
		info[18] = botNode.parent.kids[2] ; // maxGroupsSibEasy
	}

	info[9] = botNode.nWordsBefore - info[11]; // nWordsEliminated = nWordsBefore - nWordsAfter
	info[17] = Math.round(100 * info[9] / botNode.nWordsBefore); // eliminatedPercent

	// logInfo(); // console.log()

	return info;

	function logInfo() {
		console.log();
		console.log(`logInfo:`);
		console.log(`${info[6]} ${info[0]}[${info[1]}] ${info[2]} nGroups, ${info[3]} sumOfSquares, isLeaf: ${botNode.isLeaf()}`);
		console.log (`${info[7]} ${info[8]} eliminated ${info[9]} words`);
		console.log("botNodeInfo/logInfo/botNode:");
		console.log(botNode);
		if (botNode.ri > 0) {
			if (botNode.parent.kids[2] === null)
				console.log(`${botNode.guess} parent ${botNode.parent.node.guess} (hasKids = ${botNode.parent.node.hasKids}) has no kids.`); 
			else {
				console.log(`${botNode.guess} parent ${botNode.parent.node.guess} has kids: ${botNode.parent.kids[1].guess}, ${botNode.parent.kids[2].guess}, ${botNode.parent.kids[3].guess}, ${botNode.parent.kids[4].guess}`);
				console.log(`${botNode.guess} maxGroupsSibEasy: ${info[18].guess}.`, info[18]);
			}
		}
		console.log (`${info[11]} words after: ${info[10]}`);
		console.log (`${info[11]} words after [OLD]: ${info[19]}`);
		console.log (`${info[11]} first ${appSettings.maxStatWords} words after: ${info[13]}`);
		console.log (`${info[11]} first ${appSettings.maxStatWords} words after [OLD]: ${info[20]}`);
		console.log (`${info[5]} words before: ${info[4]}`);
		if (botNode.ri > 0) console.log (`${botNode.parent.gang[0].length} words before (from parent): ${botNode.parent.gang[0].join(" ")}`);
		console.log("");	
	}
}

/** Calculates and returns botInfoArray based on botSide = app.botLeft/RightMode.  */
export function calculateBotInfoArray(botSide : "left" | "right" ) {
	let botMode: BotMode;

	switch (botSide) {
		case "left": botMode = app.botLeftMode; break;
		case "right": botMode = app.botRightMode; break;
		default:
			let e = new Error(`calculateBotRowArray: statSide must be "left" or "right".`);
			console.log(e);
			throw e; 
	}

	return calculateBotInfoArray2(botMode);
}

/** Calculates and returns botInfoArray based on botMode.  */
export function calculateBotInfoArray2(botMode: BotMode) {
	let botRowArray: Array<BotNode> = [];
	let tuple: GangTuple;
	let botInfoArray: Array<BotNodeTuple> = [];

	console.log(`calculateBotInfoArray/botMode: ${namesOf(BotMode)[botMode]}`);

	botRowArray.push(botRoot);
	switch (botMode) {
		case BotMode.Human:
			botRowArray = app.human;
		break;
		case BotMode["Bot Max % Groups Hard"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[1][1]);
			}
		break;
		case BotMode["Bot Max % Groups Easy"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[1][2]);
			}
		break;
		case BotMode["Bot Min Sum of Squares Hard"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				let tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[1][3]);
			}
		break;
		case BotMode["Bot Min Sum of Squares Easy"]:
			for (let ri = 0; ri < (app.nGuesses - (app.active ? 0 : 1)); ri++) {
				let tuple = app.human[ri].gangs.get(app.guessGroupIds[ri]);
				botRowArray.push(tuple[1][4]);
			}
		break;
		case BotMode["AI Max % Groups Hard"]:
			botRowArray = app.aiMaxGroupsHard;
		break;
		case BotMode["AI Max % Groups Easy"]:
			botRowArray = app.aiMaxGroupsEasy;
		break;
		case BotMode["AI Min Sum of Squares Hard"]:
			botRowArray = app.aiMinSumOfSquaresHard;
		break;
		case BotMode["AI Min Sum of Squares Easy"]:
			botRowArray = app.aiMinSumOfSquaresEasy;
		break;
	}

	botRowArray.forEach((node) => {	
		if (node === null) {
			this.errorString = botRowArray;
			console.log(botRowArray, "calculateBotInfoArray.botRowArray");
			let e = new Error('calculateBotInfoArray: botRowArray contains a null node or is empty.');
			throw e; 		
		}
		botInfoArray.push(botNodeInfo(node)); 
	});
	return botInfoArray;
}
