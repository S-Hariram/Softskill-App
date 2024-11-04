// IndexedDB setup
let db;
const request = indexedDB.open('UserDatabase', 1);

request.onerror = function(event) {
    console.error('Database error:', event.target.errorCode);
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const objectStore = db.createObjectStore('users', { keyPath: 'email' });
    objectStore.createIndex('fullName', 'fullName', { unique: false });
    objectStore.createIndex('email', 'email', { unique: true });
    objectStore.createIndex('password', 'password', { unique: false });
};

document.getElementById('signupForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous error messages
    document.getElementById('nameError').style.display = 'none';
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('confirmPasswordError').style.display = 'none';

    // Validation flags
    let isValid = true;

    // Full Name Validation
    const fullName = document.getElementById('fullName').value;
    if (fullName === '') {
        document.getElementById('nameError').innerText = 'Full Name is required';
        document.getElementById('nameError').style.display = 'block';
        isValid = false;
    }

    // Email Validation
    const email = document.getElementById('email').value;
    if (email === '') {
        document.getElementById('emailError').innerText = 'Email is required';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    } else if (!validateEmail(email)) {
        document.getElementById('emailError').innerText = 'Enter a valid email address';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    }

    // Password Validation
    const password = document.getElementById('password').value;
    if (password === '') {
        document.getElementById('passwordError').innerText = 'Password is required';
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
    } else if (password.length < 8) {
        document.getElementById('passwordError').innerText = 'Password must be at least 8 characters';
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
    }

    // Confirm Password Validation
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (confirmPassword === '') {
        document.getElementById('confirmPasswordError').innerText = 'Confirm Password is required';
        document.getElementById('confirmPasswordError').style.display = 'block';
        isValid = false;
    } else if (confirmPassword !== password) {
        document.getElementById('confirmPasswordError').innerText = 'Passwords do not match';
        document.getElementById('confirmPasswordError').style.display = 'block';
        isValid = false;
    }

    if (isValid) {
        // Check if user already exists
        const transaction = db.transaction(['users'], 'readonly');
        const objectStore = transaction.objectStore('users');
        const getRequest = objectStore.get(email);

        getRequest.onsuccess = function() {
            if (getRequest.result) {
                document.getElementById('emailError').innerText = 'User with this email already exists';
                document.getElementById('emailError').style.display = 'block';
            } else {
                // Proceed with adding the new user
                const transaction = db.transaction(['users'], 'readwrite');
                const objectStore = transaction.objectStore('users');
                const user = {
                    fullName: fullName,
                    email: email,
                    password: password
                };

                const addRequest = objectStore.add(user);
                addRequest.onsuccess = function() {
                    alert('Registration successful! Redirecting to login page...');
                    window.location.href = './index.html'; // Redirect to login page
                };

                addRequest.onerror = function() {
                    alert('An error occurred while creating your account.');
                };
            }
        };

        getRequest.onerror = function() {
            alert('An error occurred during validation.');
        };
    }
});

// Email validation function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}
