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
let isAnimating = false;

// Preload images for smoother transitions
function preloadImages() {
  colorsData.forEach(item => {
    const img = new Image();
    img.src = item.img;
  });
}

function updateLesson(direction = 'next') {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const colorEl = document.getElementById('color');
  const descEl = document.getElementById('desc');
  const imgEl = document.getElementById('signImg');
  const leftContent = document.querySelector('.lesson-left');
  const rightContent = document.querySelector('.lesson-right');
  
  // Determine animation direction
  const slideOutClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
  const slideInClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
  
  // Add exit animation classes
  leftContent.classList.add(slideOutClass);
  rightContent.classList.add(slideOutClass);
  
  // Update content after a short delay for smooth transition
  setTimeout(() => {
    // Update the content
    colorEl.innerHTML =
      colorsData[current].color +
      ` <div class="color-swatch" id="colorSwatch" style="background-color: ${colorsData[current].hex}; border: 3px solid ${
        colorsData[current].color === "White" ? "#ccc" : "#ddd"
      }; display:inline-block; width:24px; height:24px; vertical-align:middle; margin-left:10px; border-radius:50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>`;
    descEl.innerHTML = `<p>${colorsData[current].desc}</p>`;
    imgEl.src = colorsData[current].img;
    imgEl.alt = `Hand sign for ${colorsData[current].color}`;
    
    // Remove old classes and add entrance animation
    leftContent.classList.remove(slideOutClass);
    rightContent.classList.remove(slideOutClass);
    leftContent.classList.add(slideInClass);
    rightContent.classList.add(slideInClass);
    
    // Update navigation button visibility
    updateNavButtons();
    
    // Clean up animation classes after animation completes
    setTimeout(() => {
      leftContent.classList.remove(slideInClass);
      rightContent.classList.remove(slideInClass);
      isAnimating = false;
    }, 400);
    
  }, 200);
}

function updateNavButtons() {
  const prevBtn = document.getElementById('prevBtn');
  
  if (current === 0) {
    prevBtn.style.opacity = '0.3';
    prevBtn.style.pointerEvents = 'none';
  } else {
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
  }
}

// Add CSS animations dynamically
function addAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .lesson-left, .lesson-right {
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    .slide-out-left {
      transform: translateX(-50px);
      opacity: 0;
    }
    
    .slide-out-right {
      transform: translateX(50px);
      opacity: 0;
    }
    
    .slide-in-left {
      transform: translateX(50px);
      opacity: 0;
      animation: slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    .slide-in-right {
      transform: translateX(-50px);
      opacity: 0;
      animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    @keyframes slideInLeft {
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideInRight {
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .nav-arrow {
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    .nav-arrow:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    .nav-arrow:hover {
      transform: translateY(-50%) scale(1.1);
    }
    
    .lesson-image {
      transition: opacity 0.2s ease;
    }
    
    .color-swatch {
      transition: all 0.3s ease;
    }
    
    .color-swatch:hover {
      transform: scale(1.2);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
    }
    
    #color {
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .lesson-card:not(.animating) #color:hover {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
  if (isAnimating) return;
  
  const newIndex = (current === 0) ? colorsData.length - 1 : current - 1;
  current = newIndex;
  updateLesson('prev');
}

function navigateNext() {
  if (isAnimating) return;
  
  const newIndex = (current === colorsData.length - 1) ? 0 : current + 1;
  current = newIndex;
  updateLesson('next');
}

// Event listeners
document.getElementById('prevBtn').onclick = navigatePrevious;
document.getElementById('nextBtn').onclick = navigateNext;

// Enhanced keyboard navigation
document.addEventListener('keydown', function (e) {
  if (isAnimating) return;
  
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    navigatePrevious();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    navigateNext();
  } else if (e.key === "Home") {
    e.preventDefault();
    if (current !== 0) {
      current = 0;
      updateLesson('prev');
    }
  } else if (e.key === "End") {
    e.preventDefault();
    if (current !== colorsData.length - 1) {
      current = colorsData.length - 1;
      updateLesson('next');
    }
  }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const swipeDistance = touchEndX - touchStartX;
  
  if (Math.abs(swipeDistance) > swipeThreshold && !isAnimating) {
    if (swipeDistance > 0) {
      navigatePrevious();
    } else {
      navigateNext();
    }
  }
}

// Initialize the lesson
document.addEventListener('DOMContentLoaded', function() {
  addAnimationStyles();
  preloadImages();
  updateNavButtons();
  
  // Add a subtle loading fade-in effect
  const lessonCard = document.querySelector('.lesson-card');
  lessonCard.style.opacity = '0';
  lessonCard.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    lessonCard.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    lessonCard.style.opacity = '1';
    lessonCard.style.transform = 'translateY(0)';
  }, 100);
});

// Add visual feedback for button presses
document.querySelectorAll('.nav-arrow').forEach(btn => {
  btn.addEventListener('mousedown', function() {
    this.style.transform = 'translateY(-50%) scale(0.95)';
  });
  
  btn.addEventListener('mouseup', function() {
    this.style.transform = 'translateY(-50%) scale(1)';
  });
  
  btn.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(-50%) scale(1)';
  });
});

// Initially show 'Black'
setTimeout(() => {
  updateLesson();
}, 50);