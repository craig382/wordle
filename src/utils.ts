import seedRandom from "seedrandom";
import { GameMode, ms } from "./enums";
import wordList from "./words_5";

export const ROWS: number = 6;
export const COLS: number = 5;

export const words = {
	...wordList,
	contains: (word: string) => {
		return wordList.answers.includes(word) || wordList.otherGuesses.includes(word);
	},
};

class BotGroup {
	/** The BotGroup consists of answer[fromIndex]..answer[toIndex]. */	
	fromIndex: number = 0;
	/** The BotGroup consists of answer[fromIndex]..answer[toIndex]. */	
	toIndex: number = 0;
	/** The BotGroup is given a score (penalty 
	 * points) equal to (BotGroup.Length - 1). */	
	score: number = 0;
	constructor(fromIndex = 0, toIndex = 0, score = 0) {
		this.fromIndex = fromIndex;
		this.toIndex = toIndex;
		this.score = score;
	}
}

class BotAnswer {
	/** A remaining answer. */	
	answer: string = "";
	/* Each remaining answer is given a groupId. */	
	groupId: string = "";
}

function countOfAinB(a: string, b: string): number {
	return b.split(a).length -1;
}

function calculateGroupId(key: string, test: string): string {
	let keyChar = key.split("");
	let testChar = test.split("");
	let groupChar = Array<string>(COLS).fill("-");
	let ti: number;
	for (let i in testChar) {
		if (testChar[i] === keyChar[i]) {
			groupChar[i] = testChar[i].toUpperCase();
			testChar[i] = "$";
			keyChar[i] = "#";
		}
	}
	for (let i in testChar) {
		ti = keyChar.indexOf(testChar[i]);
		if (ti >= 0) {
			groupChar[i] = testChar[i];
			testChar[i] = "+";
			keyChar[ti] = "+";
		}
	}
	let groupId = groupChar.join("");
	// console.log("key:", key, keyChar.join(""), "test:", test, testChar.join(""), "groupId:", groupId);
	return groupId;
}

export class GameBot {
	/** answer[rowIndex, answerIndex].
	 * For each row, a list of remaining answers. */	
	public answer: BotAnswer[][] = [];
	/** otherGuess[rowIndex, otherGuessIndex].
	 * For each row, a list of remaining other guesses. */	
	public otherGuess: string[][] = [];
	/** group[rowIndex, groupIndex].
	 * For each row, a list of answer groups. */	
	public group: BotGroup[][] = [];
	/** rowScore[rowIndex]. 
	 * Each row is given a score. */
	public rowScore = Array<number>(ROWS).fill(0);
	/** runningScore[rowIndex].
	 * The sum of all rowScores up to including the rowIndex row. */	
	public runningScore = Array<number>(ROWS).fill(0);

	update(game: GameState) {
		/** ri is Row Index. */
		let ri = game.guesses - 1;

		// Initialize this.answer[ri] and this.otherGuess[ri].
		if (ri === 0) {
			this.answer[0] = [new BotAnswer];
			for (let ai in words.answers) {
				this.answer[ri][ai] = new BotAnswer;
				this.answer[ri][ai].answer = words.answers[ai];
			}
			this.otherGuess[ri] = words.otherGuesses;
		} else { 
			this.answer[ri] = this.answer[ri-1];
			this.otherGuess[ri] = this.otherGuess[ri-1];
		}

		// Filter answer and otherGuess arrays.

		// Calculate groupId for each ansswer.
		for (let ai in this.answer[ri]) {
			this.answer[ri][ai].groupId = calculateGroupId(game.board.words[game.guesses -1], this.answer[ri][ai].answer);
		}

		// Sort the answer array by groupID.
		this.answer[ri].sort( (a1,a2) => {
			if (a1.groupId > a2.groupId) {
				return 1;
			}
			if (a1.groupId < a2.groupId) {
				return -1;
			}
			return 0;
		})

		// Parse the sorted answers into groups.
		let gi = 0;
		let fromIndex = 0;
		let lastIndex = this.answer[ri].length - 1;
		let score = 0;
		this.group[ri] = [new BotGroup];		
		for (let ai = 1; ai <= lastIndex; ++ai) {
			if (this.answer[ri][ai].groupId != this.answer[ri][ai - 1].groupId) {
				score = ai - fromIndex - 1;
				this.group[ri][gi] = new BotGroup(fromIndex, ai - 1, score);
				this.rowScore[ri] += score;
				gi++;
				fromIndex = ai;
			}
		}
		score = lastIndex - fromIndex;
		this.group[ri][gi] = new BotGroup(fromIndex, lastIndex, score);
		this.rowScore[ri] += score;
		if (ri > 0) {
			this.runningScore[ri] = this.runningScore[ri - 1] + this.rowScore[ri];
		} else {
			this.runningScore[ri] = this.rowScore[ri];
		}
	}
}

