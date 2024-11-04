document.addEventListener('DOMContentLoaded', function() { 
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
    const recordedLessonsList = document.getElementById('recorded-lessons-list'); // Added for displaying recorded lessons

    let db;
    let currentLessonId = null;
    let currentLessonIndex = -1;
    let lessons = [];
    let recordedLessons = [];

    // Open IndexedDB
    const request = indexedDB.open("LessonsDB", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("lessons")) {
            db.createObjectStore("lessons", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("recordedLessons")) {
            db.createObjectStore("recordedLessons", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displayFilteredLessons();
        displayRecordedLessons();
    };

    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.errorCode);
    };

    // Fetch all lessons
    function getLessons(callback) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            callback(request.result);
        };

        request.onerror = function(event) {
            console.error('Error retrieving lessons from IndexedDB:', event.target.errorCode);
        };
    }

    // Fetch all recorded lessons
    function getRecordedLessons(callback) {
        const transaction = db.transaction(["recordedLessons"], "readonly");
        const objectStore = transaction.objectStore("recordedLessons");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            callback(request.result);
        };

        request.onerror = function(event) {
            console.error('Error retrieving recorded lessons from IndexedDB:', event.target.errorCode);
        };
    }

    // Display filtered lessons
    function displayFilteredLessons() {
        const searchTerm = searchBar.value.trim().toLowerCase();
        const difficultyFilter = filterDifficulty.value;

        lessonsContainer.innerHTML = '';

        getLessons(function(lessonList) {
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
                    viewButton.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        const index = this.getAttribute('data-index');
                        showLessonContent(id, index);
                    });
                });
            }
        });
    }

    // Display recorded lessons
    function displayRecordedLessons() {
        recordedLessonsList.innerHTML = ''; // Clear previous recorded lessons list

        getRecordedLessons(function(recordedList) {
            recordedLessons = recordedList;

            if (recordedLessons.length === 0) {
                const noRecordedLessonsMessage = document.createElement('p');
                noRecordedLessonsMessage.textContent = 'No recorded lessons available';
                recordedLessonsList.appendChild(noRecordedLessonsMessage);
            } else {
                recordedLessons.forEach(recordedLesson => {
                    const recordedLessonElement = document.createElement('li');
                    recordedLessonElement.classList.add('recorded-lesson');
                    recordedLessonElement.innerHTML = `
                        <h4>${recordedLesson.title}</h4>
                        <a href="${recordedLesson.link}" target="_blank">Watch Recording</a>
                    `;
                    recordedLessonsList.appendChild(recordedLessonElement);
                });
            }
        });
    }

    // Show lesson content
    function showLessonContent(id, index) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.get(Number(id));

        request.onsuccess = function(event) {
            const lesson = event.target.result;
            if (lesson) {
                lessonContentDiv.innerHTML = lesson.content;
                lessonView.classList.remove('hidden');
                lessonsContainer.classList.add('hidden');
                currentLessonId = id;
                currentLessonIndex = index;
                updateButtonStates();
            } else {
                console.error('Lesson not found.');
            }
        };

        request.onerror = function(event) {
            console.error('Error retrieving lesson from IndexedDB:', event.target.errorCode);
        };
    }

    // Update previous/next button states
    function updateButtonStates() {
        prevButton.disabled = currentLessonIndex <= 0;
        nextButton.disabled = currentLessonIndex >= lessons.length - 1;
    }

    // Mark lesson as complete
    function markLessonComplete() {
        const transaction = db.transaction(["lessons"], "readwrite");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.get(Number(currentLessonId));

        request.onsuccess = function(event) {
            const lesson = event.target.result;
            if (lesson) {
                lesson.completed = true;
                const updateRequest = objectStore.put(lesson);

                updateRequest.onsuccess = function() {
                    alert('Lesson marked as complete');
                };

                updateRequest.onerror = function(event) {
                    console.error('Error updating lesson:', event.target.error);
                };
            } else {
                console.error('Lesson not found.');
            }
        };

        request.onerror = function(event) {
            console.error('Error retrieving lesson from IndexedDB:', event.target.errorCode);
        };
    }

    // Navigation button events
    prevButton.addEventListener('click', function() {
        if (currentLessonIndex > 0) {
            currentLessonIndex--;
            const prevLesson = lessons[currentLessonIndex];
            showLessonContent(prevLesson.id, currentLessonIndex);
        }
    });

    nextButton.addEventListener('click', function() {
        if (currentLessonIndex < lessons.length - 1) {
            currentLessonIndex++;
            const nextLesson = lessons[currentLessonIndex];
            showLessonContent(nextLesson.id, currentLessonIndex);
        }
    });

    completeLessonButton.addEventListener('click', markLessonComplete);

    backButton.addEventListener('click', function() {
        lessonView.classList.add('hidden');
        lessonsContainer.classList.remove('hidden');
    });

    searchButton.addEventListener('click', displayFilteredLessons);

    filterDifficulty.addEventListener('change', displayFilteredLessons);

    searchBar.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            displayFilteredLessons();
        }
    });

    addLessonButton.addEventListener('click', function() {
        window.location.href = 'admin-speech.html';
    });

    // Add recorded lesson functionality for admin
    document.getElementById('add-recorded-lesson-button').addEventListener('click', function() {
        const title = prompt("Enter recorded lesson title:");
        const link = prompt("Enter YouTube link for the recorded lesson:");
        
        if (title && link) {
            const transaction = db.transaction(["recordedLessons"], "readwrite");
            const objectStore = transaction.objectStore("recordedLessons");
            const request = objectStore.add({ title, link });

            request.onsuccess = function() {
                alert('Recorded lesson added successfully');
                displayRecordedLessons(); // Refresh recorded lessons
            };

            request.onerror = function(event) {
                console.error('Error adding recorded lesson:', event.target.errorCode);
            };
        }
    });

    displayFilteredLessons();
    displayRecordedLessons();
});
