import seedRandom from "seedrandom";
import { GameMode, ms } from "./enums";
import wordList from "./words_5";

export const ROWS: number = 6;
export const COLS: number = 5;
export let app: GameState;
export let botRoot: BotNode;

let appSettings: Settings;

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

/** patternArray returns the color pattern of a groupId. */
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

/** patternString returns the color pattern of a groupId. */
export function colorString(groupId: string): string {
	return colorArray(groupId).join("");
}

/** EasyOrHard(guess, ri) returns "Easy" or "Hard" for
 * the guess of the row with row index ri. */
export function EasyOrHard(guess: string, ri: number) {
	if (ri === 0) return "Hard";
	if (calculateGroupId(guess, app.guesses[ri-1]) === app.guessGroupIds[ri-1] ) {
		return "Hard";
	} else {
		return "Easy";
	}
}

/** 
 * ProcessGuess(guess).
 * Processes the guess assuming guessString 
 * is the latest guess and ri is its row index.
 * Returns true for a "perfect" guess.
 */
function processGuess(guess: string, ri: number): boolean {

	let perfectGuess: boolean;

	// Initialize guesses[ri]
	app.guesses[ri] = guess;

	/** answers[answerIndex].
	 * An array of remaining answers before the row's guess. */	
	let answers: string[] = [];

	// Initialize answers[ri].
	if (ri === 0) answers = words.answers;
	else answers = app.guessGroups[ri-1].split(" ");	
	app.nAnswers[ri]= answers.length;

	// Initialize guessGroupId and guessGroupIds[ri].
	let guessGroupId = "";
	if ( app.mode === GameMode.solver ) {
		if (ri < app.nGuesses) {
			// In Solver mode, the user entered letter
			// are used to calculate guessGroupIds[ri].
			 guessGroupId = app.guessGroupIds[ri];	
		} else {
			// Calculate a fake guessGroupId so that later
			// a new Map can be created for game.groups[ri]
			guessGroupId = calculateGroupId(answers[0], guess);
		}
	} else {
		guessGroupId = calculateGroupId(app.solution, guess);
		app.guessGroupIds[ri] = guessGroupId;	
	}

	// Create the groups map.
	app.groups[ri] = new Map([[guessGroupId, undefined]]);
	for (let a = 0; a < answers.length; a++) {
		let gid = calculateGroupId(answers[a], guess);
		let gList = app.groups[ri].get(gid);
		if (gList === undefined) app.groups[ri].set(gid, answers[a]);
		else app.groups[ri].set(gid, (gList + " " + answers[a]));
	}

	// Calculate nGroups and perfectGuess.
	app.nGroups[ri] = app.groups[ri].size;
	if (app.nGroups[ri] === app.nAnswers[ri] || ri === (ROWS-1)) 
		perfectGuess = true;
	else perfectGuess = false;

	if ( ri < app.nGuesses || app.mode != GameMode.solver ) {
		// Find guessGroup and remove it from groups.
		app.guessGroups[ri]  = app.groups[ri].get(app.guessGroupIds[ri]);
		if (app.guessGroups[ri] === undefined) {
			app.errorString =`No possible solutions left. Did you enter ` +
			`some color(s) wrong? Or perhaps the other Wordle's solution ` + 
			`dictionary is not the same as mine. Click the refresh icon ` +
			`to try again.`;
			let e = new Error('processGroups: No possible solutions left.');
			// console.log(e);
			throw e; 
		} else app.groups[ri].delete(app.guessGroupIds[ri]);
	}

	// If this score is the best found so far, save it.
	if (app.nGroups[ri] > app.nGroupsBot[ri] && ri > 0) copyHumanToBot(ri);

	return perfectGuess;
}

export function randomSample(anArray: Array<any>) {
	let i: number = Math.random() * anArray.length;
	let [rs] = anArray.splice(i, 1);
	// console.log("randomSample", rs, anArray);
	return rs;
}

function copyHumanToBot(ri: number) {
	app.nGroupsBot[ri] = app.nGroups[ri];
	app.guessesBot[ri] = app.guesses[ri];
	app.guessGroupIdsBot[ri] = app.guessGroupIds[ri];
	app.guessGroupsBot[ri] = app.guessGroups[ri];
	app.groupsBot[ri] = app.groups[ri];
}

export class GameState extends Storable {
	public active: boolean;
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
	/** botWords is the max number of words the
	 * bot will search for the best possible guess.
	 */
	public botWords = 500;
	public errorString :string = "";

	#valid = false;
	mode: GameMode;