class Tile {
	public value: string;
	public notSet: Set<string>;

	constructor() {
		this.notSet = new Set<string>();
	}

	not(char: string) {
		this.notSet.add(char);
	}
}

class WordData {
	public letterCounts: Map<string, [number, boolean]>;
	private notSet: Set<string>;
	public word: Tile[];

	constructor() {
		this.notSet = new Set<string>();
		this.letterCounts = new Map<string, [number, boolean]>();
		this.word = [];
		for (let col = 0; col < COLS; ++col) {
			this.word.push(new Tile());
		}
	}
	
	confirmCount(char: string) {
		let c = this.letterCounts.get(char);
		if (!c) {
			this.not(char);
		} else {
			c[1] = true;
		}
	}

	countConfirmed(char: string) {
		const val = this.letterCounts.get(char);
		return val ? val[1] : false;
	}

	setCount(char: string, count: number) {
		let c = this.letterCounts.get(char);
		if (!c) {
			this.letterCounts.set(char, [count, false]);
		} else {
			c[0] = count;
		}
	}

	incrementCount(char: string) {
		++this.letterCounts.get(char)[0];
	}

	not(char: string) {
		this.notSet.add(char);
	}

	inGlobalNotList(char: string) {
		return this.notSet.has(char);
	
	}
	lettersNotAt(pos: number) {
		return new Set([...this.notSet, ...this.word[pos].notSet]);
	}
}

export function getRowData(n: number, board: GameBoard) {
	const wd = new WordData();
	for (let row = 0; row < n; ++row) {
		const occurred = new Set<string>();
		for (let col = 0; col < COLS; ++col) {
			const state = board.state[row][col];
			const char = board.words[row][col];
			if (state === "⬛") { // char not in solution
				wd.confirmCount(char);
				// if char isn't in the global not list add it to the not list for that position
				if (!wd.inGlobalNotList(char)) {
					wd.word[col].not(char);
				}
				continue;
			}
			if (occurred.has(char)) { 
				// this letter has already been seen in this row
				wd.incrementCount(char);
			} else if (!wd.countConfirmed(char)) { 
				// this is the first time seeing this letter in this row
				occurred.add(char);
				wd.setCount(char, 1);
			}
			if (state === "🟩") { // if letter found in correct spot
				wd.word[col].value = char; // set the filter for this column to the found letter
			}
			else {	// if (state === "🟨") if letter found in wrong spot
				wd.word[col].not(char); // add letter to the global not list
			}
		}
	}

	let exp = "";
	for (let pos = 0; pos < wd.word.length; ++pos) {
		exp += wd.word[pos].value ? wd.word[pos].value : `[^${[...wd.lettersNotAt(pos)].join("")}]`;
	}

	console.log("before guessing:", board.words[n], "RegExp:", exp, "GameBoard:", board, "WordData:", wd);

	return (word: string) => {
		if (new RegExp(exp).test(word)) {
			const chars = word.split("");
			for (const e of wd.letterCounts) {
				const occurrences = countOccurrences(chars, e[0]);
				if (occurrences < e[1][0]) {
					// console.log(`${occurrences} "${e[0]}" in "${word}", ${e[1][0]} or more required. RegExp: "${exp}"`);
					return false;
				}
			}
			// console.log(`"${word}" is a possible solution, matches RegExp "${exp}" and occurrences`);
			return true;
		}
		// console.log(`"${word}" does not match RegExp "${exp}"`);
		return false;
	};
}

