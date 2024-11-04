// Open or create IndexedDB for vocabulary
let vocabDb;
const vocabRequest = indexedDB.open("vocabularyDB", 2);

// Create the object store for vocabulary lessons and questions
vocabRequest.onupgradeneeded = function(event) {
    vocabDb = event.target.result;
    const vocabStore = vocabDb.createObjectStore("vocabLessons", { keyPath: "lesson" });
    vocabStore.createIndex("lesson", "lesson", { unique: true });
};

// Open or create IndexedDB for speech
let speechDb;
const speechRequest = indexedDB.open("speechDB", 2);

// Create the object store for speech lessons and questions
speechRequest.onupgradeneeded = function(event) {
    speechDb = event.target.result;
    const speechStore = speechDb.createObjectStore("speechLessons", { keyPath: "lesson" });
    speechStore.createIndex("lesson", "lesson", { unique: true });
};

// Open or create IndexedDB for pronunciation
let pronunDb;
const pronunRequest = indexedDB.open("pronunciationDB", 2);

// Create the object store for pronunciation lessons and questions
pronunRequest.onupgradeneeded = function(event) {
    pronunDb = event.target.result;
    const pronunStore = pronunDb.createObjectStore("pronunciationLessons", { keyPath: "lesson" });
    pronunStore.createIndex("lesson", "lesson", { unique: true });
};

// Function to add vocabulary question
document.getElementById('addVocabQuestion').addEventListener('click', function() {
    addVocabQuestion();
});

// Function to add speech question
document.getElementById('addSpeechQuestion').addEventListener('click', function() {
    addSpeechQuestion();
});

// Function to add pronunciation question
document.getElementById('addPronunciationQuestion').addEventListener('click', function() {
    addPronunciationQuestion();
});

// Function to add vocabulary questions
function addVocabQuestion() {
    const lesson = document.getElementById('vocabLesson').value;
    const question = document.getElementById('vocabQuestion').value;
    const options = [
        document.getElementById('vocabOption1').value,
        document.getElementById('vocabOption2').value,
        document.getElementById('vocabOption3').value,
        document.getElementById('vocabOption4').value
    ];
    const correctAnswer = document.getElementById('vocabCorrectAnswer').value;
    const difficulty = document.getElementById('vocabDifficulty').value;

    if (lesson && question && options.every(opt => opt)) {
        const transaction = vocabDb.transaction("vocabLessons", "readwrite");
        const vocabStore = transaction.objectStore("vocabLessons");

        const getRequest = vocabStore.get(lesson);
        getRequest.onsuccess = function() {
            let vocabData = getRequest.result;
            if (!vocabData) {
                vocabData = { lesson: lesson, questions: [] };
            }
            vocabData.questions.push({ question, options, correctAnswer, difficulty });
            vocabStore.put(vocabData);
            displayVocabLessons();
        };
    } else {
        alert('Please fill out all fields.');
    }

    document.getElementById('vocabForm').reset();
}

// Function to add speech questions with options and correct answers
function addSpeechQuestion() {
    const lesson = document.getElementById('speechLesson').value;
    const question = document.getElementById('speechQuestion').value;
    const options = [
        document.getElementById('speechOption1').value,
        document.getElementById('speechOption2').value,
        document.getElementById('speechOption3').value,
        document.getElementById('speechOption4').value
    ];
    const correctAnswer = document.getElementById('speechCorrectAnswer').value;
    const difficulty = document.getElementById('speechDifficulty').value;

    // Check if all fields are filled
    if (lesson && question && options.every(opt => opt)) {
        const transaction = speechDb.transaction("speechLessons", "readwrite");
        const speechStore = transaction.objectStore("speechLessons");

        const getRequest = speechStore.get(lesson);
        getRequest.onsuccess = function() {
            let speechData = getRequest.result;
            if (!speechData) {
                speechData = { lesson: lesson, questions: [] };
            }
            // Add question with options, correct answer, and difficulty
            speechData.questions.push({ question, options, correctAnswer, difficulty });
            speechStore.put(speechData);
            displaySpeechLessons();
        };
    } else {
        alert('Please fill out all fields.');
    }

    document.getElementById('speechForm').reset();
}