	/** For each row, a map of 
	 * space separated eliminated answers keyed to groupId. */	
	public groups: Array<Map<string, string>> = [];
	public groupsBot: Array<Map<string, string>> = [];
	/** nAnswers[rowIndex]. 
	 * For each row, the number of remaining 
	 * answers before the row's guess. */
	public nAnswers = Array<number>(ROWS+1).fill(0);
	/** nGroups[rowIndex]. 
	 * Number of groups created by the row guess.
	 * "Bot" parameters are used to store
	 * the best (maximum) nGroups found so far. */
	public nGroups = Array<number>(ROWS+1).fill(0);
	public nGroupsBot = Array<number>(ROWS+1).fill(0);
	/** guesses[rowIndex]. 
	 * Array of each row's guess. 
	 * guesses is an alias for board.words. */
	public guesses = Array<string>(ROWS+1).fill("");
	public guessesBot = Array<string>(ROWS+1).fill("");
	/** guessGroupIds[rowIndex]. 
	 * GroupId of the row's guess. */
	public guessGroupIds = Array<string>(ROWS+1).fill("");
	public guessGroupIdsBot = Array<string>(ROWS+1).fill("");
	/** guessGroups[rowIndex]. 
	 * For each row, a space separated list of 
	 * answers remaining after the guess. */
	public guessGroups = Array<string>(ROWS+1).fill("");
	public guessGroupsBot = Array<string>(ROWS+1).fill("");

