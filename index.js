// States to keep track of letter colors.
class LetterState {
    static NONE = new LetterState('none');
    static WRONG = new LetterState('wrong');
    static RIGHT = new LetterState('right');
    static PRESENT = new LetterState('present');

    constructor(state) {
        this.state = state;
    }

    toString() {
        return this.state;
    }
}

var calculationLimit = 20000;
const WORD_LENGTH = 5;
const DEFAULT_LIST_MESSAGE = 'calculating...';

const tiles = document.getElementsByClassName('tile');
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const letterStates = letters.map(_ => LetterState.NONE);

const keys = document.getElementsByClassName('key');
const calculateButton = document.getElementById('calculate');
const modal = document.getElementById('calculation-modal');
const modalCloseButton = document.getElementById('modal-close-btn');
const outputList = document.getElementById('list');

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

    if (letters.includes(keyValue)) {
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

    if (letters.includes(key) && !event.ctrlKey) {
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

function addLetter(letter) {
    if (input.length >= tiles.length) {
        return;
    }
    input.push(letter);

    const index = input.length - 1;
    const state = letterStates[letters.indexOf(letter)];

    tiles[index].textContent = letter;
    tiles[index].classList.add('pulse');
    tiles[index].classList.add(state.toString());
}

function removeLastLetter() {
    if (input.length === 0) {
        return;
    }

    const index = input.length - 1;
    const state = letterStates[letters.indexOf(input[index])];

    tiles[index].textContent = '';
    tiles[index].classList.remove(state.toString());
    input.pop();
}

function cycleState(tileIndex) {
    if (tileIndex < 0 || tileIndex >= input.length) {
        return;
    }

    const letter = input[tileIndex];
    const letterIndex = letters.indexOf(letter);
    const state = letterStates[letterIndex];

    let newState;
    if (state === LetterState.NONE) {
        newState = LetterState.WRONG;
    } else if (state === LetterState.WRONG) {
        newState = LetterState.PRESENT;
    } else if (state === LetterState.PRESENT) {
        newState = LetterState.RIGHT;
    } else if (state === LetterState.RIGHT) {
        newState = LetterState.WRONG;
    }
    letterStates[letterIndex] = newState;

    // Update all tiles with the same letter.
    for (let index = 0; index < tiles.length; index++) {
        const tile = tiles[index];
        if (input[index] === letter) {
            tile.classList.remove('none');
            tile.classList.remove('pulse');
            tile.classList.remove(state.toString());
            tile.classList.add(newState.toString());
            tile.classList.add('flip');
        }
    }

    // Update the keyboard.
    const key = Array.prototype.find.call(keys, key => key.value === letter);
    if (key) {
        key.classList.remove(state.toString());
        key.classList.add(newState.toString());
    }
}

function calculate() {
    // Check for invalid number of inputs.
    const numberOfPresentLetters = letterStates.reduce((count, state) => count + (state === LetterState.RIGHT || state === LetterState.PRESENT ? 1 : 0), 0);
    if (numberOfPresentLetters > WORD_LENGTH) {
        outputList.textContent = `cannot calculate: too many letters present`;
        return;
    }

    // Check if there are multiple right letters in the same column but they're different.
    const effTransposeWordLength = Math.ceil(input.length / WORD_LENGTH);
    const paddingLength = (WORD_LENGTH - (input.length % WORD_LENGTH)) % WORD_LENGTH;

    const inputWithStates = input.map(letter => [letter, letterStates[letters.indexOf(letter)]]).concat(Array(paddingLength).fill(['', LetterState.NONE]));
    const transposedStates = inputWithStates.map((_, index) => inputWithStates[(index * WORD_LENGTH + Math.floor(index / effTransposeWordLength)) % inputWithStates.length]);
    const transposedStatesSliced = Array.from({ length: WORD_LENGTH }, (_, index) => transposedStates.slice(index * effTransposeWordLength, (index + 1) * effTransposeWordLength));
    const filtered = transposedStatesSliced.map(row => row.filter(([_, state]) => state === LetterState.RIGHT).map(([letter]) => letter));
    const setsOfRightLetters = filtered.map(row => new Set(row));

    const hasUniqueRightLetters = input.length <= WORD_LENGTH ? true : setsOfRightLetters.every(column => column.size <= 1);
    if (!hasUniqueRightLetters) {
        outputList.textContent = `cannot calculate: multiple right letters in the same column`;
        return;
    }

    // Find all combinations of letters.
    let combinations = [];
    const availableLetters = letters.filter((_, index) => letterStates[index] !== LetterState.WRONG);
    const rightLettersByIndex = setsOfRightLetters.map(column => column.values().next().value);
    const presentLetters = letters.filter((_, index) => letterStates[index] === LetterState.PRESENT || letterStates[index] === LetterState.RIGHT);
    calculateRec([], availableLetters, rightLettersByIndex, presentLetters, combinations);

    // Limit the number of combinations.
    if (combinations.length > calculationLimit) {
        combinations = combinations.slice(0, calculationLimit);
        combinations[calculationLimit] = '(too many combinations)';
    }
    outputList.textContent = combinations.join('\n');
}

function calculateRec(partial, available, rightLettersByIndex, presentLetters, combinations) {
    if (combinations.length > calculationLimit) {
        return;
    }

    // Use present letters when possible.
    const nextLetters = rightLettersByIndex[partial.length] || available;
    for (let letter of nextLetters) {
        const newPartial = [...partial, letter];
        // Check that all present letters are in the word.
        if (newPartial.length === WORD_LENGTH && presentLetters.every(letter => newPartial.includes(letter))) {
            combinations.push(newPartial.join(''));
        } else if (newPartial.length < WORD_LENGTH) {
            calculateRec(newPartial, available, rightLettersByIndex, presentLetters, combinations);
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
