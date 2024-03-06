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

type BotMapTuple = [
	group: Array<string>, 
	perfectKid: boolean,
	maxGroupsKidHard: BotNode, 
	maxGroupsKidEasy: BotNode,
	minSumOfSquaresKidHard: BotNode,
	minSumOfSquaresKidEasy: BotNode
];

//** Map< groupId, BotMapTuple > */
type BotMap = Map< string, BotMapTuple >;

type BotRowArray = Array<BotNode>;

type BotNodeTuple = [
	guess: string,
	ri: number,
	nGroups: number,
	sumOfSquares: number,
	wordListBefore: string,
	wordsLeftBefore: number,
	easyOrHard: string,

	guessId: string,
	colorString: string,
	wordsEliminated: number,
	wordListAfter: string,
	wordsLeftAfter: number,
]