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

// Form submission for password reset
document.getElementById('resetForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Clear previous error messages
    document.getElementById('emailError').innerText = '';
    document.getElementById('newPasswordError').innerText = '';
    document.getElementById('confirmPasswordError').innerText = '';

    // Fetch the email from the input
    const email = document.getElementById('email').value.trim();

    // Validate email
    if (!email) {
        document.getElementById('emailError').innerText = 'Email is required';
        return;
    }

    // Retrieve the user from IndexedDB
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');
    const request = objectStore.get(email);

    request.onsuccess = function(event) {
        const user = event.target.result;

        if (user) {
            // Fetch new password and confirm password
            const newPassword = document.getElementById('newPassword').value.trim();
            const confirmPassword = document.getElementById('confirmPassword').value.trim();

            // Validate new password
            if (!newPassword || newPassword.length < 8) {
                document.getElementById('newPasswordError').innerText = 'Password must be at least 8 characters long.';
                return;
            }

            if (newPassword !== confirmPassword) {
                document.getElementById('confirmPasswordError').innerText = 'Passwords do not match.';
                return;
            }

            // Update the password in the user object
            user.password = newPassword; // Update password
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
            document.getElementById('emailError').innerText = 'No account found with that email.';
        }
    };

    request.onerror = function(event) {
        console.error('Error fetching user data:', event.target.errorCode);
        alert('Error occurred while fetching user data.');
    };
});
