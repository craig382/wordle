import seedRandom from "seedrandom";
import { GameMode, ms } from "./enums";
import wordList from "./words_5";

export const ROWS: number = 6;
export const COLS: number = 5;
/** botWords is the max number of words the
 * bot will search for the best possible guess.
 */
const botWords = 300;
export let game: GameState;

export const words = {
	...wordList,
	contains: (word: string) => {
		return wordList.answers.includes(word) || wordList.otherGuesses.includes(word);
	},
};

class BotAnswer {
	/** A remaining answer. */	
	answer: string = "";
	/* Each remaining answer is given a groupId. */	
	groupId: string = "";

	constructor(answer?: string, groupId?: string) {
		if (answer) this.answer = answer;
		if (groupId) this.groupId = groupId;
	}
}

function compareGroupId(a1:BotAnswer, a2:BotAnswer):number {
	if (a1.groupId > a2.groupId) return 1;
	if (a1.groupId < a2.groupId) return -1;
	return 0;
}

export function countOfAinB(a: string, b: string): number {
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
	return groupId;
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

/** pattern returns the color pattern of a groupId. */
export function pattern(groupId: string): string {
	let p = "";
	for (let i = 0; i < groupId.length; i++) {
		if (groupId[i] === "-") p += "⬛";
		else if (groupId[i] >= "a") p += "🟨";
		else p += "🟩";
	}
	return p;
}

/** 
 * ProcessGroups[guess, gameOut].
 * Creates and scores groups assuming guess 
 * is the latest guess. Outputs to gameOut.
 * Returns true for a score < 1.
 */
function processGroups(guess: string): boolean {

	/** answers[answerIndex].
	 * A list of remaining answers before the row's guess. */	
	let answers: BotAnswer[] = [];

	/** ri is Row Index. */
	let ri = game.nGuesses - 1;

	// Initialize this.answer[ri] and this.otherGuess[ri].
	const guessGroupId = calculateGroupId(game.solution, guess);
	game.guessGroupIds[ri] = guessGroupId;

	answers = [new BotAnswer];
	if (ri === 0) {
		for (let ai in words.answers) {
			answers[ai] = new BotAnswer(words.answers[ai]);
		}
	} else { 
		answers = [new BotAnswer];
		game.guessGroups[ri-1].split(" ").map(a => {
			answers.push(new BotAnswer(a));
		});
		answers.shift();
	}
	game.nAnswers[ri]= answers.length;

	// Calculate groupId for each ansswer.
	answers.map(a => a.groupId = calculateGroupId(a.answer, guess));

	// Sort the answer array by groupID.
	answers.sort( (a1, a2) => compareGroupId(a1, a2) );

	// Parse the sorted answers into groups.
	let gid = answers[0].groupId;
	let gList = "";
	game.groups[ri] = new Map([[gid, gList]]);
	let fromIndex = 0;
	let lastIndex = answers.length - 1;
	for (let ai = 1; ai <= lastIndex; ++ai) {
		if (answers[ai].groupId != answers[ai - 1].groupId) {
			gList = answers.map(a => a.answer).slice(fromIndex, ai).join(" ");
			game.groups[ri].set(gid, gList);
			fromIndex = ai;
			gid = answers[ai].groupId;
		}
	}
	gList = answers.map(a => a.answer).slice(fromIndex).join(" ");
	game.groups[ri].set(gid, gList);
	game.guessGroups[ri]  = game.groups[ri].get(game.guessGroupIds[ri]);
	game.groups[ri].delete(game.guessGroupIds[ri]);

	// Calculate group part of score as long as this is not guess 6.
	if (ri < (ROWS-1)) {
		game.scores[ri] = game.nAnswers[ri] - game.groups[ri].size - 1;
	}

	// Add 0.5 penalty points to rowScore if the guess is not a remaining answer.
	if (answers.filter((tw) => countOfAinB(guess, tw.answer)).length === 0) {
		game.scores[ri] += 0.5;
	};

	// If this score is the best found so far, save it.
	if (game.scores[ri] < game.scoresEasy[ri]) {
		game.nAnswersEasy[ri] = game.nAnswers[ri];
		game.scoresEasy[ri] = game.scores[ri];
		game.guessesEasy[ri] = guess;
		game.guessGroupIdsEasy[ri] = game.guessGroupIds[ri];
		game.guessGroupsEasy[ri] = game.guessGroups[ri];
	}

	return (game.scores[ri] < 1);
}

export class GameState extends Storable {
	public active: boolean;
	public nGuesses: number;
	public validHard: boolean;
	public time: number;
	public solutionNumber: number;
	public solution: string;
	public board: GameBoard;

	#valid = false;
	#mode: GameMode;

	/** For each row, a map space separated eliminated answers keyed to groupId. */	
	public groups: Array<Map<string, string>> = [];
	/** nAnswers[rowIndex]. 
	 * For each row, the number of remaining answers before the row's guess. */
	public nAnswers = Array<number>(ROWS+1).fill(0);
	public nAnswersHard = Array<number>(ROWS+1).fill(0);
	public nAnswersEasy = Array<number>(ROWS+1).fill(0);
	/** rowScores[rowIndex]. 
	 * Each row is given a score.
	 * "Soft" parameters are used to store
	 * the best score found so far. */
	public scores = Array<number>(ROWS+1).fill(0);
	public scoresHard = Array<number>(ROWS+1).fill(0);
	public scoresEasy = Array<number>(ROWS+1).fill(100000);
	/** guesses[rowIndex]. 
	 * Array of each row's guess. 
	 * guesses is an alias for board.words. */
	public guesses = Array<string>(ROWS+1).fill("");
	public guessesHard = Array<string>(ROWS+1).fill("");
	public guessesEasy = Array<string>(ROWS+1).fill("");
	/** guessGroupIds[rowIndex]. 
	 * GroupId of the row's guess. */
	public guessGroupIds = Array<string>(ROWS+1).fill("");
	public guessGroupIdsHard = Array<string>(ROWS+1).fill("");
	public guessGroupIdsEasy = Array<string>(ROWS+1).fill("");
	/** guessGroups[rowIndex]. 
	 * For each row, a comma separated list of answers 
	 * remaining after the guess. */
	public guessGroups = Array<string>(ROWS+1).fill("");
	public guessGroupsHard = Array<string>(ROWS+1).fill("");
	public guessGroupsEasy = Array<string>(ROWS+1).fill("");

	constructor(mode: GameMode, data?: string) {
		super();
		this.#mode = mode;
		if (data) {
			this.parse(data);
		}
		if (!this.#valid) {
			this.active = true;
			this.nGuesses = 0;
			this.validHard = true;
			this.time = modeData.modes[mode].seed;
			this.solutionNumber = getWordNumber(mode);
			let solutionIndex = seededRandomInt(0, words.answers.length, this.time);
			this.solution = words.answers[solutionIndex];
			this.board = {
				words: Array(ROWS).fill(""),
				state: Array.from({ length: ROWS }, () => (Array(COLS).fill("🔳"))),
			};

			this.guesses = this.board.words;
			this.#valid = true;
		}
		game = this;
		// console.log(this);
	}

	get latestWord() {
		return this.board.words[this.nGuesses];
	}

	get lastState() {
		return this.board.state[this.nGuesses - 1];
	}

	get lastWord() {
		return this.board.words[this.nGuesses - 1];
	}
	
	update() {

		// Process this guess.
		processGroups(this.lastWord);

		// Advance 1 guess for bot to look for best possible guesses.
		this.nGuesses++;
		let ri = this.nGuesses - 1;

		// Search for the best posssible hard mode guess.
		this.guessGroups[ri-1].split(" ").some(aGuess => {processGroups(aGuess);});
		this.nAnswersHard[ri] = this.nAnswersEasy[ri];
		this.scoresHard[ri] = this.scoresEasy[ri];
		this.guessesHard[ri] = this.guessesEasy[ri];
		this.guessGroupIdsHard[ri] = this.guessGroupIdsEasy[ri];
		this.guessGroupsHard[ri] = this.guessGroupsEasy[ri];

		// Search for the best possible soft mode guess.
		if ((this.scoresHard[ri] !== 0) || (ri === 0)) {
			words.answers.slice(0, botWords).some(aGuess => {processGroups(aGuess);});
		}

		// Revert 1 guess so human can take their turn.
		this.nGuesses--;

		// console.log(`GameState.update() completed for guess ${this.guesses}.`);
		console.log(this);
	}

	/**
	* Returns an object containing the position of the character in the latest word that violates
	* hard mode, and what type of violation it is, if there is a violation.
	*/
	checkHardMode(): HardModeData {
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[this.nGuesses - 1][i] === "🟩" && this.board.words[this.nGuesses - 1][i] !== this.board.words[this.nGuesses][i]) {
				return { pos: i, char: this.board.words[this.nGuesses - 1][i], type: "🟩" };
			}
		}
		for (let i = 0; i < COLS; ++i) {
			if (this.board.state[this.nGuesses - 1][i] === "🟨" && !this.board.words[this.nGuesses].includes(this.board.words[this.nGuesses - 1][i])) {
				return { pos: i, char: this.board.words[this.nGuesses - 1][i], type: "🟨" };
			}
		}
		return { pos: -1, char: "", type: "⬛" };
	}

	guess(solution: string) {
		const guessColors = Array<LetterState>(COLS).fill("⬛");
		const guessGroupId = calculateGroupId(solution, this.latestWord);
		for (let c =0; c < COLS; c++) {
			if (guessGroupId[c] === "-") continue;
			if (guessGroupId[c] <= "Z") { guessColors[c] = "🟩"; }
			else { guessColors[c] = "🟨"; }
		}
		return guessColors;
	}

	private parse(str: string) {
		const parsed = JSON.parse(str) as GameState;
		if (parsed.solutionNumber !== getWordNumber(this.#mode)) return;
		this.active = parsed.active;
		this.nGuesses = parsed.nGuesses;
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
	return !(s.active || (s.nGuesses > 0 && s.board.state[s.nGuesses - 1].join("") === "🟩".repeat(COLS)));
}