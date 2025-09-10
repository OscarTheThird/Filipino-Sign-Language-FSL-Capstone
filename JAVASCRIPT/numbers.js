// Filipino Alphabet A-Z (with example words)
const alphabetData = [
    { letter: '1', desc: `<strong>Number 1</strong><br>Ex. "Isa ang araw ng pahinga sa isang linggo."`, img: '/PICTURES/fsl_numbers/1.png' },
    { letter: '2', desc: `<strong>Number 2</strong><br>Ex. "Dalawa ang mata ng tao."`, img: '/PICTURES/fsl_numbers/2.png' },
    { letter: '3', desc: `<strong>Number 3</strong><br>Ex. "Tatlo ang pagkain sa isang araw: almusal, tanghalian, hapunan."`, img: '/PICTURES/fsl_numbers/3.png' },
    { letter: '4', desc: `<strong>Number 4</strong><br>Ex. "Apat ang gulong ng kotse."`, img: '/PICTURES/fsl_numbers/4.png' },
    { letter: '5', desc: `<strong>Number 5</strong><br>Ex. "Lima ang daliri sa isang kamay."`, img: '/PICTURES/fsl_numbers/5.png' },
    { letter: '6', desc: `<strong>Number 6</strong><br>Ex. "Anim ang itlog sa lalagyan."`, img: '/PICTURES/fsl_numbers/6.png' },
    { letter: '7', desc: `<strong>Number 7</strong><br>Ex. "Pito ang araw sa isang linggo."`, img: '/PICTURES/fsl_numbers/7.png' },
    { letter: '8', desc: `<strong>Number 8</strong><br>Ex. "Walo ang paa ng gagamba."`, img: '/PICTURES/fsl_numbers/8.png' },
    { letter: '9', desc: `<strong>Number 9</strong><br>Ex. "Siyam ang bituin sa watawat ng Pilipinas."`, img: '/PICTURES/fsl_numbers/9.png' },
    { letter: '10', desc: `<strong>Number 10</strong><br>Ex. "Sampu ang estudyante sa silid-aralan."`, img: '/PICTURES/fsl_numbers/10.png' }
];


let current = 0;

function updateLesson() {
    document.getElementById('letter').textContent = alphabetData[current].letter;
    document.getElementById('desc').innerHTML = `<p>${alphabetData[current].desc}</p>`;
    document.getElementById('signImg').src = alphabetData[current].img;
    document.getElementById('signImg').alt = `Hand sign for ${alphabetData[current].letter}`;
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