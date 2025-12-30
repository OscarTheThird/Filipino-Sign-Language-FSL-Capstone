z// Import Firebase modules
import { auth, db } from './firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Filipino Alphabet A-Z
const alphabetData = [
    { letter: 'A', video: '/PICTURES/fsl_alphabet/A.mp4' },
    { letter: 'B', video: '/PICTURES/fsl_alphabet/B.mp4' },
    { letter: 'C', video: '/PICTURES/fsl_alphabet/C.mp4' },
    { letter: 'D', video: '/PICTURES/fsl_alphabet/D.mp4' },
    { letter: 'E', video: '/PICTURES/fsl_alphabet/E.mp4' },
    { letter: 'F', video: '/PICTURES/fsl_alphabet/F.mp4' },
    { letter: 'G', video: '/PICTURES/fsl_alphabet/G.mp4' },
    { letter: 'H', video: '/PICTURES/fsl_alphabet/H.mp4' },
    { letter: 'I', video: '/PICTURES/fsl_alphabet/I.mp4' },
    { letter: 'J', video: '/PICTURES/fsl_alphabet/J.mp4' },
    { letter: 'K', video: '/PICTURES/fsl_alphabet/K.mp4' },
    { letter: 'L', video: '/PICTURES/fsl_alphabet/L.mp4' },
    { letter: 'M', video: '/PICTURES/fsl_alphabet/M.mp4' },
    { letter: 'N', video: '/PICTURES/fsl_alphabet/N.mp4' },
    { letter: 'O', video: '/PICTURES/fsl_alphabet/O.mp4' },
    { letter: 'P', video: '/PICTURES/fsl_alphabet/P.mp4' },
    { letter: 'Q', video: '/PICTURES/fsl_alphabet/Q.mp4' },
    { letter: 'R', video: '/PICTURES/fsl_alphabet/R.mp4' },
    { letter: 'S', video: '/PICTURES/fsl_alphabet/S.mp4' },
    { letter: 'T', video: '/PICTURES/fsl_alphabet/T.mp4' },
    { letter: 'U', video: '/PICTURES/fsl_alphabet/U.mp4' },
    { letter: 'V', video: '/PICTURES/fsl_alphabet/V.mp4' },
    { letter: 'W', video: '/PICTURES/fsl_alphabet/W.mp4' },
    { letter: 'X', video: '/PICTURES/fsl_alphabet/X.mp4' },
    { letter: 'Y', video: '/PICTURES/fsl_alphabet/Y.mp4' },
    { letter: 'Z', video: '/PICTURES/fsl_alphabet/Z.mp4' }
];

let currentQuestion = 0;
let score = 0;
let questions = [];
let currentUser = null;
let selectedAnswer = null;
let isAnswered = false;

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate quiz questions (10 random letters)
function generateQuestions() {
    const shuffled = shuffleArray([...alphabetData]);
    questions = shuffled.slice(0, 10).map(item => ({
        correctAnswer: item.letter,
        video: item.video,
        options: generateOptions(item.letter)
    }));
}

// Generate 4 options (1 correct + 3 random wrong answers)
function generateOptions(correctLetter) {
    const options = [correctLetter];
    const availableLetters = alphabetData.map(item => item.letter).filter(letter => letter !== correctLetter);
    const shuffled = shuffleArray(availableLetters);
    
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
        options.push(shuffled[i]);
    }
    
    return shuffleArray(options);
}

