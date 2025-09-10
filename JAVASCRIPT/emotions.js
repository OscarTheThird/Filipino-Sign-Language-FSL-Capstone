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
let isAnimating = false;

// Preload images for smoother transitions
function preloadImages() {
  emotionsData.forEach(item => {
    const img = new Image();
    img.src = item.img;
  });
}

function updateLesson(direction = 'next') {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const emotionEl = document.getElementById('emotion');
  const descEl = document.getElementById('desc');
  const imgEl = document.getElementById('emotionImg');
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
    emotionEl.textContent = emotionsData[current].emotion;
    descEl.innerHTML = `<p>${emotionsData[current].desc}</p>`;
    imgEl.src = emotionsData[current].img;
    imgEl.alt = `Emotion ${emotionsData[current].emotion}`;
    
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
      transition: all 0.3s ease;
    }
    
    .lesson-image:hover {
      transform: scale(1.02);
    }
    
    #emotion {
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .lesson-card:not(.animating) #emotion:hover {
      transform: scale(1.05);
    }
    
    /* Special emotion-based color effects */
    .emotion-happy #emotion { color: #FFD700; }
    .emotion-sad #emotion { color: #4682B4; }
    .emotion-angry #emotion { color: #DC143C; }
    .emotion-love #emotion { color: #FF69B4; }
    .emotion-scared #emotion { color: #800080; }
  `;
  document.head.appendChild(style);
}

// Add dynamic emotion-based styling
function updateEmotionStyling() {
  const lessonCard = document.querySelector('.lesson-card');
  const currentEmotion = emotionsData[current].emotion.toLowerCase();
  
  // Remove existing emotion classes
  lessonCard.className = lessonCard.className.replace(/emotion-\w+/g, '');
  
  // Add current emotion class
  lessonCard.classList.add(`emotion-${currentEmotion}`);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
  if (isAnimating) return;
  
  const newIndex = (current === 0) ? emotionsData.length - 1 : current - 1;
  current = newIndex;
  updateLesson('prev');
  updateEmotionStyling();
}

function navigateNext() {
  if (isAnimating) return;
  
  const newIndex = (current === emotionsData.length - 1) ? 0 : current + 1;
  current = newIndex;
  updateLesson('next');
  updateEmotionStyling();
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
      updateEmotionStyling();
    }
  } else if (e.key === "End") {
    e.preventDefault();
    if (current !== emotionsData.length - 1) {
      current = emotionsData.length - 1;
      updateLesson('next');
      updateEmotionStyling();
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
  updateEmotionStyling();
  
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

// Initially show first emotion
setTimeout(() => {
  updateLesson();
  updateEmotionStyling();
}, 50);