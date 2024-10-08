/** A list of words of the same length */
type Words = WordData & {
	contains: (word: string) => boolean;
};

type WordData = {
	/** A list of possible answers to guess */
	answers: string[];
	/** A list of allowed other guesses that cannot be the wordle answer */
	otherGuesses: string[];
};

type RowData = {
	length: number;
	guess: number;
};

/** undefined | blank | yellow | green */
type LetterState = "🔳" | "⬛" | "🟨" | "🟩";

type GameBoard = {
	guesses: string[],
	state: LetterState[][],
};

type SettingType = "switch" | "dropdown" | "custom";

type DictionaryEntry = {
	word: string;
	phonetic: string;
	phonetics: Phonetic[];
	origin: string;
	meanings: Meaning[];
};

type Meaning = {
	partOfSpeech: string;
	definitions: Definition[];
};

type Definition = {
	definition: string;
	synonyms: string[];
	antonyms: any[];
	example?: string;
};

type Phonetic = {
	text: string;
	audio: string;
};

type Guesses = {
	"1": number;
	"2": number;
	"3": number;
	"4": number;
	"5": number;
	"6": number;
	"fail": number;
};

type ModeData = {
	default: GameMode,
	modes: Mode[],
};

type Mode = {
	name: string,
	unit: number,
	start: number,
	seed: number,
	historical: boolean,
	icon?: string,
	streak?: boolean,
	useTimeZone?: boolean,
};

type HardModeData = {
	pos: number,
	char: string,
	type: "🟩" | "🟨" | "⬛",
};

type Subscriber<T> = [(val: T) => void, (val?: T) => void];

type Direction = "top" | "right" | "bottom" | "left";

type Swipe = CustomEvent<{ direction: Direction; }>;

type GangTuple = [
	group: Array<string>, 
	kids: KidTuple,
	groupNodes: Array<BotNode>,
];

type KidTuple = [
	perfectKid: boolean,
	maxGroupsKidHard: BotNode, 
	maxGroupsKidEasy: BotNode,
	minSumOfSquaresKidHard: BotNode,
	minSumOfSquaresKidEasy: BotNode
]

//** Map< groupId, BotMapTuple > */
type Gangs = Map< string, GangTuple >;

type BotNodeTuple = [
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

	maxGroupsKidEasy: BotNode, // 12

	/** truncated list of words left after for stat screen */
	statWordListAfter: string, // 13
	groupPercent: number, // 14
	largestGroup: number, // 15
	largestGroupPercent: number, // 16
	eliminatedPercent: number, // 17

	/** maxGroupsSibEasy (sibling) is the maxGroupsKidEasy of this node's parent */
	maxGroupsSibEasy: BotNode, // 18

	wordListAfterOld: string, // 19
	/** truncated list of words left after for stat screen */
	statWordListAfterOld: string, // 20
]