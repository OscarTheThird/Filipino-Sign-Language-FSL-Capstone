// Filipino Alphabet A-Z (with example words)
const alphabetData = [
    { letter: 'A', desc: `<strong>The first letter of the Filipino alphabet.</strong><br>—often used to begin words and names.<br>Ex. "A is for aso (dog)."`, img: '/PICTURES/fsl_alphabet/a.png' },
    { letter: 'B', desc: `<strong>The second letter of the Filipino alphabet.</strong><br>Ex. "B is for bata (child)."`, img: '/PICTURES/fsl_alphabet/b.png' },
    { letter: 'C', desc: `<strong>The third letter of the Filipino alphabet.</strong><br>Ex. "C is for cat (pusa)."`, img: '/PICTURES/fsl_alphabet/c.png' },
    { letter: 'D', desc: `<strong>The fourth letter of the Filipino alphabet.</strong><br>Ex. "D is for daga (rat)."`, img: '/PICTURES/fsl_alphabet/d.png' },
    { letter: 'E', desc: `<strong>The fifth letter of the Filipino alphabet.</strong><br>Ex. "E is for eroplano (airplane)."`, img: '/PICTURES/fsl_alphabet/e.png' },
    { letter: 'F', desc: `<strong>The sixth letter of the Filipino alphabet.</strong><br>Ex. "F is for pamilya (family, using the sound 'f' for foreign words)."`, img: '/PICTURES/fsl_alphabet/f.png' },
    { letter: 'G', desc: `<strong>The seventh letter of the Filipino alphabet.</strong><br>Ex. "G is for gabi (night)."`, img: '/PICTURES/fsl_alphabet/g.png' },
    { letter: 'H', desc: `<strong>The eighth letter of the Filipino alphabet.</strong><br>Ex. "H is for hayop (animal)."`, img: '/PICTURES/fsl_alphabet/h.png' },
    { letter: 'I', desc: `<strong>The ninth letter of the Filipino alphabet.</strong><br>Ex. "I is for isla (island)."`, img: '/PICTURES/fsl_alphabet/i.png' },
    { letter: 'J', desc: `<strong>The tenth letter of the Filipino alphabet.</strong><br>Ex. "J is for jeep."`, img: '/PICTURES/fsl_alphabet/j.png' },
    { letter: 'K', desc: `<strong>The eleventh letter of the Filipino alphabet.</strong><br>Ex. "K is for kabayo (horse)."`, img: '/PICTURES/fsl_alphabet/k.png' },
    { letter: 'L', desc: `<strong>The twelfth letter of the Filipino alphabet.</strong><br>Ex. "L is for langit (sky)."`, img: '/PICTURES/fsl_alphabet/l.png' },
    { letter: 'M', desc: `<strong>The thirteenth letter of the Filipino alphabet.</strong><br>Ex. "M is for mata (eye)."`, img: '/PICTURES/fsl_alphabet/m.png' },
    { letter: 'N', desc: `<strong>The fourteenth letter of the Filipino alphabet.</strong><br>Ex. "N is for ngipin (teeth)."`, img: '/PICTURES/fsl_alphabet/n.png' },
    { letter: 'O', desc: `<strong>The fifteenth letter of the Filipino alphabet.</strong><br>Ex. "O is for oso (bear)."`, img: '/PICTURES/fsl_alphabet/o.png' },
    { letter: 'P', desc: `<strong>The sixteenth letter of the Filipino alphabet.</strong><br>Ex. "P is for puno (tree)."`, img: '/PICTURES/fsl_alphabet/p.png' },
    { letter: 'Q', desc: `<strong>The seventeenth letter of the Filipino alphabet.</strong><br>Ex. "Q is for quwento (story, using 'q' for foreign words)."`, img: '/PICTURES/fsl_alphabet/q.png' },
    { letter: 'R', desc: `<strong>The eighteenth letter of the Filipino alphabet.</strong><br>Ex. "R is for rosas (rose)."`, img: '/PICTURES/fsl_alphabet/r.png' },
    { letter: 'S', desc: `<strong>The nineteenth letter of the Filipino alphabet.</strong><br>Ex. "S is for saging (banana)."`, img: '/PICTURES/fsl_alphabet/s.png' },
    { letter: 'T', desc: `<strong>The twentieth letter of the Filipino alphabet.</strong><br>Ex. "T is for tubig (water)."`, img: '/PICTURES/fsl_alphabet/t.png' },
    { letter: 'U', desc: `<strong>The twenty-first letter of the Filipino alphabet.</strong><br>Ex. "U is for ulan (rain)."`, img: '/PICTURES/fsl_alphabet/u.png' },
    { letter: 'V', desc: `<strong>The twenty-second letter of the Filipino alphabet.</strong><br>Ex. "V is for van (using 'v' for foreign words)."`, img: '/PICTURES/fsl_alphabet/v.png' },
    { letter: 'W', desc: `<strong>The twenty-third letter of the Filipino alphabet.</strong><br>Ex. "W is for walis (broom)."`, img: '/PICTURES/fsl_alphabet/w.png' },
    { letter: 'X', desc: `<strong>The twenty-fourth letter of the Filipino alphabet.</strong><br>Ex. "X is for x-ray (using 'x' for foreign words)."`, img: '/PICTURES/fsl_alphabet/x.png' },
    { letter: 'Y', desc: `<strong>The twenty-fifth letter of the Filipino alphabet.</strong><br>Ex. "Y is for yelo (ice)."`, img: '/PICTURES/fsl_alphabet/y.png' },
    { letter: 'Z', desc: `<strong>The last letter of the Filipino alphabet.</strong><br>Ex. "Z is for zebra."`, img: '/PICTURES/fsl_alphabet/z.png' }
];

let current = 0;

function updateLesson() {
    document.getElementById('letter').textContent = alphabetData[current].letter;
    document.getElementById('desc').innerHTML = `<p>${alphabetData[current].desc}</p>`;
    document.getElementById('signImg').src = alphabetData[current].img;
    document.getElementById('signImg').alt = `Hand sign for ${alphabetData[current].letter}`;

    // Hide the left arrow if on the first slide, show otherwise
    const prevBtn = document.getElementById('prevBtn');
    if (current === 0) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }
}

document.getElementById('prevBtn').onclick = function () {
    current = (current === 0) ? alphabetData.length - 1 : current - 1;
    updateLesson();
};
document.getElementById('nextBtn').onclick = function () {
    current = (current === alphabetData.length - 1) ? 0 : current + 1;
    updateLesson();
};

// Hotkeys: left/right arrow
document.addEventListener('keydown', function (e) {
    if (e.key === "ArrowLeft") {
        current = (current === 0) ? alphabetData.length - 1 : current - 1;
        updateLesson();
    } else if (e.key === "ArrowRight") {
        current = (current === alphabetData.length - 1) ? 0 : current + 1;
        updateLesson();
    }
});
// Initially show 'A'
updateLesson();