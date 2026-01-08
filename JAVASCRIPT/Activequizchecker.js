// Active Quiz Checker - Include this in all pages to redirect users with active quizzes
// Import this AFTER firebase.js

import { auth, db } from './firebase.js';
import { collection, getDocs, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
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

// 🔥 CRITICAL FIX: Check if user has any active quiz session that is currently open
async function checkActiveQuizSessions(userId) {
    if (!userId) return null;

    try {
        const activeQuizRef = collection(db, 'users', userId, 'activeQuiz');
        const querySnapshot = await getDocs(query(activeQuizRef));
        
        const now = Date.now();
        const HEARTBEAT_TIMEOUT = 30000; // 30 seconds - MUST match quiz page heartbeat interval
        
        // Check if any quiz is active AND recently active (heartbeat check)
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            if (data && data.active) {
                // Check if there's a recent heartbeat (lastHeartbeat timestamp)
                const lastHeartbeat = data.lastHeartbeat?.toMillis ? data.lastHeartbeat.toMillis() : data.lastHeartbeat;
                
                if (lastHeartbeat && (now - lastHeartbeat) < HEARTBEAT_TIMEOUT) {
                    // Quiz page is currently open (heartbeat is recent)
                    console.log(`✓ Active quiz detected: ${doc.id} (heartbeat ${Math.round((now - lastHeartbeat) / 1000)}s ago)`);
                    return {
                        quizId: doc.id,
                        quizData: data
                    };
                } else {
                    console.log(`⚠ Quiz ${doc.id} has stale heartbeat (${lastHeartbeat ? Math.round((now - lastHeartbeat) / 1000) + 's ago' : 'no heartbeat'}) - ignoring`);
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error checking active quiz sessions:', error);
        return null;
    }
}

// 🔥 NEW: Real-time monitoring for active quizzes
let activeQuizListener = null;

// Setup real-time listener for active quizzes
function setupActiveQuizListener(userId) {
    console.log('🎯 Setting up active quiz listener for user:', userId);
    
    // Remove existing listener if any
    if (activeQuizListener) {
        console.log('Removing existing listener');
        activeQuizListener();
        activeQuizListener = null;
    }
    
    const currentPath = window.location.pathname;
    const isOnQuizPage = currentPath.includes('quiz.html');
    
    // Only monitor if NOT on a quiz page
    if (isOnQuizPage) {
        console.log('On quiz page - skipping active quiz monitoring');
        return;
    }
    
    try {
        const activeQuizRef = collection(db, 'users', userId, 'activeQuiz');
        console.log('📡 Creating real-time listener for path:', `users/${userId}/activeQuiz`);
        
        // Set up real-time listener
        activeQuizListener = onSnapshot(
            query(activeQuizRef), 
            (snapshot) => {
                console.log('📩 Received snapshot update, docs count:', snapshot.docs.length);
                
                const now = Date.now();
                const HEARTBEAT_TIMEOUT = 30000;
                
                // Check all active quiz documents
                snapshot.docs.forEach((doc) => {
                    const data = doc.data();
                    console.log(`Checking quiz document ${doc.id}:`, {
                        active: data?.active,
                        hasHeartbeat: !!data?.lastHeartbeat,
                        lastHeartbeat: data?.lastHeartbeat
                    });
                    
                    if (data && data.active) {
                        const lastHeartbeat = data.lastHeartbeat?.toMillis ? data.lastHeartbeat.toMillis() : data.lastHeartbeat;
                        const timeSinceHeartbeat = lastHeartbeat ? now - lastHeartbeat : null;
                        
                        console.log(`Quiz ${doc.id} - Time since heartbeat: ${timeSinceHeartbeat ? Math.round(timeSinceHeartbeat / 1000) + 's' : 'no heartbeat'}`);
                        
                        // Check if heartbeat is recent
                        if (lastHeartbeat && timeSinceHeartbeat < HEARTBEAT_TIMEOUT) {
                            const quizId = doc.id;
                            const quizPageUrl = quizPageMap[quizId];
                            
                            if (quizPageUrl) {
                                console.log(`🚀 Real-time: Active quiz detected - ${quizId} (heartbeat ${Math.round(timeSinceHeartbeat / 1000)}s ago)`);
                                redirectToActiveQuiz(quizId, quizPageUrl, data);
                            } else {
                                console.warn(`No URL mapping for quiz: ${quizId}`);
                            }
                        } else {
                            console.log(`⏳ Quiz ${doc.id} heartbeat is stale or missing`);
                        }
                    }
                });
                
                if (snapshot.docs.length === 0) {
                    console.log('✓ No active quizzes found');
                }
            }, 
            (error) => {
                console.error('❌ Error in active quiz listener:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    name: error.name
                });
            }
        );
        
        console.log('✓ Real-time active quiz monitoring started successfully');
    } catch (error) {
        console.error('❌ Failed to setup listener:', error);
    }
}

// Function to handle redirection to active quiz
function redirectToActiveQuiz(quizId, quizPageUrl, quizData) {
    console.log('redirectToActiveQuiz called:', { quizId, quizPageUrl, isRedirecting: window.isRedirectingToQuiz });
    
    // Prevent multiple redirects
    if (window.isRedirectingToQuiz) {
        console.log('Already redirecting, skipping...');
        return;
    }
    
    // Also check if we've recently redirected (within last 5 seconds)
    const lastRedirectTime = sessionStorage.getItem('lastQuizRedirect');
    if (lastRedirectTime) {
        const timeSinceRedirect = Date.now() - parseInt(lastRedirectTime);
        if (timeSinceRedirect < 5000) {
            console.log('Recently redirected, skipping...');
            return;
        }
    }
    
    window.isRedirectingToQuiz = true;
    sessionStorage.setItem('lastQuizRedirect', Date.now().toString());
    
    console.log(`🚀 Redirecting to active ${quizId}...`);
    
    // Show a brief message before redirecting
    const redirectMessage = document.createElement('div');
    redirectMessage.id = 'quizRedirectMessage';
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
    
    const quizName = getQuizName(quizId);
    const questionNum = quizData.currentQuestion || 0;
    const totalQuestions = quizData.questions?.length || 10;
    
    redirectMessage.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 15px;">📝</div>
        <h3 style="color: #6d42c7; margin-bottom: 10px; font-size: 1.3rem;">Active Quiz Detected</h3>
        <p style="color: #666; font-size: 1rem; margin-bottom: 8px;"><strong>${quizName}</strong></p>
        <p style="color: #888; font-size: 0.9rem; margin-bottom: 15px;">Question ${questionNum + 1} of ${totalQuestions}</p>
        <p style="color: #999; font-size: 0.85rem;">Redirecting you back to your quiz...</p>
    `;
    
    document.body.appendChild(redirectMessage);
    
    console.log('Redirect message displayed, will redirect in 2 seconds to:', quizPageUrl);
    
    // Redirect after a brief delay
    setTimeout(() => {
        console.log('Executing redirect to:', quizPageUrl);
        window.location.href = quizPageUrl;
    }, 2000);
}

// Initial check and setup listener on auth state change
onAuthStateChanged(auth, async (user) => {
    console.log('🔐 Auth state changed:', user ? `User logged in: ${user.uid}` : 'User logged out');
    
    if (user) {
        const currentPath = window.location.pathname;
        const isOnQuizPage = currentPath.includes('quiz.html');
        
        console.log('Current path:', currentPath, '| Is on quiz page:', isOnQuizPage);
        
        if (!isOnQuizPage) {
            console.log('Not on quiz page, checking for active quizzes...');
            
            // Do initial check
            const activeQuiz = await checkActiveQuizSessions(user.uid);
            
            if (activeQuiz && activeQuiz.quizId) {
                const quizPageUrl = quizPageMap[activeQuiz.quizId];
                console.log('Active quiz found on login:', activeQuiz.quizId, '| URL:', quizPageUrl);
                
                if (quizPageUrl) {
                    redirectToActiveQuiz(activeQuiz.quizId, quizPageUrl, activeQuiz.quizData);
                    return; // Don't setup listener if we're redirecting
                }
            } else {
                console.log('✓ No active quiz detected on login');
            }
            
            // 🔥 Setup real-time monitoring (only if not redirecting)
            console.log('Setting up real-time listener...');
            setupActiveQuizListener(user.uid);
        } else {
            console.log('Already on quiz page - skipping redirect check and listener setup');
        }
    } else {
        console.log('User logged out, removing listener');
        // User logged out - remove listener
        if (activeQuizListener) {
            activeQuizListener();
            activeQuizListener = null;
            console.log('✓ Listener removed');
        }
    }
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    if (activeQuizListener) {
        activeQuizListener();
        activeQuizListener = null;
    }
});

console.log('✓ Active Quiz Checker loaded with real-time monitoring');