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
let isAnimating = false;

// Preload images for smoother transitions
function preloadImages() {
    alphabetData.forEach(item => {
        const img = new Image();
        img.src = item.img;
    });
}

function updateLesson(direction = 'next') {
    if (isAnimating) return;
    
    isAnimating = true;
    
    const letterEl = document.getElementById('letter');
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
        letterEl.textContent = alphabetData[current].letter;
        descEl.innerHTML = `<p>${alphabetData[current].desc}</p>`;
        imgEl.src = alphabetData[current].img;
        imgEl.alt = `Hand sign for ${alphabetData[current].letter}`;
        
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
    
    // Hide the left arrow if on the first slide, show otherwise
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
        
        .lesson-image {
            transition: opacity 0.2s ease;
        }
        
        /* Add a subtle bounce effect for better feedback */
        .lesson-letter {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .lesson-card:not(.animating) .lesson-letter:hover {
            transform: scale(1.05);
        }
        
        /* Improve button interactions */
        .nav-arrow:hover {
            transform: translateY(-50%) scale(1.1);
        }
    `;
    document.head.appendChild(style);
}

// Enhanced navigation with direction awareness
function navigatePrevious() {
    if (isAnimating) return;
    
    const newIndex = (current === 0) ? alphabetData.length - 1 : current - 1;
    current = newIndex;
    updateLesson('prev');
}

function navigateNext() {
    if (isAnimating) return;
    
    const newIndex = (current === alphabetData.length - 1) ? 0 : current + 1;
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
        if (current !== alphabetData.length - 1) {
            current = alphabetData.length - 1;
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
            // Swiped right - go to previous
            navigatePrevious();
        } else {
            // Swiped left - go to next
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