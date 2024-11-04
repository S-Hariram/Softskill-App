const addLessonButton = document.getElementById('add-lesson-button');

let currentSection = "";
let currentTopic = "";
let questions = [];
let currentQuestionIndex = 0;
let timePerQuestion = 60;
let remainingTime = timePerQuestion;
let timer;
let userAnswers = [];
// Event listener to add new lessons
addLessonButton.addEventListener('click', function() {
    // Logic to add new lesson will be implemented here
    window.location.href = 'admin-test-creation.html'; // Replace with your actual HTML page

});



// Database references
let vocabDb, speechDb, pronunDb;

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

// Display user's answers
function displayAnswers() {
    const answersList = document.getElementById('answersList');
    answersList.innerHTML = '';
    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index] !== null ? question.options[userAnswers[index]] : "No answer";
        const correctAnswer = question.options[question.correctAnswer - 1]; // Subtract 1 for 0-based index
        const listItem = document.createElement('li');
        listItem.innerText = `Q${index + 1}: ${question.question} - Your Answer: ${userAnswer} - Correct Answer: ${correctAnswer}`;
        answersList.appendChild(listItem);
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

let recognition;  // Speech recognition object
let spokenText = ''; // Variable to store spoken text

// Initialize and start Speech Recognition
function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser doesn't support speech recognition.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        console.log('Speech recognition started');
        const startButton = document.getElementById('startRecording');
        const stopButton = document.getElementById('stopRecording');
        
        if (startButton) startButton.style.display = 'none';  // Hide Start button
        if (stopButton) stopButton.style.display = 'block';  // Show Stop button
    };

    recognition.onresult = function(event) {
        spokenText = event.results[0][0].transcript.toLowerCase();
        checkPronunciation(spokenText);
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event);
        alert('Error occurred in recognition: ' + event.error);
    };

    recognition.onend = function() {
        console.log('Speech recognition ended');
        const startButton = document.getElementById('startRecording');
        const stopButton = document.getElementById('stopRecording');

        if (startButton) startButton.style.display = 'block';  // Show Start button
        if (stopButton) stopButton.style.display = 'none';   // Hide Stop button
    };
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event);
    
        switch(event.error) {
            case 'no-speech':
                alert("No speech was detected. Please try speaking clearly.");
                break;
            case 'audio-capture':
                alert("No microphone was found. Please ensure a microphone is connected.");
                break;
            case 'not-allowed':
                alert("Microphone access was denied. Please check your permissions.");
                break;
            case 'service-not-allowed':
                alert("Speech recognition service is not allowed.");
                break;
            default:
                alert("An error occurred: " + event.error);
        }
    };
    

    recognition.start();
}

// Stop Speech Recognition
function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
    }
}

// Check the pronunciation against the correct answer
function checkPronunciation(spokenText) {
    const correctAnswer = questions[currentQuestionIndex].correctAnswerText.toLowerCase();
    const distance = getLevenshteinDistance(spokenText, correctAnswer);
    
    // Adjust tolerance level
    if (distance <= 2) {
        alert(`Correct! You said "${spokenText}" correctly.`);
    } else {
        alert(`Incorrect. You said "${spokenText}", but the correct pronunciation is "${correctAnswer}".`);
    }
}

// Levenshtein distance function for string comparison
function getLevenshteinDistance(a, b) {
    const matrix = [];

    // Initialize the matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,  // Substitution
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)  // Insertion or Deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Function to initialize the UI for the pronunciation test
function initializePronunciationUI() {
    document.getElementById('stopRecording').style.display = 'none';  // Hide Stop button initially
}

// Call this function on page load or appropriate event
window.onload = initializePronunciationUI;


// Update the progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const percentage = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${percentage}%`;
}
recognition.onerror = function(event) {
    console.error('Speech recognition error:', event);

    switch(event.error) {
        case 'no-speech':
            alert("No speech was detected. Please try speaking clearly.");
            break;
        case 'audio-capture':
            alert("No microphone was found. Please ensure a microphone is connected.");
            break;
        case 'not-allowed':
            alert("Microphone access was denied. Please check your permissions.");
            break;
        case 'service-not-allowed':
            alert("Speech recognition service is not allowed.");
            break;
        default:
            alert("An error occurred: " + event.error);
    }
};
// Event listener to add new lessons
addLessonButton.addEventListener('click', function() {
    // Logic to add new lesson will be implemented here
    window.location.href = 'admin-test-creation.html'; // Replace with your actual HTML page

});