	constructor(mode: GameMode, data?: string) {
		super();
		this.mode = mode;
		// if (data) {
		// 	this.parse(data);
		// }
		if (!this.#valid) {
			this.active = true;
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
		app = this;
		console.log("app = new GameState:", app);
		// console.log(new Error().stack); 
	}

	get latestWord() {
		return this.board.guesses[this.nGuesses];
	}

	get lastState() {
		return this.board.state[this.nGuesses - 1];
	}

	get lastWord() {
		return this.board.guesses[this.nGuesses - 1];
	}

	/** The Bot processes the latest human guess
	 *  and searches for its next guess. */
	updateBot() {
		// Set ri for this guess.
		let ri = this.nGuesses - 1;
		let humanGuess = app.guesses[ri];

		// Randomly pick a hard mode opener for the first guess.
		if (ri === 0) {
			let openersArray = this.openers.split(" ");
			let botGuess = randomSample(openersArray);
			// Force the bot opener to be different than the human opener.
			if (botGuess === humanGuess) botGuess = randomSample(openersArray);;
			processGuess(botGuess, ri);
			copyHumanToBot(ri);
		}

		try {
			// Process this guess.
			processGuess(humanGuess, ri);

			if (this.guessGroupIds[ri] !== "#####") {
				// Advance ri 1 guess for bot to look for best possible guesses.
				ri = this.nGuesses;

				// Search for the best posssible hard mode guess.
				this.guessGroups[ri-1].split(" ").some(aGuess => {processGuess(aGuess, ri);});

				// Search for the best possible easy mode guess.
				if (!appSettings.hard[this.mode] && this.nGroupsBot[ri] !== this.nAnswers[ri]) {
					words.answers.slice(0, app.botWords).some(aGuess => {processGuess(aGuess, ri);});
				}

				// Revert 1 guess so human can take their turn.
				this.guesses[ri] = "";
				ri = this.nGuesses - 1;
			}

		} catch (e) {
			// console.log("GameState.update: ", e);
			throw e; // throw the error up the chain
		}; 

		// console.log(`GameState.update() completed for guess ${this.guesses}.`);
		app = this;
		console.log("GameState:", this);
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
		this.active = parsed.active;
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
	public dark = true;
	public colorblind = false;
	public tutorial: 0 | 1 | 2 | 3 = 3;

	constructor(settings?: string) {
		super();
		if (settings) {
			const parsed = JSON.parse(settings) as Settings;
			this.hard = parsed.hard;
			this.dark = parsed.dark;
			this.colorblind = parsed.colorblind;
			this.tutorial = parsed.tutorial;
		}
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
	/**
	 * IMPORTANT: When this method is called svelte will not register the update, so you need to set
	 * the variable that this object is assigned to equal to itself to force an update.
	 * Example: `states = states;`.
	 */
	addWin(guesses: number, mode: Mode) {
		++this.guesses[guesses];
		++this.played;
		if (this.#hasStreak) {
			this.streak = mode.seed - this.lastGame > mode.unit ? 1 : this.streak + 1;
			this.maxStreak = Math.max(this.streak, this.maxStreak);
		}
		this.lastGame = mode.seed;
	}
	/**
	 * IMPORTANT: When this method is called svelte will not register the update, so you need to set
	 * the variable that this object is assigned to equal to itself to force an update.
	 * Example: `states = states;`.
	 */
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
	};
	/**
	 * IMPORTANT: When this method is called svelte will not register the update, so you need to set
	 * the variable that this object is assigned to equal to itself to force an update.
	 * Example: `states = states;`.
	 */
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

export function failed(s: GameState) {
	return !(s.active || (s.nGuesses > 0 && s.board.state[s.nGuesses - 1].join("") === "🟩".repeat(COLS)));
}

export class TreeNode implements TreeNodeInterface 
{ 
  public parent: TreeNodeInterface | null; 
  public kids: TreeNodeInterface[] = [];

  constructor(parent: TreeNodeInterface | null)
  { 
    this.parent = parent; 
    if (this.parent) this.parent.kids.push(this); 
  } 
}

export interface TreeNodeInterface 
{ 
  parent: TreeNodeInterface | null; 
  kids: TreeNodeInterface[]; 
}

export function calculateBotTree(rootGuess: string, rootGuessId: string) {
	const maxNodes = 10000;
	 /** max allowed parent node ri */
	const riMax = 3;
	let leaves = 0;
	let nodes = 0;
	let map: BotMap;

	function createHardModeKids(pNode: BotNode) {
		if (nodes > maxNodes) return;

		pNode.map.forEach(([ pGroup, pPerfectKid, pMaxGroupsKid, pSumOfSquaresKid ], groupId) => {
			for (let gi = 0; gi < pGroup.length; gi++) {
				map = calculateGroups(pGroup[gi], pGroup);
				if ( map.size === pGroup.length) {
					pPerfectKid = new BotNode(pNode, pNode.ri + 1, pGroup[gi], map);
					pNode.map.set(groupId, [ pGroup, pPerfectKid, pMaxGroupsKid, pSumOfSquaresKid ]);
					nodes++;
					console.log("pPerfectKid:", pPerfectKid);
					return;
				}
				if (pMaxGroupsKid === null || map.size > pMaxGroupsKid.nGroups) {
					pMaxGroupsKid = new BotNode(pNode, pNode.ri + 1, pGroup[gi], map);
					pNode.map.set(groupId, [ pGroup, pPerfectKid, pMaxGroupsKid, pSumOfSquaresKid ]);
					nodes++;
				} 
			}
			// if (pMaxGroupsKid !== null) {
				console.log("pMaxGroupsKid:", pMaxGroupsKid);
				createHardModeKids(pMaxGroupsKid);
			// }
		});
	}

	map = calculateGroups(rootGuess, words.answers);
	let map2: BotMap = new Map<string, BotMapTuple >;
	map2.set(rootGuessId, map.get(rootGuessId));
	botRoot = new BotNode(null, 0, rootGuess, map2);

	createHardModeKids(botRoot);

	console.log("leaves, nodes, botRoot:", leaves, nodes, botRoot);
}

/** calculateGroups returns a map<groupId key, group array>
 * of the groups given the guess and the pg (parent group) of
 * words remaining before the guess.
 */
export function calculateGroups(guess: string, pg: Array<string>) {
	let group: Array<string>;
	let tuple: BotMapTuple;
	let map: BotMap = new Map<string, BotMapTuple>;
	let gid: string;
	for (let a = 0; a < pg.length; a++) {
		gid = calculateGroupId(pg[a], guess);
		tuple = map.get(gid);
		(tuple === undefined) ? group = undefined : group = tuple[0];
		if (group === undefined) {
			group = new Array<string>;
			group.push(pg[a]);
			map.set(gid, [group, null, null, null]);
		}
		else group.push(pg[a]);
	}
	return map;
}

export type BotMapTuple = [Array<string>, BotNode | null, BotNode | null, BotNode | null];

//** Map<groupId, [group, perfectKid, maxGroupsKid, minSumOfSquaresKid] > */
export type BotMap = Map< string, BotMapTuple>;

/** A BotNode represents
 * a guess before it gets its colors. */	
export class BotNode // extends TreeNode 
{ 
	public parent: BotNode | null;
	public ri: number;
	public guess: string;
	/** guess divides the parent group  
	 * remaining words into nGroups = map.size. */
	public nGroups: number;
	/** sum of each group.length^2 */
	public sumOfSquares: number; 

	//** map<groupId, [group, perfectKid, maxGroupsKid, minSumOfSquaresKid] > */
	public map: BotMap;
 
	constructor(parent: BotNode, ri: number, guess: string, map: BotMap )
	{ 
		this.parent = parent;
		this.ri = ri;
		this.guess = guess;
		this.map = map;
		this.nGroups = map.size;
		this.sumOfSquares = map.size;
	}

  	isLeaf() { 
		return (this.nGroups === 1 && [this.map.values()].length === 1); 
	}

}