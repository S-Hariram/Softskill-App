document.addEventListener('DOMContentLoaded', function() {
    const searchBar = document.getElementById('search-bar');
    const searchButton = document.getElementById('search-button');
    const filterDifficulty = document.getElementById('filter-difficulty');
    const lessonsContainer = document.getElementById('lessons-container');
    const lessonView = document.getElementById('lesson-view');
    const lessonContentDiv = document.getElementById('lesson-content');
    const backButton = document.getElementById('back-button');
    const addLessonButton = document.getElementById('add-lesson-button'); // Handle add lesson button

    let db;

    // Open IndexedDB
    const request = indexedDB.open("PronunciationLessonsDB", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        db.createObjectStore("lessons", { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displayFilteredLessons(); // Display lessons after DB is connected
    };

    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.errorCode);
    };

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

    function displayFilteredLessons() {
        const searchTerm = searchBar.value.trim().toLowerCase();
        const difficultyFilter = filterDifficulty.value;

        lessonsContainer.innerHTML = '';

        getLessons(function(lessons) {
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
                filteredLessons.forEach((lesson) => {
                    const lessonElement = document.createElement('div');
                    lessonElement.classList.add('lesson');
                    lessonElement.innerHTML = `
                        <h3>${lesson.title}</h3>
                        <p class="difficulty">Difficulty: ${lesson.difficulty}</p>
                        <button class="view-lesson" data-id="${lesson.id}">View Lesson</button>
                    `;
                    lessonsContainer.appendChild(lessonElement);

                    const viewButton = lessonElement.querySelector('.view-lesson');
                    viewButton.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        showLessonContent(id);
                    });
                });
            }
        });
    }

    function showLessonContent(id) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.get(Number(id));

        request.onsuccess = function(event) {
            const lesson = event.target.result;
            if (lesson) {
                lessonContentDiv.innerHTML = lesson.content;
                lessonsContainer.classList.add('hidden');
                lessonView.classList.remove('hidden');
            } else {
                console.error('Lesson not found.');
            }
        };

        request.onerror = function(event) {
            console.error('Error retrieving lesson from IndexedDB:', event.target.errorCode);
        };
    }

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

  

    displayFilteredLessons();
});