// Function to add pronunciation questions
function addPronunciationQuestion() {
    const lesson = document.getElementById('pronunciationLesson').value;
    const question = document.getElementById('pronunciationQuestion').value;
    const difficulty = document.getElementById('pronunciationDifficulty').value;

    if (lesson && question) {
        const transaction = pronunDb.transaction("pronunciationLessons", "readwrite");
        const pronunStore = transaction.objectStore("pronunciationLessons");

        const getRequest = pronunStore.get(lesson);
        getRequest.onsuccess = function() {
            let pronunData = getRequest.result;
            if (!pronunData) {
                pronunData = { lesson: lesson, questions: [] };
            }
            pronunData.questions.push({ question, difficulty });
            pronunStore.put(pronunData);
            displayPronunciationLessons();
        };
    } else {
        alert('Please fill out all fields.');
    }

    document.getElementById('pronunciationForm').reset();
}

// Function to display vocabulary lessons and questions
function displayVocabLessons() {
    const vocabList = document.getElementById('vocabList');
    vocabList.innerHTML = '';

    const transaction = vocabDb.transaction("vocabLessons", "readonly");
    const vocabStore = transaction.objectStore("vocabLessons");

    vocabStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const vocabData = cursor.value;
            const vocabSection = document.createElement('div');
            vocabSection.innerHTML = `<h4>${vocabData.lesson}</h4>
                <button onclick="deleteVocabLesson('${vocabData.lesson}')">Delete Lesson</button>
                <ul></ul>`;

            const questionList = vocabSection.querySelector('ul');
            vocabData.questions.forEach((q, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span><strong>Question:</strong> ${q.question}</span>
                    <span><strong>Options:</strong> ${q.options.join(', ')}</span>
                    <span><strong>Correct Answer:</strong> Option ${q.correctAnswer}</span>
                    <span><strong>Difficulty:</strong> ${q.difficulty}</span>
                    <button onclick="deleteVocabQuestion('${vocabData.lesson}', ${index})">Delete Question</button>
                `;
                questionList.appendChild(li);
            });

            vocabList.appendChild(vocabSection);
            cursor.continue();
        }
    };
}

// Function to display speech lessons and questions
function displaySpeechLessons() {
    const speechList = document.getElementById('speechList');
    speechList.innerHTML = '';

    const transaction = speechDb.transaction("speechLessons", "readonly");
    const speechStore = transaction.objectStore("speechLessons");

    speechStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const speechData = cursor.value;
            console.log("Speech Data:", speechData); // Log to check the structure

            const speechSection = document.createElement('div');
            speechSection.innerHTML = `<h4>${speechData.lesson}</h4>
                <button onclick="deleteSpeechLesson('${speechData.lesson}')">Delete Lesson</button>
                <ul></ul>`;

            const questionList = speechSection.querySelector('ul');

            // Check if questions is defined and is an array
            if (Array.isArray(speechData.questions)) {
                speechData.questions.forEach((q, index) => {
                    const options = Array.isArray(q.options) ? q.options : []; // Ensure options is an array
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span><strong>Question:</strong> ${q.question}</span>
                        <span><strong>Options:</strong> ${options.join(', ')}</span>
                        <span><strong>Correct Answer:</strong> Option ${q.correctAnswer}</span>
                        <span><strong>Difficulty:</strong> ${q.difficulty}</span>
                        <button onclick="deleteSpeechQuestion('${speechData.lesson}', ${index})">Delete Question</button>
                    `;
                    questionList.appendChild(li);
                });
            } else {
                console.error("No questions found for speech lesson:", speechData.lesson);
            }

            speechList.appendChild(speechSection);
            cursor.continue();
        }
    };
}

