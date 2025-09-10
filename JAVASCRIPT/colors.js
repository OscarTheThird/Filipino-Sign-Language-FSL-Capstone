// Filipino Sign Language Colors Data
const colorsData = [
  {
    color: "Black",
    desc: `<strong>The darkest color, absence of light.</strong><br>Often associated with elegance and mystery.<br>Filipino: "Itim"`,
    img: "/PICTURES/fsl_colors/black.png",
    hex: "#000000",
  },
  {
    color: "Blue",
    desc: `<strong>A cool color like the sky and ocean.</strong><br>Represents calmness and tranquility.<br>Filipino: "Asul"`,
    img: "/PICTURES/fsl_colors/blue.png",
    hex: "#0066CC",
  },
  {
    color: "Brown",
    desc: `<strong>An earthy color like soil and wood.</strong><br>Associated with nature and stability.<br>Filipino: "Kayumanggi"`,
    img: "/PICTURES/fsl_colors/brown.png",
    hex: "#8B4513",
  },
  {
    color: "Green",
    desc: `<strong>The color of nature and plants.</strong><br>Symbolizes growth and freshness.<br>Filipino: "Berde"`,
    img: "/PICTURES/fsl_colors/green.png",
    hex: "#228B22",
  },
  {
    color: "Pink",
    desc: `<strong>A soft, gentle color.</strong><br>Often associated with sweetness and care.<br>Filipino: "Rosas"`,
    img: "/PICTURES/fsl_colors/pink.png",
    hex: "#FF69B4",
  },
  {
    color: "Purple",
    desc: `<strong>A royal and majestic color.</strong><br>Combines the energy of red and calm of blue.<br>Filipino: "Lila"`,
    img: "/PICTURES/fsl_colors/purple.png",
    hex: "#800080",
  },
  {
    color: "Red",
    desc: `<strong>A vibrant, energetic color.</strong><br>Represents passion and strength.<br>Filipino: "Pula"`,
    img: "/PICTURES/fsl_colors/red.png",
    hex: "#DC143C",
  },
  {
    color: "White",
    desc: `<strong>The brightest color, symbol of purity.</strong><br>Represents cleanliness and peace.<br>Filipino: "Puti"`,
    img: "/PICTURES/fsl_colors/white.png",
    hex: "#FFFFFF",
  },
  {
    color: "Yellow",
    desc: `<strong>A bright, cheerful color like the sun.</strong><br>Associated with happiness and energy.<br>Filipino: "Dilaw"`,
    img: "/PICTURES/fsl_colors/yellow.png",
    hex: "#FFD700",
  },
];

let current = 0;

function updateLesson() {
  document.getElementById("color").innerHTML =
    colorsData[current].color +
    ` <div class="color-swatch" id="colorSwatch" style="background-color: ${colorsData[current].hex}; border: 3px solid ${
      colorsData[current].color === "White" ? "#ccc" : "#ddd"
    }; display:inline-block; width:24px; height:24px; vertical-align:middle; margin-left:10px;"></div>`;
  document.getElementById("desc").innerHTML = `<p>${colorsData[current].desc}</p>`;
  document.getElementById("signImg").src = colorsData[current].img;
  document.getElementById("signImg").alt = `Hand sign for ${colorsData[current].color}`;

  // Hide the left arrow if on the first slide, show otherwise
  const prevBtn = document.getElementById("prevBtn");
  if (current === 0) {
    prevBtn.style.visibility = "hidden";
  } else {
    prevBtn.style.visibility = "visible";
  }
}

document.getElementById("prevBtn").onclick = function () {
  current = current === 0 ? colorsData.length - 1 : current - 1;
  updateLesson();
};
document.getElementById("nextBtn").onclick = function () {
  current = current === colorsData.length - 1 ? 0 : current + 1;
  updateLesson();
};

// Hotkeys: left/right arrow
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") {
    current = current === 0 ? colorsData.length - 1 : current - 1;
    updateLesson();
  } else if (e.key === "ArrowRight") {
    current = current === colorsData.length - 1 ? 0 : current + 1;
    updateLesson();
  }
});
// Initially show 'Black'
updateLesson();