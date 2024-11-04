// IndexedDB setup
let db;
const request = indexedDB.open('UserDatabase', 1);

// Ensure the object store is created if it doesn't exist
request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'email' }); // Use email as keyPath
    }
};

request.onerror = function(event) {
    console.error('Database error:', event.target.errorCode);
};

request.onsuccess = function(event) {
    db = event.target.result;
};

// Form submission for password recovery
document.getElementById('recoveryForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous error messages
    document.getElementById('emailError').style.display = 'none';

    // Validation flag
    let isValid = true;

    // Email Validation
    const email = document.getElementById('email').value.trim();
    if (email === '') {
        document.getElementById('emailError').innerText = 'Email is required';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    } else if (!validateEmail(email)) {
        document.getElementById('emailError').innerText = 'Enter a valid email address';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    }

    if (isValid) {
        recoverPassword(email);
    }
});

// Email validation using regex
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Recover and update the password in the database
function recoverPassword(email) {
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');
    const request = objectStore.get(email);

    request.onsuccess = function(event) {
        const user = event.target.result;

        if (user) {
            // Prompt the user to enter a new password
            const newPassword = prompt('Enter your new password (minimum 8 characters):');
            if (newPassword && newPassword.length >= 8) {
                user.password = newPassword; // Update the password in the user object
                const updateRequest = objectStore.put(user); // Update the record in the DB

                updateRequest.onsuccess = function() {
                    alert('Password successfully updated! Redirecting to login page...');
                    window.location.href = 'index.html'; // Redirect to login page
                };

                updateRequest.onerror = function(event) {
                    alert('Error updating password. Please try again.');
                    console.error('Error updating password:', event.target.errorCode);
                };
            } else {
                alert('Password must be at least 8 characters long.');
            }
        } else {
            document.getElementById('emailError').innerText = 'No account found with that email.';
            document.getElementById('emailError').style.display = 'block';
        }
    };

    request.onerror = function(event) {
        console.error('Error fetching user data:', event.target.errorCode);
        document.getElementById('emailError').innerText = 'Error occurred while fetching data.';
        document.getElementById('emailError').style.display = 'block';
    };
}
