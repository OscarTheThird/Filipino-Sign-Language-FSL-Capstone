// Category selection and interaction
const categoryCards = document.querySelectorAll(".category-card");
const startLearningBtn = document.getElementById("startLearningBtn");
const practiceBtn = document.getElementById("practiceBtn");

let selectedCategory = null;

// Sample progress data (using regular variables instead of localStorage)
const progressData = {
  alphabet: { completed: 0, total: 26 },
  numbers: { completed: 0, total: 10 },
  greetings: { completed: 0, total: 15 },
  emotions: { completed: 0, total: 12 },
  colors: { completed: 0, total: 10 },
};

// Update progress bar for a category
function updateProgressBar(category) {
  const card = document.querySelector(`[data-category="${category}"]`);
  const progressFill = card.querySelector(".progress-fill");
  const progressText = card.querySelector(".progress-text");

  const data = progressData[category];
  const percentage = (data.completed / data.total) * 100;

  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `${data.completed}/${data.total} completed`;

  // Add completion indicator
  if (data.completed === data.total) {
    card.classList.add("completed");
    if (!card.querySelector(".completion-badge")) {
      const badge = document.createElement("div");
      badge.className = "completion-badge";
      badge.innerHTML = "✓ Completed";
      card.appendChild(badge);
    }
  }
}

// Update all progress bars
function updateAllProgressBars() {
  Object.keys(progressData).forEach((category) => {
    updateProgressBar(category);
  });
}

// Handle category card clicks
categoryCards.forEach((card) => {
  card.addEventListener("click", () => {
    // Remove active class from all cards
    categoryCards.forEach((c) => c.classList.remove("active"));

    // Add active class to clicked card
    card.classList.add("active");

    // Update selected category
    selectedCategory = card.dataset.category;

    // Update button states
    startLearningBtn.disabled = false;
    practiceBtn.disabled = false;

    // Visual feedback
    card.style.transform = "translateY(-10px) scale(1.02)";
    setTimeout(() => {
      card.style.transform = "translateY(-10px)";
    }, 150);
  });

  // Add hover effects
  card.addEventListener("mouseenter", () => {
    if (!card.classList.contains("active")) {
      card.style.transform = "translateY(-10px)";
    }
  });

  card.addEventListener("mouseleave", () => {
    if (!card.classList.contains("active")) {
      card.style.transform = "translateY(0)";
    }
  });
});

// Handle start learning button
startLearningBtn.addEventListener("click", () => {
  if (selectedCategory) {
    // Simulate starting lesson
    alert(
      `Starting ${
        selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
      } lessons!\n\nThis would navigate to the lesson interface.`
    );

    // Simulate some progress for demo
    if (
      progressData[selectedCategory].completed <
      progressData[selectedCategory].total
    ) {
      progressData[selectedCategory].completed += 1;
      updateProgressBar(selectedCategory);
    }
  } else {
    alert("Please select a category first!");
  }
});

// Handle practice button
practiceBtn.addEventListener("click", () => {
  if (selectedCategory) {
    alert(
      `Starting practice mode for ${
        selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
      }!\n\nThis would open the practice interface.`
    );
  } else {
    alert("Please select a category first!");
  }
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  updateAllProgressBars();
  startLearningBtn.disabled = true;
  practiceBtn.disabled = true;
});

// Add some demo progress for visual effect
setTimeout(() => {
  progressData.alphabet.completed = 8;
  progressData.greetings.completed = 5;
  progressData.numbers.completed = 10; // Completed
  updateAllProgressBars();
}, 1000);
