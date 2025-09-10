// Filipino Sign Language Greetings Data
const greetingsData = [
  {
    greeting: "Good Morning",
    desc: `<strong>A warm greeting used in the morning.</strong><br>Used from early morning until around noon.<br>Filipino: "Magandang umaga"`,
    img: "/PICTURES/fsl_greetings/goodmorning.png",
  },
  {
    greeting: "Good Afternoon",
    desc: `<strong>A polite greeting used in the afternoon.</strong><br>Used from noon until early evening.<br>Filipino: "Magandang hapon"`,
    img: "/PICTURES/fsl_greetings/goodafternoon.png",
  },
  {
    greeting: "Good Evening",
    desc: `<strong>A courteous greeting used in the evening.</strong><br>Used from late afternoon until night.<br>Filipino: "Magandang gabi"`,
    img: "/PICTURES/fsl_greetings/goodeve.png",
  },
  {
    greeting: "Hello",
    desc: `<strong>A universal friendly greeting.</strong><br>Can be used at any time of the day.<br>Filipino: "Kumusta" or "Hello"`,
    img: "/PICTURES/fsl_greetings/hello.png",
  },
];

let current = 0;

function updateLesson() {
  document.getElementById("greeting").textContent = greetingsData[current].greeting;
  document.getElementById("desc").innerHTML = `<p>${greetingsData[current].desc}</p>`;
  document.getElementById("signImg").src = greetingsData[current].img;
  document.getElementById("signImg").alt = `Hand sign for ${greetingsData[current].greeting}`;

  // Hide the left arrow if on the first slide, show otherwise
  const prevBtn = document.getElementById("prevBtn");
  if (current === 0) {
    prevBtn.style.visibility = "hidden";
  } else {
    prevBtn.style.visibility = "visible";
  }
}

document.getElementById("prevBtn").onclick = function () {
  current = current === 0 ? greetingsData.length - 1 : current - 1;
  updateLesson();
};
document.getElementById("nextBtn").onclick = function () {
  current = current === greetingsData.length - 1 ? 0 : current + 1;
  updateLesson();
};

// Hotkeys: left/right arrow
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") {
    current = current === 0 ? greetingsData.length - 1 : current - 1;
    updateLesson();
  } else if (e.key === "ArrowRight") {
    current = current === greetingsData.length - 1 ? 0 : current + 1;
    updateLesson();
  }
});
// Initially show 'Good Morning'
updateLesson();