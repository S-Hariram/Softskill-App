// Open the resultDB
const request = indexedDB.open("resultDB", 2);
request.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("results")) {
        db.createObjectStore("results", { keyPath: ["section", "topic"] });
    }
};

request.onsuccess = function(event) {
    resultDb = event.target.result;
    fetchAndDisplayResults();
};

// Fetch and display results from the resultDB
function fetchAndDisplayResults() {
    const transaction = resultDb.transaction("results", "readonly");
    const objectStore = transaction.objectStore("results");
    const resultsContainer = document.getElementById('resultsContainer');

    resultsContainer.innerHTML = ''; // Clear previous results

    let resultsData = []; // Array to hold the results for downloading

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const result = cursor.value;
            resultsData.push(result); // Add each result to the array

            // Generate feedback based on the score
            const feedback = generateFeedback(result.score, result.totalQuestions);

            // Create a result card for each result
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.innerHTML = `
                <h3>${result.topic}</h3>
                <p><strong>Section:</strong> ${result.section}</p>
                <p><strong>Score:</strong> ${result.score} out of ${result.totalQuestions}</p>
                <p><strong>Feedback:</strong> ${feedback}</p>
            `;
            resultsContainer.appendChild(resultCard);
            cursor.continue(); // Continue to the next item
        } else {
            // Handle case where no results are found
            if (resultsContainer.innerHTML === '') {
                resultsContainer.innerHTML = '<p>No results found.</p>';
            }
        }
    };

    transaction.onerror = function(event) {
        console.error("Error fetching results: ", event.target.error);
        resultsContainer.innerHTML = '<p>Error fetching results. Please try again later.</p>';
    };

    // Set the resultsData to be downloaded when the download button is clicked
    document.getElementById('downloadButton').onclick = function() {
        downloadResults(resultsData); // Call the download function
    };
}

// Generate performance feedback based on the score
function generateFeedback(score, totalQuestions) {
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 80) {
        return "Great job! You're doing well. Keep up the good work!";
    } else if (percentage >= 50) {
        return "Good effort! You can improve by revisiting some key concepts.";
    } else {
        return "It seems like you're struggling with some areas. Consider reviewing the material and practicing more.";
    }
}

// Download results as a text file
function downloadResults(results) {
    if (results.length === 0) {
        alert("No results to download.");
        return;
    }

    // Format results into text
    let fileContent = 'Test Results:\n\n';
    results.forEach(result => {
        fileContent += `Topic: ${result.topic}\n`;
        fileContent += `Section: ${result.section}\n`;
        fileContent += `Score: ${result.score} out of ${result.totalQuestions}\n`;
        fileContent += `Feedback: ${result.details || 'No additional details available.'}\n\n`;
    });

    // Create a Blob from the text
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link to download the Blob
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test_results.txt'; // Name of the downloaded file
    document.body.appendChild(a);
    a.click(); // Programmatically click the link to trigger the download

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
// Back to main page
document.getElementById('backButton').onclick = function() {
    // Redirect to the main page
    window.location.href = '../intial-page-user.html'; // Ensure you have an index.html to redirect to
};
