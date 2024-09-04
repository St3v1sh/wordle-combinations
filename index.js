var calculationLimit = 20000;
const WORD_LENGTH = 5;
const DEFAULT_LIST_MESSAGE = 'calculating...';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const tiles = document.getElementsByClassName('tile');
const keys = document.getElementsByClassName('key');
const calculateButton = document.getElementById('calculate');
const modal = document.getElementById('calculation-modal');
const modalCloseButton = document.getElementById('modal-close-btn');
const outputList = document.getElementById('list');

/** @type {HTMLInputElement} */
const cheatButton = document.getElementById('cheat');

// States to keep track of tile colors.
class TileState {
    static NONE = new TileState('none');
    static WRONG = new TileState('wrong');
    static RIGHT = new TileState('right');
    static PRESENT = new TileState('present');
    static PRIORITY_LIST = [TileState.NONE, TileState.WRONG, TileState.PRESENT, TileState.RIGHT];

    static getStateFromPriority(priority) {
        return TileState.PRIORITY_LIST[priority];
    }

    constructor(state) {
        this.state = state;
    }

    getPriority() {
        return TileState.PRIORITY_LIST.findIndex(state => state.toString() === this.state);
    }

    toString() {
        return this.state;
    }
}

// Each letter of the right word has rules about what it can or can't be.
class LetterRules {
    constructor(rightLetter) {
        if (rightLetter) {
            this.rightLetter = rightLetter;
        } else {
            this.wrongLetters = new Set();
        }
    }

    // Returns the present letters with the wrong letters removed.
    getPossibleLetters() {
        if (this.rightLetter) {
            return new Set([this.rightLetter]);
        } else {
            return new Set([...LETTERS].filter(letter => !this.wrongLetters.has(letter)));
        }
    }
}

const tileStates = Array(tiles.length).fill(TileState.NONE);
let input = [];

for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index];

    // Add animations to the tiles.
    tile.addEventListener('animationend', function (event) {
        if (event.animationName === 'pulse') {
            tile.classList.remove('pulse');
        } else if (event.animationName === 'flip') {
            tile.classList.remove('flip');
        }
    });

    // Add click functionality to the tiles.
    tile.addEventListener('click', function () {
        cycleState(index);
    })
}

// Add click functionality to the keys.
for (let index = 0; index < keys.length; index++) {
    /** @type {HTMLButtonElement} */
    const key = keys[index];
    const keyValue = key.value.toLowerCase();

    if (LETTERS.includes(keyValue)) {
        key.addEventListener('click', function () {
            addLetter(key.value);
        })
    } else if (keyValue === 'backspace') {
        key.addEventListener('click', function () {
            removeLastLetter();
        })
    } else if (keyValue === 'cycle') {
        key.addEventListener('click', function () {
            cycleState(input.length - 1);
        })
    }
}

// Listen for key presses.
document.addEventListener('keydown', function (event) {
    const key = event.key.toLowerCase();

    if (LETTERS.includes(key) && !event.ctrlKey) {
        addLetter(key);
    } else if (key === 'backspace') {
        removeLastLetter();
    } else if (key === 'enter') {
        const focusedElementIsTile = Array.prototype.some.call(tiles, tile => tile === document.activeElement);
        const focusedElementIsCalculateButton = document.activeElement === calculateButton;
        const focusedElementIsLastInput = document.activeElement === tiles[input.length - 1];
        if (!focusedElementIsCalculateButton && (!focusedElementIsTile || focusedElementIsLastInput)) {
            cycleState(input.length - 1);
        }
    } else if (key === ' ') {
        event.preventDefault();

        if (modal.classList.contains('show-modal')) {
            hideModal();
        } else {
            showModal();
        }
    }
});

cheatButton.addEventListener('click', function () {
    if (modal.classList.contains('show-modal')) {
        outputList.textContent = DEFAULT_LIST_MESSAGE;
        requestIdleCallback(() => {
            calculate();
        });
    }
});

