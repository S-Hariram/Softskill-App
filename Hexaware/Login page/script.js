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
};

// Predefined admin users
const adminEmails = ['admin1@gmail.com', 'admin2@gmail.com', 'admin3@gmail.com'];
const adminPassword = '123456789'; // Admin password for all predefined admin accounts

// Function to add users to the IndexedDB
function addUser(email, password, isAdmin) {
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');

    const newUser = {
        email: email,
        password: password,
        isAdmin: isAdmin
    };

    const request = objectStore.add(newUser);

    request.onsuccess = function (event) {
        console.log('User added successfully');
    };

    request.onerror = function (event) {
        console.error('Error adding user:', event.target.errorCode);
    };
}

// Adding demo users and admins
request.onsuccess = function (event) {
    db = event.target.result;

    // Adding the predefined admin users
    adminEmails.forEach((email) => {
        addUser(email, adminPassword, true); // All admins have the password '123456789'
    });

    // Adding a regular user for testing
    addUser('user@example.com', 'userpassword', false);
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
            // Check if the user is an admin
            if (adminEmails.includes(usernameEmail) && password === adminPassword) {
                alert('Admin login successful');
                window.location.href = 'intial-page-admin.html'; // Redirect to admin page
            } else if (user.password === password) {
                if (user.isAdmin) {
                    alert('Admin login successful');
                    window.location.href = '#intial-page-admin.html'; // Redirect to admin page
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
