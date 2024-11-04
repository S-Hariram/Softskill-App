// db-manager.js
export let db;

export function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("LessonsDB", 1);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            db.createObjectStore("lessons", { keyPath: "id", autoIncrement: true });
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve();
        };

        request.onerror = function(event) {
            reject('Error opening database: ' + event.target.error);
        };
    });
}

export function saveLesson(lesson) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["lessons"], "readwrite");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.add(lesson);

        request.onsuccess = function() {
            resolve();
        };

        request.onerror = function(event) {
            reject('Error saving lesson: ' + event.target.error);
        };
    });
}

export function getAllLessons() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["lessons"], "readonly");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject('Error retrieving lessons: ' + event.target.error);
        };
    });
}

export function deleteLesson(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["lessons"], "readwrite");
        const objectStore = transaction.objectStore("lessons");
        const request = objectStore.delete(Number(id));

        request.onsuccess = function() {
            resolve();
        };

        request.onerror = function(event) {
            reject('Error deleting lesson: ' + event.target.error);
        };
    });
}
