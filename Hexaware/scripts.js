// IndexedDB setup for user database
let db;
const request = indexedDB.open("UserDatabase", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const userStore = db.createObjectStore("users", { keyPath: "username" });
    userStore.createIndex("password", "password", { unique: false });
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onerror = function(event) {
    console.error("Database error:", event.target.errorCode);
};

// Session Database for storing logged-in user
let sessionDb;
const sessionRequest = indexedDB.open('SessionDB', 1);

sessionRequest.onupgradeneeded = function(event) {
    sessionDb = event.target.result;
    const sessionStore = sessionDb.createObjectStore("session", { keyPath: "username" });
    sessionStore.createIndex("fullName", "fullName", { unique: false });
    sessionStore.createIndex("email", "email", { unique: false });
};

sessionRequest.onsuccess = function(event) {
    sessionDb = event.target.result;
    loadSessionUserData(); // Load user data from session
};

sessionRequest.onerror = function(event) {
    console.error("Session Database error:", event.target.errorCode);
};

// Function to handle user login
function login(username, password) {
    const transaction = db.transaction(["users"], "readonly");
    const userStore = transaction.objectStore("users");
    const request = userStore.get(username);

    request.onsuccess = function(event) {
        const user = event.target.result;
        if (user && user.password === password) {
            storeLoggedInUserSession(user);
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('welcome-message').textContent = `Welcome, ${user.fullName}`;
        } else {
            alert('Invalid username or password');
        }
    };

    request.onerror = function(event) {
        console.error("Error fetching user:", event.target.error);
    };
}

// Store logged-in user session
function storeLoggedInUserSession(user) {
    const transaction = sessionDb.transaction(["session"], "readwrite");
    const sessionStore = transaction.objectStore("session");
    const loggedInUser = {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        lastLogin: new Date().toISOString()
    };

    const request = sessionStore.put(loggedInUser);
    request.onsuccess = function() {
        console.log('User session stored successfully');
    };

    request.onerror = function(event) {
        console.error('Error storing user session:', event.target.error);
    };
}

// Function to load and display session user data
function loadSessionUserData() {
    const transaction = sessionDb.transaction(["session"], "readonly");
    const sessionStore = transaction.objectStore("session");
    const getSessionRequest = sessionStore.getAll();

    getSessionRequest.onsuccess = function(event) {
        const users = event.target.result;
        if (users.length > 0) {
            const user = users[0];
            document.getElementById('full-name-display').textContent = user.fullName;
            document.getElementById('email-display').textContent = user.email;
            document.getElementById('welcome-message').textContent = `Welcome, ${user.fullName}!`;
        }
    };

    getSessionRequest.onerror = function(event) {
        console.error('Error fetching user session:', event.target.error);
    };
}

// Function to handle search action
async function handleSearch() {
    const searchQuery = document.getElementById('search-bar1').value.toLowerCase();
    const wordData = await fetchWordDetails(searchQuery);
    renderSearchResults(wordData);
}

// Function to fetch word details
async function fetchWordDetails(word) {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    try {
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            return data[0];
        } else {
            console.error('Error fetching data:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Function to render search results
function renderSearchResults(wordData) {
    const searchResults = document.getElementById('results-container');
    searchResults.innerHTML = '';

    if (wordData) {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('result');

        const meaning = wordData.meanings[0]?.definitions[0]?.definition || 'No definition found';
        const example1 = wordData.meanings[0]?.definitions[0]?.example || 'No example found';
        const pronunciationAudio = wordData.phonetics[0]?.audio || '';
        const wordPronunciation = wordData.phonetics[0]?.text || 'No pronunciation found';

        resultDiv.innerHTML = `
            <h2>${wordData.word} <button class="audio-btn" onclick="pronounceWord('${wordPronunciation}')">🔊</button></h2>
            <p><strong>Meaning:</strong> ${meaning}</p>
            <div class="examples">
                <p><strong>Examples:</strong></p>
                ${example1 ? `<p>1. ${example1}</p>` : ''}
            </div>
        `;
        searchResults.appendChild(resultDiv);
    } else {
        searchResults.innerHTML = '<p>No results found</p>';
    }

    document.getElementById('search-results').classList.remove('hidden');
    document.getElementById('initial-view').classList.add('hidden');
}

// Function to handle Logout
document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = './index.html';
});

// Function to toggle profile menu visibility
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    profileMenu.style.display = (profileMenu.style.display === 'block') ? 'none' : 'block';
}

// Function to clear the search bar and reset the view
document.getElementById('clear-button').addEventListener('click', () => {
    document.getElementById('search-bar').value = '';
    document.getElementById('initial-view').classList.remove('hidden');
    document.getElementById('search-results').classList.add('hidden');
});

// Function to pronounce a word using speech synthesis
function pronounceWord(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}

// Event listener for search button
document.getElementById('search-button').addEventListener('click', handleSearch);
const feedback = document.getElementById('feedback-button');

feedback.addEventListener('click', function() {
    window.location.href = 'feedback.html';
});
