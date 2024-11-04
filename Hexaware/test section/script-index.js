let db;
const request = indexedDB.open('UserDatabase', 1);

request.onerror = function (event) {
    console.error('Database error:', event.target.errorCode);
};

request.onsuccess = function (event) {
    db = event.target.result;
};

request.onupgradeneeded = function (event) {
    const db = event.target.result;
    const objectStore = db.createObjectStore('users', { keyPath: 'email' });

    objectStore.createIndex('password', 'password', { unique: false });
    objectStore.createIndex('isAdmin', 'isAdmin', { unique: false });
    objectStore.createIndex('fullName', 'fullName', { unique: false });
};

// Session Database for storing logged-in user
let sessionDb;
const sessionRequest = indexedDB.open('SessionDB', 1);

sessionRequest.onupgradeneeded = function (event) {
    const sessionDb = event.target.result;
    sessionDb.createObjectStore('session', { keyPath: 'id' }); // Using 'id' as a key path to store session data
};

sessionRequest.onsuccess = function (event) {
    sessionDb = event.target.result;
};

// Predefined admin users with full names
const adminUsers = [
    { email: 'admin1@gmail.com', password: '123456789', fullName: 'Admin One', isAdmin: true },
    { email: 'admin2@gmail.com', password: '123456789', fullName: 'Admin Two', isAdmin: true },
    { email: 'admin3@gmail.com', password: '123456789', fullName: 'Admin Three', isAdmin: true }
];

// Function to add users to the IndexedDB
function addUser(email, password, isAdmin, fullName) {
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');

    const newUser = {
        email: email,
        password: password,
        isAdmin: isAdmin,
        fullName: fullName
    };

    const request = objectStore.add(newUser);

    request.onsuccess = function () {
        console.log('User added successfully');
    };

    request.onerror = function (event) {
        console.error('Error adding user:', event.target.errorCode);
    };
}

// Adding demo users and admins
request.onsuccess = function (event) {
    db = event.target.result;

    // Adding predefined admin users with full names
    adminUsers.forEach((user) => {
        addUser(user.email, user.password, user.isAdmin, user.fullName);
    });

    // Adding a regular user for testing
    addUser('user@example.com', 'userpassword', false, 'Regular User');
};

// Handling login form submission
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Clear previous errors
    document.getElementById('usernameEmailError').textContent = '';
    document.getElementById('passwordError').textContent = '';

    const usernameEmail = document.getElementById('usernameEmail').value.trim();
    const password = document.getElementById('password').value.trim();

    let isValid = true;

    if (!usernameEmail) {
        showError('usernameEmailError', 'Username or email is required');
        isValid = false;
    } else if (!validateEmail(usernameEmail)) {
        showError('usernameEmailError', 'Invalid email format');
        isValid = false;
    }

    if (!password) {
        showError('passwordError', 'Password is required');
        isValid = false;
    } else if (password.length < 8) {
        showError('passwordError', 'Password must be at least 8 characters');
        isValid = false;
    }

    if (isValid) {
        authenticateUser(usernameEmail, password);
    }
});

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Function to authenticate the user during login
function authenticateUser(usernameEmail, password) {
    const transaction = db.transaction(['users'], 'readonly');
    const objectStore = transaction.objectStore('users');
    const request = objectStore.get(usernameEmail);

    request.onsuccess = function (event) {
        const user = event.target.result;

        if (user) {
            if (user.password === password) {
                storeSession(user.email, user.fullName);
                
                if (user.isAdmin) {
                    alert('Admin login successful');
                    window.location.href = 'intial-page-admin.html'; // Redirect to admin page
                } else {
                    alert('User login successful');
                    window.location.href = 'intial-page-user.html'; // Redirect to user page
                }
            } else {
                showError('passwordError', 'Incorrect password');
            }
        } else {
            showError('usernameEmailError', 'No account found with that email');
        }
    };

    request.onerror = function (event) {
        console.error('Error fetching user data:', event.target.errorCode);
        showError('usernameEmailError', 'Error occurred while fetching data');
    };
}

// Function to store session details after successful login
function storeSession(email, fullName) {
    const transaction = sessionDb.transaction(['session'], 'readwrite');
    const sessionStore = transaction.objectStore('session');

    const sessionData = {
        id: 'loggedInUser',
        email: email,
        fullName: fullName
    };

    const request = sessionStore.put(sessionData);

    request.onsuccess = function () {
        console.log('Session data stored successfully');
    };

    request.onerror = function (event) {
        console.error('Error storing session data:', event.target.errorCode);
    };
}

// Function to retrieve and display session user details
function getSessionUser() {
    const transaction = sessionDb.transaction(['session'], 'readonly');
    const sessionStore = transaction.objectStore('session');
    const request = sessionStore.get('loggedInUser');

    request.onsuccess = function (event) {
        const sessionData = event.target.result;
        if (sessionData) {
            console.log(`Logged in user: ${sessionData.fullName}, Email: ${sessionData.email}`);
        } else {
            console.log('No user session found');
        }
    };

    request.onerror = function (event) {
        console.error('Error retrieving session data:', event.target.errorCode);
    };
}

// Example call to getSessionUser after login
// getSessionUser();
