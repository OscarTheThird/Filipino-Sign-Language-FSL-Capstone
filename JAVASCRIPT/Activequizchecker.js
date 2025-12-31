// Active Quiz Checker - Include this in all pages to redirect users with active quizzes
// Import this AFTER firebase.js

import { auth, db } from './firebase.js';
import { collection, getDocs, query, deleteDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Map of quiz IDs to their page URLs
const quizPageMap = {
    'alphabet-quiz': '/HTML/Quiz/alphabetquiz.html',
    'numbers-quiz': '/HTML/Quiz/numbersquiz.html',
    'greetings-quiz': '/HTML/Quiz/greetingsquiz.html',
    'family-members-quiz': '/HTML/Quiz/familymembersquiz.html',
    'educational-context-quiz': '/HTML/Quiz/educationalcontextquiz.html',
    'emergency-quiz': '/HTML/Quiz/emergencyquiz.html',
    'phrases-quiz': '/HTML/Quiz/phrasesquiz.html',
    'time-markers-quiz': '/HTML/Quiz/timemarkersquiz.html',
    'wh-questions-quiz': '/HTML/Quiz/whquestionsquiz.html'
};

// Get quiz name from quiz ID
function getQuizName(quizId) {
    const nameMap = {
        'alphabet-quiz': 'Alphabet Quiz',
        'numbers-quiz': 'Numbers Quiz',
        'greetings-quiz': 'Greetings Quiz',
        'family-members-quiz': 'Family Members Quiz',
        'educational-context-quiz': 'Educational Context Quiz',
        'emergency-quiz': 'Emergency Quiz',
        'phrases-quiz': 'Phrases Quiz',
        'time-markers-quiz': 'Time Markers Quiz',
        'wh-questions-quiz': 'WH Questions Quiz'
    };
    return nameMap[quizId] || 'Quiz';
}

// Check if user has any active quiz session that is currently open
async function checkActiveQuizSessions(userId) {
    if (!userId) return null;

    try {
        const activeQuizRef = collection(db, 'users', userId, 'activeQuiz');
        const querySnapshot = await getDocs(query(activeQuizRef));
        
        const now = Date.now();
        const HEARTBEAT_TIMEOUT = 20000; // 20 seconds - if no heartbeat in 20s, quiz page is closed
        
        // Check if any quiz is active AND recently active (heartbeat check)
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            if (data && data.active) {
                // Check if there's a recent heartbeat (lastHeartbeat timestamp)
                const lastHeartbeat = data.lastHeartbeat?.toMillis ? data.lastHeartbeat.toMillis() : data.lastHeartbeat;
                
                if (lastHeartbeat && (now - lastHeartbeat) < HEARTBEAT_TIMEOUT) {
                    // Quiz page is currently open (heartbeat is recent)
                    return {
                        quizId: doc.id,
                        quizData: data
                    };
                } else {
                    console.log(`Quiz ${doc.id} is marked active but no recent heartbeat - quiz page likely closed`);
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error checking active quiz sessions:', error);
        return null;
    }
}

// Redirect to active quiz if one exists AND is currently open
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const currentPath = window.location.pathname;
        
        // Check if we're already on a quiz page
        const isOnQuizPage = currentPath.includes('quiz.html');
        
        // Only check if not already on a quiz page
        if (!isOnQuizPage) {
            const activeQuiz = await checkActiveQuizSessions(user.uid);
            
            if (activeQuiz && activeQuiz.quizId) {
                const quizPageUrl = quizPageMap[activeQuiz.quizId];
                
                if (quizPageUrl) {
                    console.log(`Active ${activeQuiz.quizId} detected with recent heartbeat! Redirecting...`);
                    
                    // Show a brief message before redirecting
                    const redirectMessage = document.createElement('div');
                    redirectMessage.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: white;
                        padding: 30px 40px;
                        border-radius: 12px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        z-index: 99999;
                        text-align: center;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    `;
                    
                    const quizName = getQuizName(activeQuiz.quizId);
                    const questionNum = activeQuiz.quizData.currentQuestion || 0;
                    const totalQuestions = activeQuiz.quizData.questions?.length || 10;
                    
                    redirectMessage.innerHTML = `
                        <div style="font-size: 2rem; margin-bottom: 15px;">📝</div>
                        <h3 style="color: #6d42c7; margin-bottom: 10px; font-size: 1.3rem;">Active Quiz Detected</h3>
                        <p style="color: #666; font-size: 1rem; margin-bottom: 8px;"><strong>${quizName}</strong></p>
                        <p style="color: #888; font-size: 0.9rem; margin-bottom: 15px;">Question ${questionNum + 1} of ${totalQuestions}</p>
                        <p style="color: #999; font-size: 0.85rem;">You have this quiz open elsewhere. Redirecting...</p>
                    `;
                    
                    document.body.appendChild(redirectMessage);
                    
                    // Redirect after a brief delay
                    setTimeout(() => {
                        const basePath = window.location.origin;
                        window.location.href = basePath + quizPageUrl;
                    }, 2000);
                } else {
                    console.warn(`No URL mapping found for quiz: ${activeQuiz.quizId}`);
                }
            }
        }
    }
});

console.log('Active Quiz Checker loaded with heartbeat detection');