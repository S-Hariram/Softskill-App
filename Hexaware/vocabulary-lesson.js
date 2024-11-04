document.addEventListener('DOMContentLoaded', function () {
    const searchBar = document.getElementById('search-bar');
    const searchButton = document.getElementById('search-button');
    const filterDifficulty = document.getElementById('filter-difficulty');
    const lessonsContainer = document.getElementById('lessons-container');
    const lessonView = document.getElementById('lesson-view');
    const lessonContentDiv = document.getElementById('lesson-content');
    const backButton = document.getElementById('back-button');
    const addLessonButton = document.getElementById('add-lesson-button');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const completeLessonButton = document.getElementById('complete-lesson-button');
    const progressButton = document.getElementById('progress-button'); // For viewing progress

    let db;
    let currentLessonId = null;
    let currentLessonIndex = -1;
    let lessons = [];

    // Open IndexedDB for VocabularyLessonsDB
    const request = indexedDB.open("VocabularyLessonsDB", 2); // Updated version

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("lessons")) {
            db.createObjectStore("lessons", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("completedLessons")) {
            db.createObjectStore("completedLessons", { keyPath: "lessonId" }); // To store completed lessons
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        displayFilteredLessons();
    };

    function getLessons(callback) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            callback(request.result);
        };

        request.onerror = function (event) {
            console.error('Error retrieving lessons from IndexedDB:', event.target.errorCode);
        };
    }

    function getCompletedLessons(callback) {
        const transaction = db.transaction(["completedLessons"], "readonly");
        const objectStore = transaction.objectStore("completedLessons");
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            callback(request.result);
        };

        request.onerror = function (event) {
            console.error('Error retrieving completed lessons from IndexedDB:', event.target.errorCode);
        };
    }

    function displayFilteredLessons() {
        const searchTerm = searchBar.value.trim().toLowerCase();
        const difficultyFilter = filterDifficulty.value;

        lessonsContainer.innerHTML = '';

        getLessons(function (lessonList) {
            lessons = lessonList;

            const filteredLessons = lessons.filter(lesson => {
                const titleMatches = lesson.title.toLowerCase().includes(searchTerm);
                const difficultyMatches = !difficultyFilter || lesson.difficulty === difficultyFilter;
                return titleMatches && difficultyMatches;
            });

            if (filteredLessons.length === 0) {
                const noResultsMessage = document.createElement('p');
                noResultsMessage.textContent = 'No results found';
                lessonsContainer.appendChild(noResultsMessage);
            } else {
                filteredLessons.forEach((lesson, index) => {
                    const lessonElement = document.createElement('div');
                    lessonElement.classList.add('lesson');
                    lessonElement.innerHTML = `
                        <h3>${lesson.title}</h3>
                        <p class="difficulty">Difficulty: ${lesson.difficulty}</p>
                        <button class="view-lesson" data-id="${lesson.id}" data-index="${index}">View Lesson</button>
                    `;
                    lessonsContainer.appendChild(lessonElement);

                    const viewButton = lessonElement.querySelector('.view-lesson');
                    viewButton.addEventListener('click', function () {
                        const id = this.getAttribute('data-id');
                        const index = this.getAttribute('data-index');
                        showLessonContent(id, index);
                    });
                });
            }
        });
    }

    function showLessonContent(id, index) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.get(Number(id));

        request.onsuccess = function (event) {
            const lesson = event.target.result;
            if (lesson) {
                lessonContentDiv.innerHTML = lesson.content;
                lessonView.classList.remove('hidden');
                lessonsContainer.classList.add('hidden'); // Hide the lessons container
                currentLessonId = id;
                currentLessonIndex = index;
                updateButtonStates();
            } else {
                console.error('Lesson not found.');
            }
        };

        request.onerror = function (event) {
            console.error('Error retrieving lesson from IndexedDB:', event.target.errorCode);
        };
    }

    function updateButtonStates() {
        prevButton.disabled = currentLessonIndex <= 0;
        nextButton.disabled = currentLessonIndex >= lessons.length - 1;
    }

    function markLessonComplete() {
        const transaction = db.transaction(["completedLessons"], "readwrite");
        const objectStore = transaction.objectStore("completedLessons");
        const request = objectStore.put({ lessonId: currentLessonId }); // Add lessonId to completedLessons store

        request.onsuccess = function () {
            alert('Lesson marked as complete');
        };

        request.onerror = function (event) {
            console.error('Error marking lesson as complete:', event.target.error);
        };
    }


    function showProgress() {
        getLessons(function (totalLessons) {
            getCompletedLessons(function (completedLessons) {
                const total = totalLessons.length;
                const completed = completedLessons.length;
                const progressPercentage = (completed / total) * 100;
    
                // Update the progress bar fill and percentage text
                const progressFill = document.getElementById('progress-fill');
                const progressText = document.getElementById('progress-text');
    
                // Set the width of the progress fill based on the percentage
                progressFill.style.width = `${progressPercentage}%`;
                progressText.textContent = `${progressPercentage.toFixed(2)}%`;
    
                // Show the progress bar container if it's hidden
                document.querySelector('.progress-container').style.display = 'block';
            });
        });
    }
    
  
    prevButton.addEventListener('click', function () {
        if (currentLessonIndex > 0) {
            currentLessonIndex--;
            const prevLesson = lessons[currentLessonIndex];
            showLessonContent(prevLesson.id, currentLessonIndex);
        }
    });

    nextButton.addEventListener('click', function () {
        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            const nextLesson = lessons[currentLessonIndex];
            showLessonContent(nextLesson.id, currentLessonIndex);
        }
    });

    completeLessonButton.addEventListener('click', markLessonComplete);

    backButton.addEventListener('click', function () {
        lessonView.classList.add('hidden'); // Hide the lesson view
        lessonsContainer.classList.remove('hidden'); // Show the lessons container
    });

    searchButton.addEventListener('click', displayFilteredLessons);

    filterDifficulty.addEventListener('change', displayFilteredLessons);

    searchBar.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            displayFilteredLessons();
        }
    });

    addLessonButton.addEventListener('click', function () {
        window.location.href = 'admin-vocabulary.html';
    });

    progressButton.addEventListener('click', showProgress); // Button to show progress

    displayFilteredLessons();
});