// Display current question
function displayQuestion() {
    if (currentQuestion >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestion];
    const videoEl = document.getElementById('quizVideo');
    const videoSource = document.getElementById('videoSource');
    const optionsContainer = document.getElementById('quizOptions');
    const feedbackEl = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('nextBtn');
    const questionNumber = document.getElementById('questionNumber');
    const scoreEl = document.getElementById('score');

    // Reset state
    selectedAnswer = null;
    isAnswered = false;
    feedbackEl.textContent = '';
    feedbackEl.className = 'quiz-feedback';
    nextBtn.style.display = 'none';

    // Update question number and score
    questionNumber.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    scoreEl.textContent = `Score: ${score}/${currentQuestion}`;

    // Set video
    videoSource.src = question.video;
    videoEl.load();
    videoEl.play().catch(error => {
        console.log('Video autoplay prevented:', error);
    });

    // Generate option buttons
    optionsContainer.innerHTML = '';
    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => selectAnswer(option, question.correctAnswer, btn);
        optionsContainer.appendChild(btn);
    });

    // Allow video replay on click
    videoEl.onclick = () => {
        videoEl.currentTime = 0;
        videoEl.play();
    };
}

// Handle answer selection
function selectAnswer(selected, correct, buttonElement) {
    if (isAnswered) return;

    isAnswered = true;
    selectedAnswer = selected;

    const options = document.querySelectorAll('.option-btn');
    const feedbackEl = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('nextBtn');

    // Disable all buttons
    options.forEach(btn => {
        btn.disabled = true;
    });

    // Mark correct/incorrect
    options.forEach(btn => {
        if (btn.textContent === correct) {
            btn.classList.add('correct');
        } else if (btn.textContent === selected && selected !== correct) {
            btn.classList.add('incorrect');
        }
    });

    // Show feedback
    if (selected === correct) {
        score++;
        feedbackEl.textContent = 'Correct! ✓';
        feedbackEl.className = 'quiz-feedback correct';
    } else {
        feedbackEl.textContent = `Incorrect. The correct answer is ${correct}.`;
        feedbackEl.className = 'quiz-feedback incorrect';
    }

    // Show next button
    nextBtn.style.display = 'block';

    // Update score display
    const scoreEl = document.getElementById('score');
    scoreEl.textContent = `Score: ${score}/${currentQuestion + 1}`;

    // Save progress if user is logged in
    if (currentUser) {
        saveQuizProgress();
    }
}

// Show results
function showResults() {
    const quizCard = document.querySelector('.quiz-card');
    const resultsEl = document.getElementById('quizResults');
    const finalScoreEl = document.getElementById('finalScore');
    const percentage = Math.round((score / questions.length) * 100);

    quizCard.style.display = 'none';
    resultsEl.style.display = 'block';

    finalScoreEl.textContent = `You scored ${score} out of ${questions.length} (${percentage}%)`;

    // Save final quiz results if user is logged in
    if (currentUser) {
        saveFinalQuizResults(score, questions.length, percentage);
    }
}

// Save quiz progress to Firebase
async function saveQuizProgress() {
    if (!currentUser) return;

    try {
        const quizRef = doc(db, 'users', currentUser.uid, 'quizzes', 'alphabet');
        const quizSnap = await getDoc(quizRef);

        const progressData = {
            currentQuestion: currentQuestion + 1,
            currentScore: score,
            totalQuestions: questions.length,
            lastUpdated: new Date()
        };

        if (quizSnap.exists()) {
            await setDoc(quizRef, progressData, { merge: true });
        } else {
            await setDoc(quizRef, progressData);
        }
    } catch (error) {
        console.error('Error saving quiz progress:', error);
    }
}

// Save final quiz results to Firebase
async function saveFinalQuizResults(score, total, percentage) {
    if (!currentUser) return;

    try {
        const quizRef = doc(db, 'users', currentUser.uid, 'quizzes', 'alphabet');
        await setDoc(quizRef, {
            score: score,
            total: total,
            percentage: percentage,
            completed: true,
            completedAt: new Date(),
            lastUpdated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving final quiz results:', error);
    }
}

// Initialize quiz
function initQuiz() {
    generateQuestions();
    currentQuestion = 0;
    score = 0;
    displayQuestion();

    // Next button handler
    document.getElementById('nextBtn').onclick = () => {
        currentQuestion++;
        displayQuestion();
    };

    // Restart button handler
    document.getElementById('restartBtn').onclick = () => {
        location.reload();
    };
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        currentUser = null;
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initQuiz();
});

