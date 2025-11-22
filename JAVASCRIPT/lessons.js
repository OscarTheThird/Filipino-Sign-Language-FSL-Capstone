const lessonMap = {
    alphabetCard: {
        href: 'alphabet.html',
        title: 'Continue to Alphabet Lesson?',
        msg: 'Are you sure you want to proceed to the Alphabet lesson?'
    },
    numbersCard: {
        href: 'numbers.html',
        title: 'Continue to Numbers Lesson?',
        msg: 'Are you sure you want to proceed to the Numbers lesson?'
    },
    greetingsCard: {
        href: 'greetings.html',
        title: 'Continue to Greetings Lesson?',
        msg: 'Are you sure you want to proceed to the Greetings lesson?'
    },
    whquestionsCard: {
        href: 'whquestions.html',
        title: 'Continue to WH Questions Lesson?',
        msg: 'Are you sure you want to proceed to the Basic WH Questions lesson?'
    },
    familyCard: {
        href: 'family.html',
        title: 'Continue to Family Members Lesson?',
        msg: 'Are you sure you want to proceed to the Family Members lesson?'
    },
    phrasesCard: {
        href: 'phrases.html',
        title: 'Continue to Common Phrases Lesson?',
        msg: 'Are you sure you want to proceed to the Common Phrases lesson?'
    },
    daysCard: {
        href: 'days.html',
        title: 'Continue to Days of the Week Lesson?',
        msg: 'Are you sure you want to proceed to the Days of the Week lesson?'
    }
};

// Progress data for each lesson category
const progressData = {
    alphabetCard: {
        completed: 18,
        total: 26,
        percentage: 69 // 18/26 * 100 ≈ 69%
    },
    numbersCard: {
        completed: 10,
        total: 10,
        percentage: 100 // Completed
    },
    greetingsCard: {
        completed: 3,
        total: 15,
        percentage: 20 // Just started
    },
    whquestionsCard: {
        completed: 5,
        total: 8,
        percentage: 63 // In progress
    },
    familyCard: {
        completed: 0,
        total: 12,
        percentage: 0 // Not started
    },
    phrasesCard: {
        completed: 8,
        total: 20,
        percentage: 40 // In progress
    },
    daysCard: {
        completed: 7,
        total: 7,
        percentage: 100 // Completed
    }
};

// Function to update progress for all cards
function updateAllProgress() {
    Object.keys(progressData).forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            const progressBar = card.querySelector('.progress-fill');
            const progressText = card.querySelector('.progress-text');
            const data = progressData[cardId];
            
            if (progressBar && progressText) {
                // Update progress bar width
                progressBar.style.width = `${data.percentage}%`;
                
                // Update progress text
                progressText.textContent = `${data.completed}/${data.total} completed`;
                
                // Add visual feedback based on progress
                if (data.percentage === 100) {
                    progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)'; // Green for completed
                    card.classList.add('completed-lesson');
                } else if (data.percentage >= 50) {
                    progressBar.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)'; // Blue-purple for in progress
                } else if (data.percentage > 0) {
                    progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #f97316)'; // Orange for just started
                } else {
                    progressBar.style.background = '#e2e8f0'; // Gray for not started
                }
            }
        }
    });
}

let selectedLessonHref = '';

// Initialize progress when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateAllProgress();
});

Object.keys(lessonMap).forEach(cardId => {
    document.getElementById(cardId).addEventListener('click', function () {
        selectedLessonHref = lessonMap[cardId].href;
        document.getElementById('modalTitle').textContent = lessonMap[cardId].title;
        document.getElementById('modalMessage').textContent = lessonMap[cardId].msg;
        document.getElementById('confirmModal').style.display = 'flex';
    });
});

document.getElementById('modalContinueBtn').addEventListener('click', function () {
    window.location.href = selectedLessonHref;
});

document.getElementById('modalCancelBtn').addEventListener('click', function () {
    document.getElementById('confirmModal').style.display = 'none';
    selectedLessonHref = '';
});

document.getElementById('confirmModal').addEventListener('click', function (e) {
    if (e.target === this) {
        this.style.display = 'none';
        selectedLessonHref = '';
    }
});

// Optional: Function to simulate progress updates (for testing)
function simulateProgressUpdate(cardId, newCompleted) {
    if (progressData[cardId]) {
        progressData[cardId].completed = Math.min(newCompleted, progressData[cardId].total);
        progressData[cardId].percentage = Math.round((progressData[cardId].completed / progressData[cardId].total) * 100);
        updateAllProgress();
    }
}