// Function to display pronunciation lessons and questions
function displayPronunciationLessons() {
    const pronunList = document.getElementById('pronunciationList');
    pronunList.innerHTML = '';

    const transaction = pronunDb.transaction("pronunciationLessons", "readonly");
    const pronunStore = transaction.objectStore("pronunciationLessons");

    pronunStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const pronunData = cursor.value;
            const pronunSection = document.createElement('div');
            pronunSection.innerHTML = `<h4>${pronunData.lesson}</h4>
                <button onclick="deletePronunciationLesson('${pronunData.lesson}')">Delete Lesson</button>
                <ul></ul>`;

            const questionList = pronunSection.querySelector('ul');
            pronunData.questions.forEach((q, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span><strong>Question:</strong> ${q.question}</span>
                    <span><strong>Difficulty:</strong> ${q.difficulty}</span>
                    <button onclick="deletePronunciationQuestion('${pronunData.lesson}', ${index})">Delete Question</button>
                `;
                questionList.appendChild(li);
            });

            pronunList.appendChild(pronunSection);
            cursor.continue();
        }
    };
}

// Function to delete vocabulary lesson
function deleteVocabLesson(lesson) {
    const transaction = vocabDb.transaction("vocabLessons", "readwrite");
    const vocabStore = transaction.objectStore("vocabLessons");
    vocabStore.delete(lesson);
    displayVocabLessons();
}

// Function to delete vocabulary question
function deleteVocabQuestion(lesson, index) {
    const transaction = vocabDb.transaction("vocabLessons", "readwrite");
    const vocabStore = transaction.objectStore("vocabLessons");

    const getRequest = vocabStore.get(lesson);
    getRequest.onsuccess = function() {
        const vocabData = getRequest.result;
        if (vocabData && vocabData.questions) {
            vocabData.questions.splice(index, 1);
            vocabStore.put(vocabData);
            displayVocabLessons();
        }
    };
}

// Function to delete speech lesson
function deleteSpeechLesson(lesson) {
    const transaction = speechDb.transaction("speechLessons", "readwrite");
    const speechStore = transaction.objectStore("speechLessons");
    speechStore.delete(lesson);
    displaySpeechLessons();
}

// Function to delete speech question
function deleteSpeechQuestion(lesson, index) {
    const transaction = speechDb.transaction("speechLessons", "readwrite");
    const speechStore = transaction.objectStore("speechLessons");

    const getRequest = speechStore.get(lesson);
    getRequest.onsuccess = function() {
        const speechData = getRequest.result;
        if (speechData && speechData.questions) {
            speechData.questions.splice(index, 1);
            speechStore.put(speechData);
            displaySpeechLessons();
        }
    };
}

// Function to delete pronunciation lesson
function deletePronunciationLesson(lesson) {
    const transaction = pronunDb.transaction("pronunciationLessons", "readwrite");
    const pronunStore = transaction.objectStore("pronunciationLessons");
    pronunStore.delete(lesson);
    displayPronunciationLessons();
}

// Function to delete pronunciation question
function deletePronunciationQuestion(lesson, index) {
    const transaction = pronunDb.transaction("pronunciationLessons", "readwrite");
    const pronunStore = transaction.objectStore("pronunciationLessons");

    const getRequest = pronunStore.get(lesson);
    getRequest.onsuccess = function() {
        const pronunData = getRequest.result;
        if (pronunData && pronunData.questions) {
            pronunData.questions.splice(index, 1);
            pronunStore.put(pronunData);
            displayPronunciationLessons();
        }
    };
}

// Call to display all lessons on page load
window.onload = function() {
    vocabRequest.onsuccess = function() {
        vocabDb = vocabRequest.result;
        displayVocabLessons();
    };

    speechRequest.onsuccess = function() {
        speechDb = speechRequest.result;
        displaySpeechLessons();
    };

    pronunRequest.onsuccess = function() {
        pronunDb = pronunRequest.result;
        displayPronunciationLessons();
    };
};
