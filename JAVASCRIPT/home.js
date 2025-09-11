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
  const profileMenu = document.querySelector(".profile-menu-container");
  const profileIconImg = document.querySelector(".profile-icon-img");
  if (auth.currentUser) {
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    profileMenu.style.display = "flex";
    // Set user photo if available, else fallback
    if (auth.currentUser.photoURL) {
      profileIconImg.src = auth.currentUser.photoURL;
    } else {
      profileIconImg.src = "/PICTURES/Home/profile.png";
    }
  } else {
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    profileMenu.style.display = "none";
    // Reset profile image
    profileIconImg.src = "/PICTURES/Home/profile.png";
  }
}

// Handle logout with confirmation popup
async function handleLogout() {
  // Custom popup confirmation
  if (!await showLogoutConfirmation()) {
    // If user cancels, do nothing
    return;
  }
  try {
    await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js")
      .then(({ signOut }) => signOut(auth));
    window.location.href = "home.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Error signing out. Please try again.");
  }
}

// Show confirmation modal for logout, returns a Promise<boolean>
function showLogoutConfirmation() {
  return new Promise((resolve) => {
    // If already present, remove previous
    let oldModal = document.getElementById('logoutConfirmModal');
    if (oldModal) oldModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
    modal.style.position = 'fixed';
    modal.style.left = 0;
    modal.style.top = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 99999;

    // Modal box
    const box = document.createElement('div');
    box.style.backgroundColor = '#fff';
    box.style.borderRadius = '12px';
    box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.17)';
    box.style.padding = '32px 28px 20px 28px';
    box.style.maxWidth = '350px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    // Modal content
    box.innerHTML = `
      <h2 style="font-size: 1.25rem; margin: 0 0 12px;">Confirm Logout</h2>
      <p style="color:#444; margin-bottom: 24px;">Are you sure you want to log out of your account?</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="logoutYesBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#e11d48; color:#fff; font-weight:600; cursor:pointer;">Yes, Logout</button>
        <button id="logoutNoBtn" style="padding:8px 18px; border:none; border-radius:6px; background:#ddd; color:#333; font-weight:500; cursor:pointer;">Cancel</button>
      </div>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    // Yes = resolve true, No = resolve false
    document.getElementById('logoutYesBtn').onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
    document.getElementById('logoutNoBtn').onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };

    // Close on escape key or click outside box
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    };
    document.addEventListener('keydown', function escListener(e) {
      if (e.key === "Escape") {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          resolve(false);
        }
        document.removeEventListener('keydown', escListener);
      }
    });
  });
}

// Profile menu: toggle dropdown and profile navigation
function setupProfileDropdown() {
  const profileMenu = document.querySelector(".profile-menu-container");
  const profileBtn = document.getElementById("profileIconBtn");
  // Open/close menu
  profileBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = profileMenu.classList.contains("open");
    document.querySelectorAll('.profile-menu-container.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) {
      profileMenu.classList.add("open");
      profileBtn.setAttribute("aria-expanded", "true");
    } else {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Close menu on outside click
  document.addEventListener("click", function (e) {
    if (!profileMenu.contains(e.target)) {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Keyboard accessibility
  profileBtn.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Tab") {
      profileMenu.classList.remove("open");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Menu actions
  document.getElementById("menuLogout").onclick = (e) => {
    e.preventDefault();
    profileMenu.classList.remove("open");
    handleLogout();
  };
  document.getElementById("menuProfile").onclick = (e) => {
    e.preventDefault();
    profileMenu.classList.remove("open");
    // Navigate to profile page
    window.location.href = "profile.html";
  };
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
  setupProfileDropdown();

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
}

// Initialize carousel when page loads
document.addEventListener("DOMContentLoaded", () => {
  new AutoCarousel();
});