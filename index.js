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

const tiles = document.getElementsByClassName('tile');
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const letterStates = letters.map(_ => LetterState.NONE);

const keys = document.getElementsByClassName('key');
const calculateButton = document.getElementById('calculate');

let input = [];

for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index];

    // Add animations to the tiles.
    tile.addEventListener('animationend', function () {
        tile.classList.remove('pulse');
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
    } else if (key === 'enter' || key === 'space') {
        const focusedElementIsTile = Array.prototype.some.call(tiles, tile => tile === document.activeElement);
        const focusedElementIsLastInput = document.activeElement === tiles[input.length - 1];
        if (!focusedElementIsTile || focusedElementIsLastInput) {
            cycleState(input.length - 1);
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
            tile.classList.remove(state.toString());
            tile.classList.add(newState.toString());
        }
    }

    // Update the keyboard.
    const key = Array.prototype.find.call(keys, key => key.value === letter);
    if (key) {
        key.classList.remove(state.toString());
        key.classList.add(newState.toString());
    }
}

// document.getElementById('list').textContent = `test`;