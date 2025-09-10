// Import Firebase modules
import { auth } from "./firebase.js";

// Modal functions and shared UI logic (NO login/register/handleLogin/handleRegister)
function openLoginModal() {
  document.getElementById("loginModal").style.display = "block";
}
function closeLoginModal() {
  document.getElementById("loginModal").style.display = "none";
}
function openRegisterModal() {
  document.getElementById("registerModal").style.display = "block";
}
function closeRegisterModal() {
  document.getElementById("registerModal").style.display = "none";
}
function switchToRegisterModal(e) {
  e.preventDefault();
  closeLoginModal();
  openRegisterModal();
}
function switchToLoginModal(e) {
  e.preventDefault();
  closeRegisterModal();
  openLoginModal();
}
window.onclick = function (event) {
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  if (event.target === loginModal) closeLoginModal();
  if (event.target === registerModal) closeRegisterModal();
};

// Password show/hide with eye icons
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
  } else {
    input.type = "password";
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
  }
}

// Authentication state management for nav buttons
function updateNavAuthButtons() {
  const loginBtn = document.querySelector(".login-nav-btn");
  const registerBtn = document.querySelector(".register-nav-btn");
  const logoutBtn = document.querySelector(".logout-nav-btn");

  if (auth.currentUser) {
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

// Handle logout
async function handleLogout() {
  try {
    await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
      .then(({ signOut }) => signOut(auth));
    window.location.href = "home.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Error signing out. Please try again.");
  }
}

// Initialize eye icons and hide them initially
function initializeEyeIcons() {
  document.querySelectorAll(".show-hide-btn").forEach((btn) => {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
    // Hide the button initially
    btn.style.display = "none";
  });
}

// Setup password input listeners to show/hide toggle button
function setupPasswordToggleListeners() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    const toggleBtn = input.parentElement.querySelector(".show-hide-btn");
    if (toggleBtn) {
      // Show button when user starts typing
      input.addEventListener("input", function () {
        if (this.value.length > 0) {
          toggleBtn.style.display = "block";
        } else {
          toggleBtn.style.display = "none";
          this.type = "password";
          toggleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>`;
        }
      });

      // Hide button and reset when input loses focus and is empty
      input.addEventListener("blur", function () {
        if (this.value.length === 0) {
          toggleBtn.style.display = "none";
          this.type = "password";
          toggleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>`;
        }
      });
    }
  });
}

// Make modal and nav functions available globally
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToRegisterModal = switchToRegisterModal;
window.switchToLoginModal = switchToLoginModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleLogout = handleLogout;

// Shared UI initialization
document.addEventListener("DOMContentLoaded", function () {
  initializeEyeIcons();
  setupPasswordToggleListeners();

  // Listen for authentication state changes
  import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, (user) => {
        updateNavAuthButtons();
        if (user) {
          console.log("User is signed in:", user.email);
        } else {
          console.log("User is signed out");
        }
      });
    });

  // Intercept nav links if not logged in
  document.querySelectorAll(".nav-link").forEach(function (link) {
    if (link.getAttribute("data-route") === "home") return;
    link.addEventListener("click", function (e) {
      if (!auth.currentUser) {
        e.preventDefault();
        openLoginModal();
        window.intendedRoute = link.getAttribute("href");
      }
    });
  });
});

// Carousel code
class AutoCarousel {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 8;
    this.isPlaying = true;
    this.intervalId = null;
    this.slideDuration = 3000; // 3 seconds per slide

    this.slides = document.getElementById("carouselSlides");
    this.dots = document.querySelectorAll(".dot");
    this.playPauseBtn = document.getElementById("playPauseBtn");
    this.currentSlideInfo = document.getElementById("currentSlideInfo");

    this.slideTexts = [
      "demonstrating sign language gesture 1",
      "demonstrating sign language gesture 2",
      "demonstrating sign language gesture 3",
      "demonstrating sign language gesture 4",
      "demonstrating sign language gesture 5",
      "demonstrating sign language gesture 6",
      "demonstrating sign language gesture 7",
      "demonstrating sign language gesture 8",
    ];

    this.init();
  }

  init() {
    this.startAutoPlay();
    this.setupEventListeners();
    this.updateSlideInfo();
  }

  setupEventListeners() {
    // Play/Pause button
    this.playPauseBtn.addEventListener("click", () => {
      this.togglePlayPause();
    });

    // Dot navigation
    this.dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        this.goToSlide(index);
      });
    });

    // Pause on hover
    this.slides.addEventListener("mouseenter", () => {
      if (this.isPlaying) {
        this.pauseAutoPlay();
      }
    });

    this.slides.addEventListener("mouseleave", () => {
      if (this.isPlaying) {
        this.startAutoPlay();
      }
    });
  }

  goToSlide(slideIndex) {
    this.currentSlide = slideIndex;
    const translateX = -(slideIndex * 12.5); // 12.5% per slide
    this.slides.style.transform = `translateX(${translateX}%)`;
    this.updateDots();
    this.updateSlideInfo();

    // Restart autoplay if playing
    if (this.isPlaying) {
      this.restartAutoPlay();
    }
  }

  nextSlide() {
    const nextIndex = (this.currentSlide + 1) % this.totalSlides;
    this.goToSlide(nextIndex);
  }

  updateDots() {
    this.dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === this.currentSlide);
    });
  }

  updateSlideInfo() {
    this.currentSlideInfo.textContent = this.slideTexts[this.currentSlide];
  }

  startAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, this.slideDuration);
  }

  pauseAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restartAutoPlay() {
    this.pauseAutoPlay();
    this.startAutoPlay();
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.startAutoPlay();
      this.playPauseBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                    `;
      this.playPauseBtn.title = "Pause";
    } else {
      this.pauseAutoPlay();
      this.playPauseBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="m7 4 10 6L7 20V4z"/>
                        </svg>
                    `;
      this.playPauseBtn.title = "Play";
    }
  }
}

// Initialize carousel when page loads
document.addEventListener("DOMContentLoaded", () => {
  new AutoCarousel();
});