import { GameMode, BotNode } from "./utils";

/** A list of words of the same length */
export type Words = WordData & {
	contains: (word: string) => boolean;
};

export type WordData = {
	/** A list of possible answers to guess */
	answers: string[];
	/** A list of allowed other guesses that 
	 * cannot be the wordle answer */
	otherGuesses: string[];
};

export type RowData = {
	length: number;
	guess: number;
};

/** undefined | blank | yellow | green */
export type LetterState = "🔳" | "⬛" | "🟨" | "🟩";

export type GameBoard = {
	guesses: string[],
	state: LetterState[][],
};

export type SettingType = "switch" | "dropdown" | "custom";

export type DictionaryEntry = {
	word: string;
	phonetic: string;
	phonetics: Phonetic[];
	origin: string;
	meanings: Meaning[];
};

export type Meaning = {
	partOfSpeech: string;
	definitions: Definition[];
};

export type Definition = {
	definition: string;
	synonyms: string[];
	antonyms: any[];
	examples?: string[];
};

export type Phonetic = {
	text: string;
	audio: string;
};

export type Guesses = {
	"1": number;
	"2": number;
	"3": number;
	"4": number;
	"5": number;
	"6": number;
	"fail": number;
};

export type ModeData = {
	default: GameMode,
	modes: Mode[],
};

export type Mode = {
	name: string,
	unit: number,
	start: number,
	seed: number,
	icon?: string,
	streak?: boolean,
	useTimeZone?: boolean,
};

export type HardModeData = {
	pos: number,
	char: string,
	type: "🟩" | "🟨" | "⬛",
};

export type Subscriber<T> = [(val: T) => void, (val?: T) => void];

export type Direction = "top" | "right" | "bottom" | "left";

export type Swipe = CustomEvent<{ direction: Direction; }>;

export type GangTuple = [
	group: Array<string>, 
	kids: KidTuple,
	groupNodes: Array<BotNode>,
];

export type KidTuple = [
	perfectKid: boolean,
	maxGroupsKidHard: BotNode | null, 
	maxGroupsKidEasy: BotNode | null,
	minSumOfSquaresKidHard: BotNode | null,
	minSumOfSquaresKidEasy: BotNode | null
];

//** Map< groupId, BotMapTuple > */
export type Gangs = Map< string, GangTuple >;

export type BotNodeTuple = [
	guess: string, // 0
	ri: number, // 1
	nGroups: number, // 2
	sumOfSquares: number, // 3
	wordListBefore: string, // 4
	nWordsBefore: number, // 5
	easyOrHard: string, // 6

	guessId: string, // 7
	colorString: string, // 8
	nWordsEliminated: number, // 9
	wordListAfter: string, // 10
	nWordsAfter: number, // 11

	maxGroupsKidEasy: BotNode | null, // 12

	/** truncated list of words left after for stat screen */
	statWordListAfter: string, // 13
	groupPercent: number, // 14
	largestGroup: number, // 15
	largestGroupPercent: number, // 16
	eliminatedPercent: number, // 17

	/** maxGroupsSibEasy/Hard (sibling) is the maxGroupsKidEasy/Hard of this node's parent */
	maxGroupsSibEasy: BotNode | null, // 18
	maxGroupsSibHard: BotNode | null, // 19

	skillPercent: number, // 20
	skillGrade: string, // 21
];

/** maps part of speech pos to the defs array */
export type PosMap = Record<string, string[]>;

/** In a WordMap, the word is used as a key to 
 * lookup a WordEntry that containsthe the english 
 * pronunciations enprs and the parts of speech map. */
export type WordEntry = {
	enprs?: string[];
	pMap: PosMap;
};

/** maps word to WordEntry */
export type WordMap = Record<string, WordEntry>;