function addLetter(letter) {
    if (input.length >= tiles.length) {
        return;
    }
    input.push(letter);

    const index = input.length - 1;
    tiles[index].textContent = letter;
    tiles[index].classList.add('pulse');
    tiles[index].classList.add(tileStates[index].toString());
}

function removeLastLetter() {
    if (input.length === 0) {
        return;
    }

    const index = input.length - 1;
    const state = tileStates[index];

    tiles[index].textContent = '';
    tiles[index].classList.remove(state.toString());
    tileStates[index] = TileState.NONE;
    const letter = input.pop();

    // Update the keyboard.
    UpdateKeyboard(letter);
}

function cycleState(tileIndex) {
    if (tileIndex < 0 || tileIndex >= input.length) {
        return;
    }

    const state = tileStates[tileIndex];
    const letter = input[tileIndex];

    let newState;
    if (state === TileState.NONE) {
        newState = TileState.WRONG;
    } else if (state === TileState.WRONG) {
        newState = TileState.PRESENT;
    } else if (state === TileState.PRESENT) {
        newState = TileState.RIGHT;
    } else if (state === TileState.RIGHT) {
        newState = TileState.WRONG;
    }
    tileStates[tileIndex] = newState;

    const tile = tiles[tileIndex];
    tile.classList.remove('none');
    tile.classList.remove('pulse');
    tile.classList.remove(state.toString());
    tile.classList.add(newState.toString());
    tile.classList.add('flip');

    // Update the keyboard.
    UpdateKeyboard(letter);
}

function UpdateKeyboard(letter) {
    const key = [...keys].find(key => key.value === letter);
    const highestPriority = Math.max(0, ...tileStates.filter((_, index) => input[index] === letter).map(state => state.getPriority()));
    if (key) {
        TileState.PRIORITY_LIST.forEach(state => key.classList.remove(state.toString()));
        if (highestPriority > 0) {
            key.classList.add(TileState.getStateFromPriority(highestPriority).toString());
        }
    }
}

