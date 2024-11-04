const addLessonButton = document.getElementById('add-lesson-button');
const emailInput = document.getElementById('emailInput'); // Email input field
let currentSection = "";
let currentTopic = "";
let questions = [];
let currentQuestionIndex = 0;
let timePerQuestion = 60;
let remainingTime = timePerQuestion;
let timer;
let userAnswers = [];
let userEmail = ""; // To store user email

// Database references
let vocabDb, speechDb, pronunDb, sessionDb;

// Opening all the DBs
const vocabRequest = indexedDB.open("vocabularyDB", 2);
vocabRequest.onsuccess = function(event) {
    vocabDb = event.target.result;
};

const speechRequest = indexedDB.open("speechDB", 2);
speechRequest.onsuccess = function(event) {
    speechDb = event.target.result;
};

const pronunRequest = indexedDB.open("pronunciationDB", 2);
pronunRequest.onsuccess = function(event) {
    pronunDb = event.target.result;
};

// Opening sessionDB
const sessionRequest = indexedDB.open("sessionDB", 1);
sessionRequest.onupgradeneeded = function(event) {
    sessionDb = event.target.result;
    if (!sessionDb.objectStoreNames.contains("sessions")) {
        sessionDb.createObjectStore("sessions", { keyPath: "email" });
    }
};

sessionRequest.onsuccess = function(event) {
    sessionDb = event.target.result;
};

// Database reference for results
let resultDb;

// Open the resultDB
const resultRequest = indexedDB.open("resultDB", 2);
resultRequest.onupgradeneeded = function(event) {
    resultDb = event.target.result;
    if (!resultDb.objectStoreNames.contains("results")) {
        resultDb.createObjectStore("results", { keyPath: ["section", "topic"] });
    }
};

resultRequest.onsuccess = function(event) {
    resultDb = event.target.result;
};

// Function to display available topics based on the section selected
function displayTopics(section) {
    currentSection = section;
    document.getElementById("sectionSelection").style.display = 'none';
    document.getElementById("topicSection").style.display = 'block';
    document.getElementById("selectedSection").innerText = section.charAt(0).toUpperCase() + section.slice(1) + " Topics";

    let db, storeName;
    switch (section) {
        case 'vocabulary':
            db = vocabDb;
            storeName = 'vocabLessons';
            break;
        case 'speech':
            db = speechDb;
            storeName = 'speechLessons';
            break;
        case 'pronunciation':
            db = pronunDb;
            storeName = 'pronunciationLessons';
            break;
    }

    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    const topicList = document.getElementById('topicList');
    topicList.innerHTML = '';

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const topicItem = document.createElement('li');
            topicItem.innerHTML = `<strong>${cursor.value.lesson}</strong> 
                <button onclick="startTest('${cursor.value.lesson}')">Take Test</button>`;
            topicList.appendChild(topicItem);
            cursor.continue();
        }
    };
}

// Start the test for the selected topic
function startTest(topic) {
    
    
    currentTopic = topic;
    let db, storeName;
    switch (currentSection) {
        case 'vocabulary':
            db = vocabDb;
            storeName = 'vocabLessons';
            break;
        case 'speech':
            db = speechDb;
            storeName = 'speechLessons';
            break;
        case 'pronunciation':
            db = pronunDb;
            storeName = 'pronunciationLessons';
            break;
    }

    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    const getRequest = objectStore.get(topic);

    getRequest.onsuccess = function() {
        if (getRequest.result) {
            questions = getRequest.result.questions;
            currentQuestionIndex = 0;
            userAnswers = new Array(questions.length).fill(null); // Initialize userAnswers
            document.getElementById("topicSection").style.display = 'none';
            document.getElementById("testSection").style.display = 'block';
            document.getElementById('totalQuestions').innerText = questions.length;
            displayQuestion();
        }
    };
}

// Display the current question
function displayQuestion() {
    if (currentQuestionIndex < questions.length) {
        const currentQuestion = questions[currentQuestionIndex];
        document.getElementById('currentQuestionIndex').innerText = currentQuestionIndex + 1;
        document.getElementById('questionText').innerText = currentQuestion.question;

        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        currentQuestion.options.forEach((option, index) => {
            const optionItem = document.createElement('li');
            optionItem.innerHTML = `<input type="radio" name="questionOption" value="${index}"> ${option}`;
            optionsList.appendChild(optionItem);
        });

        // Pre-select previously saved answer if available
        if (userAnswers[currentQuestionIndex] !== null) {
            optionsList.children[userAnswers[currentQuestionIndex]].querySelector('input').checked = true;
        }

        // Show recording controls for pronunciation question
        if (currentSection === 'pronunciation') {
            document.getElementById('pronunciationRecording').style.display = 'block';
            startSpeechRecognition();
        } else {
            document.getElementById('pronunciationRecording').style.display = 'none';
        }

        startTimer();
        updateProgressBar();
    }
}

