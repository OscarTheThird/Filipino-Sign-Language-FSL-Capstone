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
let isAnimating = false;

// Preload images for smoother transitions
function preloadImages() {
  greetingsData.forEach(item => {
    const img = new Image();
    img.src = item.img;
  });
}

function updateLesson(direction = 'next') {
  if (isAnimating) return;
  
  isAnimating = true;
  
  const greetingEl = document.getElementById('greeting');
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
    greetingEl.textContent = greetingsData[current].greeting;
    descEl.innerHTML = `<p>${greetingsData[current].desc}</p>`;
    imgEl.src = greetingsData[current].img;
    imgEl.alt = `Hand sign for ${greetingsData[current].greeting}`;
    
    // Remove old classes and add entrance animation
    leftContent.classList.remove(slideOutClass);
    rightContent.classList.remove(slideOutClass);
    leftContent.classList.add(slideInClass);
    rightContent.classList.add(slideInClass);
    
    // Update navigation button visibility
    updateNavButtons();
    
    // Update time-based styling
    updateTimeBasedStyling();
    
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

// Add time-based styling based on greeting type
function updateTimeBasedStyling() {
  const lessonCard = document.querySelector('.lesson-card');
  const currentGreeting = greetingsData[current].greeting.toLowerCase().replace(/\s+/g, '');
  
  // Remove existing time-based classes
  lessonCard.className = lessonCard.className.replace(/time-\w+/g, '');
  
  // Add current time-based class
  lessonCard.classList.add(`time-${currentGreeting}`);
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
    
    #greeting {
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .lesson-card:not(.animating) #greeting:hover {
      transform: scale(1.05);
    }
    
    /* Time-based greeting colors */
    .time-goodmorning #greeting { 
      color: #FF6B35; 
      text-shadow: 0 2px 4px rgba(255, 107, 53, 0.3);
    }
    .time-goodafternoon #greeting { 
      color: #4ECDC4; 
      text-shadow: 0 2px 4px rgba(78, 205, 196, 0.3);
    }
    .time-goodevening #greeting { 
      color: #45B7D1; 
      text-shadow: 0 2px 4px rgba(69, 183, 209, 0.3);
    }
    .time-hello #greeting { 
      color: #96CEB4; 
      text-shadow: 0 2px 4px rgba(150, 206, 180, 0.3);
    }
    
    /* Add subtle background gradients based on time */
    .time-goodmorning {
      background: linear-gradient(135deg, #fff 0%, #fff8f4 100%);
    }
    .time-goodafternoon {
      background: linear-gradient(135deg, #fff 0%, #f4fffe 100%);
    }
    .time-goodevening {
      background: linear-gradient(135deg, #fff 0%, #f4f9ff 100%);
    }
    .time-hello {
      background: linear-gradient(135deg, #fff 0%, #f8fff9 100%);
    }
  `;
  document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
  if (isAnimating) return;
  
  const newIndex = (current === 0) ? greetingsData.length - 1 : current - 1;
  current = newIndex;
  updateLesson('prev');
}

function navigateNext() {
  if (isAnimating) return;
  
  const newIndex = (current === greetingsData.length - 1) ? 0 : current + 1;
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
    if (current !== greetingsData.length - 1) {
      current = greetingsData.length - 1;
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
  updateTimeBasedStyling();
  
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

// Initially show 'Good Morning'
setTimeout(() => {
  updateLesson();
}, 50);