function countOccurrences<T>(arr: T[], val: T) {
	return arr.reduce((count, v) => v === val ? count + 1 : count, 0);
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
 * Return a deterministic number based on the given mode and current or given time.
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
			icon: "m50,7h100v33c0,40 -35,40 -35,60c0,20 35,20 35,60v33h-100v-33c0,-40 35,-40 35,-60c0,-20 -35,-20 -35,-60z",
			streak: true,
		},
		{
			name: "Infinite",
			unit: ms.SECOND,
			start: 1642428600000,	// 17/01/2022 4:10:00pm UTC+2
			seed: newSeed(GameMode.infinite),
			historical: false,
			icon: "m7,100c0,-50 68,-50 93,0c25,50 93,50 93,0c0,-50 -68,-50 -93,0c-25,50 -93,50 -93,0z",
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
 * Return the word number for the given mode at the time that that mode's seed was set.
 * @param mode - The game mode
 * @param current - If true the word number will be for the current time rather than for the current
 * seed for the given mode. Useful if you want the current game number during a historical game.
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

export class GameState extends Storable {
	public active: boolean;
	public guesses: number;
	public validHard: boolean;
	public time: number;
	public solutionNumber: number;
	public solution: string;
	public board: GameBoard;

	#valid = false;
	#mode: GameMode;

	constructor(mode: GameMode, data?: string) {
		super();
		this.#mode = mode;
		if (data) {
			this.parse(data);
		}
		if (!this.#valid) {
			this.active = true;
			this.guesses = 0;
			this.validHard = true;
			this.time = modeData.modes[mode].seed;
			this.solutionNumber = getWordNumber(mode);
			let solutionIndex = seededRandomInt(0, words.answers.length, this.time);
			this.solution = words.answers[solutionIndex];
			this.board = {
				words: Array(ROWS).fill(""),
				state: Array.from({ length: ROWS }, () => (Array(COLS).fill("🔳"))),
			};

			this.#valid = true;
		}
		// console.log("New GameMode:", this);
	}

	get latestWord() {
		return this.board.words[this.guesses];
	}

	get lastState() {
		return this.board.state[this.guesses - 1];
	}

	get lastWord() {
		return this.board.words[this.guesses - 1];
	}
	
	/**
	* Returns an object containing the position of the character in the latest word that violates
	* hard mode, and what type of violation it is, if there is a violation.
	*/
	checkHardMode(): HardModeData {
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[this.guesses - 1][i] === "🟩" && this.board.words[this.guesses - 1][i] !== this.board.words[this.guesses][i]) {
				return { pos: i, char: this.board.words[this.guesses - 1][i], type: "🟩" };
			}
		}
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[this.guesses - 1][i] === "🟨" && !this.board.words[this.guesses].includes(this.board.words[this.guesses - 1][i])) {
				return { pos: i, char: this.board.words[this.guesses - 1][i], type: "🟨" };
			}
		}
		return { pos: -1, char: "", type: "⬛" };
	}

	guess(solution: string) {
		const solChars = solution.split("");
		const OldResult = Array<LetterState>(COLS).fill("⬛");
		for (let i = 0; i < COLS; ++i) {
			if (solChars[i] === this.latestWord.charAt(i)) {
				OldResult[i] = "🟩"; // letter found in correct spot
				solChars[i] = "$"; // mark letter as found
			}
		}
		for (let i = 0; i < COLS; ++i) {
			const pos = solChars.indexOf(this.latestWord[i]);
			if (OldResult[i] !== "🟩" && pos >= 0) {
				solChars[pos] = "-"; // mark letter as almost found
				OldResult[i] = "🟨"; // letter found in wrong spot
			}
		}

		const guessColors = Array<LetterState>(COLS).fill("⬛");
		const guessGroupId = calculateGroupId(solution, this.latestWord);
		for (let c =0; c < COLS; c++) {
			if (guessGroupId[c] === "-") continue;
			if (guessGroupId[c] <= "Z") { guessColors[c] = "🟩"; }
			else { guessColors[c] = "🟨"; }
		}

		console.log(solution, this.latestWord, guessGroupId, guessColors.join(""));
		return OldResult;
	}

	private parse(str: string) {
		const parsed = JSON.parse(str) as GameState;
		if (parsed.solutionNumber !== getWordNumber(this.#mode)) return;
		this.active = parsed.active;
		this.guesses = parsed.guesses;
		this.validHard = parsed.validHard;
		this.time = parsed.time;
		this.solutionNumber = parsed.solutionNumber;
		this.solution = parsed.solution;
		this.board = parsed.board;

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
				for (let col = 0; col < board.words[row].length; ++col) {
					if (this[board.words[row][col]] === "🔳" || board.state[row][col] === "🟩") {
						this[board.words[row][col]] = board.state[row][col];
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
	return !(s.active || (s.guesses > 0 && s.board.state[s.guesses - 1].join("") === "🟩".repeat(COLS)));
}