// Timer for each question
function startTimer() {
    clearInterval(timer);
    remainingTime = timePerQuestion;
    document.getElementById('timer').innerText = remainingTime;
    timer = setInterval(function() {
        remainingTime--;
        document.getElementById('timer').innerText = remainingTime;
        if (remainingTime <= 0) {
            saveAndNext();
        }
    }, 1000);
}

// Save answer and move to the next question
function saveAndNext() {
    const selectedOption = document.querySelector('input[name="questionOption"]:checked');
    if (selectedOption) {
        userAnswers[currentQuestionIndex] = parseInt(selectedOption.value);
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        submitTest();
    }
}

// Submit test and calculate score
function submitTest() {
    clearInterval(timer);
    let score = 0;

    questions.forEach((question, index) => {
        const userAnswerIndex = userAnswers[index];
        const correctAnswerIndex = question.correctAnswer - 1; // Subtract 1 for 0-based index

        // Check if the user answer is correct
        if (userAnswerIndex !== null && userAnswerIndex === correctAnswerIndex) {
            score++;
        }
    });

    // Display score and answers
    document.getElementById("testSection").style.display = 'none';
    document.getElementById("scoreSection").style.display = 'block';
    document.getElementById("scoreText").innerText = `${score} out of ${questions.length}`;
    
    // Store the result in the resultDB
    storeTestResult(currentSection, currentTopic, score, questions.length);
    displayAnswers();

}

// Function to store or update the result in resultDB
function storeTestResult(section, topic, score, totalQuestions) {
    const transaction = resultDb.transaction("results", "readwrite");
    const objectStore = transaction.objectStore("results");

    const getRequest = objectStore.get([section, topic]);

    getRequest.onsuccess = function(event) {
        const existingResult = event.target.result;

        if (existingResult) {
            // Update the existing result if the new score is better
            if (existingResult.score < score) {
                const updatedResult = {
                    section: section,
                    topic: topic,
                    score: score,
                    totalQuestions: totalQuestions
                };
                objectStore.put(updatedResult);
                console.log(`Updated result for ${section} - ${topic}: ${score}/${totalQuestions}`);
            } else {
                console.log(`Existing score is higher or equal. No update needed.`);
            }
        } else {
            // Add a new result if it doesn't exist
            const newResult = {
                section: section,
                topic: topic,
                score: score,
                totalQuestions: totalQuestions
            };
            objectStore.add(newResult);
            console.log(`Added new result for ${section} - ${topic}: ${score}/${totalQuestions}`);
        }
    };

    getRequest.onerror = function(event) {
        console.error("Error fetching result from resultDB", event);
    };
}
// Function to display the user's answers after test submission
function displayAnswers() {
    const answersList = document.getElementById('answersList');
    answersList.innerHTML = '';

    questions.forEach((question, index) => {
        const userAnswerIndex = userAnswers[index];
        const correctAnswerIndex = question.correctAnswer - 1; // Subtract 1 for 0-based index

        const answerItem = document.createElement('li');
        answerItem.innerHTML = `<strong>${question.question}</strong> <br>
            Your Answer: ${userAnswerIndex !== null ? question.options[userAnswerIndex] : "No answer"} <br>
            Correct Answer: ${question.options[correctAnswerIndex]}`;
        answersList.appendChild(answerItem);
    });
}
// Reset test to retake
function resetTest() {
    document.getElementById("scoreSection").style.display = 'none';
    document.getElementById("sectionSelection").style.display = 'block';
    questions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
}

// Speech recognition for pronunciation questions
let spokenText = '';
let recognition;

function startSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            console.log("Speech recognition started");
        };

        recognition.onresult = function(event) {
            spokenText = event.results[0][0].transcript;
            console.log("Spoken text: " + spokenText);
            saveSpokenAnswer();
        };

        recognition.onerror = function(event) {
            console.error("Speech recognition error: " + event.error);
        };

        recognition.onend = function() {
            console.log("Speech recognition ended");
        };

        recognition.start();
    } else {
        console.log("Speech recognition not supported");
    }
}

// Event listener to add new lessons
addLessonButton.addEventListener('click', function() {
    // Logic to add new lesson will be implemented here
});

// Function to save user's spoken answer
function saveSpokenAnswer() {
    userAnswers[currentQuestionIndex] = spokenText;
    console.log("Saved spoken answer: " + spokenText);
}

// Function to handle email submission
emailInput.addEventListener('change', function() {
    userEmail = emailInput.value;
    console.log("User email set to: " + userEmail);

    // Store session data if necessary
    const sessionTransaction = sessionDb.transaction("sessions", "readwrite");
    const sessionObjectStore = sessionTransaction.objectStore("sessions");
    sessionObjectStore.put({ email: userEmail });
});
// Update the progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const percentage = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${percentage}%`;
}