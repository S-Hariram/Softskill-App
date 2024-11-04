document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-lesson-form');
    const lessonsContainer = document.getElementById('lessons-container');
    const lessonContentDiv = document.getElementById('lesson-content');
    const contentContainer = document.getElementById('content-container');
    const closeContentButton = document.getElementById('close-content');

    let db;

    // Open IndexedDB
    const request = indexedDB.open("PronunciationLessonsDB", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        db.createObjectStore("lessons", { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displayUploadedLessons();
    };

    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const title = document.getElementById('lesson-title').value;
        const difficulty = document.getElementById('lesson-difficulty').value;
        const fileInput = document.getElementById('file-upload');
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const result = e.target.result;
                let lesson = {
                    title: title,
                    difficulty: difficulty,
                    content: '',
                    type: file.type.split('/')[1] // 'pdf', 'doc', 'docx', or audio types
                };

                if (file.type === 'application/pdf') {
                    renderPDF(result, lesson);
                } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
                    renderDOCX(result, lesson);
                } else if (file.type.startsWith('audio/')) {
                    renderAudio(result, lesson, file.type);
                } else {
                    console.error('Unsupported file type:', file.type);
                }
            };

            reader.readAsArrayBuffer(file);
        } else {
            console.error('No file selected for upload');
        }
    });

    function renderPDF(fileData, lesson) {
        const loadingTask = pdfjsLib.getDocument({ data: fileData });
        loadingTask.promise.then(function(pdf) {
            const pages = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                pages.push(
                    pdf.getPage(i).then(function(page) {
                        const viewport = page.getViewport({ scale: 1.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        return page.render(renderContext).promise.then(function() {
                            return canvas.toDataURL(); // Get image data URL
                        });
                    })
                );
            }
            Promise.all(pages).then(function(images) {
                lesson.content = images.map(img => `<img src="${img}" style="max-width: 100%; margin-bottom: 10px;">`).join('');
                saveLesson(lesson);
            });
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
        });
    }

    function renderDOCX(fileData, lesson) {
        mammoth.convertToHtml({ arrayBuffer: fileData })
            .then(function(result) {
                lesson.content = result.value;
                saveLesson(lesson);
            })
            .catch(function(error) {
                console.error('Error reading DOC/DOCX file:', error);
            });
    }

    function renderAudio(fileData, lesson, fileType) {
        const blob = new Blob([fileData], { type: fileType });
        const url = URL.createObjectURL(blob);
        lesson.content = `<audio controls src="${url}" style="width: 100%;"></audio>`;
        saveLesson(lesson);
    }

    function saveLesson(lesson) {
        const transaction = db.transaction(["lessons"], "readwrite");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.add(lesson);

        request.onsuccess = function() {
            displayUploadedLessons();
        };

        request.onerror = function(event) {
            console.error('Error saving lesson:', event.target.error);
        };
    }

    function displayUploadedLessons() {
        lessonsContainer.innerHTML = '';
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            const lessons = event.target.result;
            lessons.forEach((lesson, index) => {
                const lessonElement = document.createElement('div');
                lessonElement.classList.add('lesson-item');
                lessonElement.innerHTML = `
                    <div>
                        <h3>${lesson.title}</h3>
                        <p class="difficulty">Difficulty: ${lesson.difficulty}</p>
                    </div>
                    <div class="actions">
                        <button class="view-lesson" data-id="${lesson.id}">View Lesson</button>
                        <button class="delete-lesson" data-id="${lesson.id}">Delete</button>
                    </div>
                `;
                lessonsContainer.appendChild(lessonElement);
            });

            addEventListeners();
        };
    }

    function addEventListeners() {
        document.querySelectorAll('.view-lesson').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                displayLessonContent(id);
            });
        });

        document.querySelectorAll('.delete-lesson').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteLesson(id);
            });
        });
    }

    function displayLessonContent(id) {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.get(Number(id));

        request.onsuccess = function(event) {
            const lesson = event.target.result;
            contentContainer.innerHTML = lesson.content;
            lessonContentDiv.classList.remove('hidden');
        };

        request.onerror = function(event) {
            console.error('Error retrieving lesson:', event.target.error);
        };
    }

    closeContentButton.addEventListener('click', function() {
        lessonContentDiv.classList.add('hidden');
    });

    function deleteLesson(id) {
        if (confirm('Are you sure you want to delete this lesson?')) {
            const transaction = db.transaction(["lessons"], "readwrite");
            const objectStore = transaction.objectStore("lessons");
            const request = objectStore.delete(Number(id));

            request.onsuccess = function() {
                displayUploadedLessons();
            };

            request.onerror = function(event) {
                console.error('Error deleting lesson:', event.target.error);
            };
        }
    }
});
