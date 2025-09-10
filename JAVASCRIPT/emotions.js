// Emotion Data
const emotionsData = [
  {
    emotion: "Angry",
    desc: `<strong>Feeling of anger or irritation.</strong><br>Filipino: "Galit"`,
    img: "/PICTURES/fsl_emotions/Angry.jpg",
  },
  {
    emotion: "Happy",
    desc: `<strong>Feeling of joy and pleasure.</strong><br>Filipino: "Masaya"`,
    img: "/PICTURES/fsl_emotions/happy.jpg",
  },
  {
    emotion: "Hungry",
    desc: `<strong>Feeling of needing food.</strong><br>Filipino: "Gutom"`,
    img: "/PICTURES/fsl_emotions/Hungry.jpg",
  },
  {
    emotion: "Love",
    desc: `<strong>Feeling of affection and care.</strong><br>Filipino: "Pagmamahal"`,
    img: "/PICTURES/fsl_emotions/Love.jpg",
  },
  {
    emotion: "Mad",
    desc: `<strong>Similar to angry, feeling upset or annoyed.</strong><br>Filipino: "Galit"`,
    img: "/PICTURES/fsl_emotions/Mad.jpg",
  },
  {
    emotion: "Nervous",
    desc: `<strong>Feeling uneasy or anxious.</strong><br>Filipino: "Naiinip"`,
    img: "/PICTURES/fsl_emotions/Nervous.jpg",
  },
  {
    emotion: "Sad",
    desc: `<strong>Feeling unhappy or sorrowful.</strong><br>Filipino: "Malungkot"`,
    img: "/PICTURES/fsl_emotions/Sad.jpg",
  },
  {
    emotion: "Scared",
    desc: `<strong>Feeling afraid or fearful.</strong><br>Filipino: "Takot"`,
    img: "/PICTURES/fsl_emotions/Scared.jpg",
  },
  {
    emotion: "Sick",
    desc: `<strong>Feeling unwell or ill.</strong><br>Filipino: "May sakit"`,
    img: "/PICTURES/fsl_emotions/Sick.jpg",
  },
  {
    emotion: "Worried",
    desc: `<strong>Feeling concerned or anxious about something.</strong><br>Filipino: "Nag-aalala"`,
    img: "/PICTURES/fsl_emotions/Worried.jpg",
  },
];

let current = 0;

function updateLesson() {
  document.getElementById("emotion").textContent = emotionsData[current].emotion;
  document.getElementById("desc").innerHTML = `<p>${emotionsData[current].desc}</p>`;
  document.getElementById("emotionImg").src = emotionsData[current].img;
  document.getElementById("emotionImg").alt = `Emotion ${emotionsData[current].emotion}`;

  // Hide the left arrow if on the first slide, show otherwise
  const prevBtn = document.getElementById("prevBtn");
  if (current === 0) {
    prevBtn.style.visibility = "hidden";
  } else {
    prevBtn.style.visibility = "visible";
  }
}

document.getElementById("prevBtn").onclick = function () {
  current = current === 0 ? emotionsData.length - 1 : current - 1;
  updateLesson();
};
document.getElementById("nextBtn").onclick = function () {
  current = current === emotionsData.length - 1 ? 0 : current + 1;
  updateLesson();
};

// Hotkeys: left/right arrow
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") {
    current = current === 0 ? emotionsData.length - 1 : current - 1;
    updateLesson();
  } else if (e.key === "ArrowRight") {
    current = current === emotionsData.length - 1 ? 0 : current + 1;
    updateLesson();
  }
});
// Initially show first emotion
updateLesson();