function calculate() {
    // Check for invalid number of present letters.
    const words = Array.from({ length: Math.ceil(input.length / WORD_LENGTH) }, (_, index) => input.slice(index * WORD_LENGTH, (index + 1) * WORD_LENGTH));
    const wordsFilteredPresentLetters = words.map((word, wordIndex) =>
        word.filter((_, letterIndex) => {
            const state = tileStates[wordIndex * WORD_LENGTH + letterIndex];
            return state === TileState.RIGHT || state === TileState.PRESENT;
        })
    );
    const letterCounter = LETTERS.map(letter =>
        Math.max(...wordsFilteredPresentLetters.map(word =>
            word.filter(presentLetter => presentLetter === letter).length
        ))
    );
    const numberOfPresentLetters = letterCounter.reduce((sum, count) => sum + count, 0);
    if (numberOfPresentLetters > WORD_LENGTH) {
        outputList.textContent = `error: too many letters present`;
        return;
    }

    // Check letters in the same column.
    const columnLength = Math.ceil(input.length / WORD_LENGTH);
    const paddingLength = (WORD_LENGTH - (input.length % WORD_LENGTH)) % WORD_LENGTH;

    const inputWithStates = input.map((letter, index) => [letter, tileStates[index]]).concat(Array(paddingLength).fill(['', TileState.NONE]));
    const transposedStates = inputWithStates.map((_, index) => inputWithStates[(index * WORD_LENGTH + Math.floor(index / columnLength)) % inputWithStates.length]);
    const transposedStatesSliced = Array.from({ length: WORD_LENGTH }, (_, index) => transposedStates.slice(index * columnLength, (index + 1) * columnLength));

    const filteredRightLetterColumns = transposedStatesSliced.map(row => row.filter(([_, state]) => state === TileState.RIGHT).map(([letter]) => letter));
    const setsOfRightLetterColumns = filteredRightLetterColumns.map(row => new Set(row));
    const hasUniqueRightLettersInColumns = input.length <= WORD_LENGTH ? true : setsOfRightLetterColumns.every(column => column.size <= 1);
    if (!hasUniqueRightLettersInColumns) {
        outputList.textContent = `error: multiple right letters in the same column`;
        return;
    }

    // Check for letter contradictions.
    for (let column of transposedStatesSliced) {
        const rightLetters = new Set();
        const wrongLetters = new Set();

        for (let [letter, state] of column) {
            if (state === TileState.RIGHT) {
                rightLetters.add(letter);
            } else if (state === TileState.WRONG || state === TileState.PRESENT) {
                wrongLetters.add(letter);
            }
        }

        if ([...rightLetters].some(letter => wrongLetters.has(letter))) {
            outputList.textContent = `error: a letter cannot be both right and wrong in the same column`;
            return;
        }
    }

    // Set up LetterRules.
    const letterRules = Array.from({ length: WORD_LENGTH }, (_, index) => new LetterRules(setsOfRightLetterColumns[index].values().next().value));

    // Find globally wrong letters.
    const globalWrongLetters = new Set(
        input.filter((letter, index) =>
            tileStates[index] === TileState.WRONG &&
            !tileStates.some((state, tileIndex) =>
                input[tileIndex] === letter && state === TileState.PRESENT
            )
        )
    );

    // Add locally wrong letters to each LetterRules.
    for (let index = 0; index < letterRules.length; index++) {
        const letterRule = letterRules[index];
        let wrongLetters = new Set([...globalWrongLetters]);
        for (let states of transposedStatesSliced[index]) {
            if (states[1] === TileState.WRONG || states[1] === TileState.PRESENT) {
                wrongLetters.add(states[0]);
            }
        }

        letterRule.wrongLetters = wrongLetters;
    }

    // Find all combinations of letters.
    let combinations = [];
    const presentLetters = new Set(input.filter((_, index) => tileStates[index] === TileState.PRESENT || tileStates[index] === TileState.RIGHT));
    calculateRec(letterRules, [...presentLetters], letterCounter, [], combinations);

    // Show a message if there are no combinations.
    if (combinations.length === 0) {
        outputList.textContent = 'no possible combinations';
        return;
    }

    // Limit the number of combinations.
    if (combinations.length > calculationLimit) {
        combinations = combinations.slice(0, calculationLimit);
        combinations[calculationLimit] = '(too many combinations)';
    }
    outputList.textContent = combinations.join('\n');
}

/**
 * @param {LetterRules[]} letterRules
 * @param {string[]} presentLetters
 * @param {number[]} letterCounter
 * @param {string[]} partial
 * @param {string[]} combinations
 */
function calculateRec(letterRules, presentLetters, letterCounter, partial, combinations) {
    if (combinations.length > calculationLimit) {
        return;
    }

    const nextLetters = letterRules[partial.length].getPossibleLetters();
    for (let letter of nextLetters) {
        const newPartial = [...partial, letter];
        if (newPartial.length === WORD_LENGTH) {
            // Check if the combination is valid.
            if (!presentLetters.some(presentLetter =>
                letterCounter[LETTERS.indexOf(presentLetter)] > 0 &&
                letterCounter[LETTERS.indexOf(presentLetter)] > newPartial.filter(letter => letter === presentLetter).length
            )) {
                if (!cheatButton.checked || SOLUTION_LIST.has(newPartial.join(''))) {
                    combinations.push(newPartial.join(''));
                }
            }
        } else {
            calculateRec(letterRules, presentLetters, letterCounter, newPartial, combinations);
        }

        if (combinations.length > calculationLimit) {
            return;
        }
    }
}

function showModal() {
    if (!modal.classList.contains('show-modal')) {
        outputList.textContent = DEFAULT_LIST_MESSAGE;
        modal.classList.add('show-modal');
        modal.classList.add('slide-in');

        requestIdleCallback(() => {
            calculate();
        });
    }
}

function hideModal() {
    if (modal.classList.contains('show-modal')) {
        modal.classList.remove('show-modal');
        modal.classList.remove('slide-in');
    }
}

// Add calculation modal functionality.
calculateButton.addEventListener('click', showModal);
modalCloseButton.addEventListener('click', hideModal);
