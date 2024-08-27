const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

let input = [];

document.addEventListener('keydown', function(event) {
    const key = event.key.toLowerCase();

    if (letters.includes(key)) {
        input.push(key);
    } else if (letters === 'backspace') {
        input.pop();
    } else if (key === 'enter') {
        // Todo: cycle color.
    }
});

// document.getElementById('list').textContent = `test`;