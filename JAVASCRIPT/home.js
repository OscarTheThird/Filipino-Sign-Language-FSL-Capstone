// Import Firebase modules
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc,
  setDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Modal functions
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

// Close modals when clicking outside
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

// Authentication state management
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
    await signOut(auth);
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
          // Reset to password type when empty
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

// Show loading state
function showLoading(button, text = "Loading...") {
  button.disabled = true;
  button.textContent = text;
}

// Hide loading state
function hideLoading(button, text) {
  button.disabled = false;
  button.textContent = text;
}

// Show error message
function showError(message, isLogin = true) {
  const errorDiv = document.getElementById(
    isLogin ? "login-error" : "register-error"
  );
  if (!errorDiv) {
    // Create error div if it doesn't exist
    const newErrorDiv = document.createElement("div");
    newErrorDiv.id = isLogin ? "login-error" : "register-error";
    newErrorDiv.style.color = "#e11d48";
    newErrorDiv.style.marginBottom = "8px";
    newErrorDiv.style.fontSize = "14px";

    const form = document.getElementById(
      isLogin ? "loginForm" : "registerForm"
    );
    const submitButton = form.querySelector(
      isLogin ? ".login-btn" : ".register-btn"
    );
    form.insertBefore(newErrorDiv, submitButton);
  }

  const targetErrorDiv = document.getElementById(
    isLogin ? "login-error" : "register-error"
  );
  targetErrorDiv.textContent = message;
  targetErrorDiv.style.display = "block";
}

// Hide error message
function hideError(isLogin = true) {
  const errorDiv = document.getElementById(
    isLogin ? "login-error" : "register-error"
  );
  if (errorDiv) {
    errorDiv.style.display = "none";
  }
}

// Handle user registration
async function handleRegister(formData) {
  const registerBtn = document.querySelector(".register-btn");
  showLoading(registerBtn, "Creating Account...");
  hideError(false);

  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    // Save additional user data to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      age: parseInt(formData.age),
      gender: formData.gender,
      email: formData.email,
      createdAt: new Date().toISOString(),
    });

    closeRegisterModal();
    alert("Registration successful! Welcome to GestSure!");
  } catch (error) {
    console.error("Registration error:", error);
    let errorMessage = "Registration failed. Please try again.";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage =
          "Email is already registered. Please use a different email.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/weak-password":
        errorMessage = "Password should be at least 6 characters long.";
        break;
      case "auth/operation-not-allowed":
        errorMessage =
          "Email/password accounts are not enabled. Please contact support.";
        break;
    }

    showError(errorMessage, false);
  } finally {
    hideLoading(registerBtn, "REGISTER");
  }
}

// Handle user login
async function handleLogin(email, password) {
  const loginBtn = document.querySelector(".login-btn");
  showLoading(loginBtn, "Signing In...");
  hideError(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeLoginModal();

    // Redirect to intended route if exists
    if (window.intendedRoute) {
      window.location.href = window.intendedRoute;
      window.intendedRoute = null;
    }
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed. Please try again.";

    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email address.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case "auth/user-disabled":
        errorMessage =
          "This account has been disabled. Please contact support.";
        break;
    }

    showError(errorMessage, true);
  } finally {
    hideLoading(loginBtn, "LOGIN");
  }
}

// Make functions globally available
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.switchToRegisterModal = switchToRegisterModal;
window.switchToLoginModal = switchToLoginModal;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleLogout = handleLogout;

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  initializeEyeIcons();
  setupPasswordToggleListeners();

  // Listen for authentication state changes
  onAuthStateChanged(auth, (user) => {
    updateNavAuthButtons();
    if (user) {
      console.log("User is signed in:", user.email);
    } else {
      console.log("User is signed out");
    }
  });

  // Intercept nav links if not logged in
  document.querySelectorAll(".nav-link").forEach(function (link) {
    // Don't block Home link
    if (link.getAttribute("data-route") === "home") return;

    link.addEventListener("click", function (e) {
      if (!auth.currentUser) {
        e.preventDefault();
        openLoginModal();
        window.intendedRoute = link.getAttribute("href");
      }
    });
  });

  // Handle login form submission
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    handleLogin(email, password);
  });

  // Handle register form submission
  document
    .getElementById("registerForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      // Get form data
      const formInputs = e.target.querySelectorAll(".form-input");
      const formData = {
        firstName: formInputs[0].value.trim(),
        lastName: formInputs[1].value.trim(),
        age: formInputs[2].value,
        gender: formInputs[3].value,
        email: formInputs[4].value.trim(),
        password: formInputs[5].value,
        confirmPassword: formInputs[6].value,
      };

      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        showError("Passwords do not match!", false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        showError("Password must be at least 6 characters long.", false);
        return;
      }

      // Validate required fields
      if (
        !formData.firstName ||
        !formData.lastName ||
        !formData.age ||
        !formData.gender ||
        !formData.email
      ) {
        showError("Please fill in all required fields.", false);
        return;
      }

      handleRegister(formData);
    });
});


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
