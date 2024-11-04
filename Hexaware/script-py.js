// Function to get vocabulary recommendations
async function getVocabRecommendation(word) {
    try {
        const response = await fetch('http://192.168.1.100:5000/vocab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });

        if (!response.ok) throw new Error('Failed to fetch vocabulary recommendation');

        const data = await response.json();
        return data.context; // Returns context or suggestions
    } catch (error) {
        console.error('Error fetching vocabulary recommendation:', error);
        return 'Unable to fetch vocabulary data.';
    }
}

// Function to generate practice tests
async function generatePracticeTest(userLevel) {
    try {
        const response = await fetch('http://192.168.1.100:5000/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: userLevel })
        });

        if (!response.ok) throw new Error('Failed to generate practice test');

        const data = await response.json();
        return data.test;
    } catch (error) {
        console.error('Error generating practice test:', error);
        return 'Unable to generate test.';
    }
}

// Check grammar with LanguageTool and categorize errors
async function checkGrammarWithLanguageTool(transcript) {
    try {
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                text: transcript,
                language: 'en-US'
            })
        });

        if (!response.ok) throw new Error('Failed to check grammar');

        const data = await response.json();
        return data.matches;
    } catch (error) {
        console.error('Error checking grammar:', error);
        return [];
    }
}

// Provide detailed feedback on grammar issues
async function provideFeedback(transcript) {
    const feedbackContainer = document.getElementById('feedback-container');
    feedbackContainer.innerHTML = ''; // Clear feedback initially

    const grammarIssues = await checkGrammarWithLanguageTool(transcript);
    let correctedTranscript = transcript;
    const feedbackMessages = [];

    grammarIssues.forEach(issue => {
        const errorType = issue.rule.issueType;
        const message = issue.message;
        const corrections = issue.replacements.map(r => r.value).join(', ');

        let feedback = '';

        switch (errorType) {
            case 'TENSE':
                feedback = `Error: Incorrect tense usage. ${message}. Suggested Correction: Use '${corrections}' for the proper tense.`;
                break;
            case 'ARTICLE':
                feedback = `Error: Missing article. ${message}. Suggested Correction: Consider using '${corrections}' for clarity.`;
                break;
            case 'GRAMMAR':
                feedback = `Error: Grammar issue detected. ${message}. Suggested Correction: ${corrections}`;
                break;
            case 'WORD_CHOICE':
                feedback = `Error: Incorrect word choice. ${message}. Suggested Correction: Use '${corrections}' for a clearer expression.`;
                break;
            case 'PASSIVE_VOICE':
                feedback = `Error: Passive voice used. ${message}. Suggested Correction: Consider using active voice like '${corrections}' for directness.`;
                break;
            case 'REPORTED_SPEECH':
                feedback = `Error: Incorrect usage in reported speech. ${message}. Suggested Correction: Use '${corrections}' to adhere to reported speech conventions.`;
                break;
            default:
                feedback = `Unidentified error: ${message}. Suggested Corrections: ${corrections}`;
        }

        feedbackMessages.push({
            error: feedback,
            correction: corrections
        });

        // Apply corrections to the transcript
        correctedTranscript = correctedTranscript.replace(issue.context.text, corrections);
    });

    // Display feedback or positive message
    if (feedbackMessages.length === 0) {
        feedbackContainer.innerHTML = "<p>Your speech was clear and well-structured!</p>";
    } else {
        feedbackContainer.innerHTML = "<p>Feedback:</p><ul>" +
            feedbackMessages.map(m => `<li>${m.error}</li>`).join('') +
            "</ul>";
    }

    feedbackContainer.innerHTML += `<p><strong>Corrected Speech:</strong> ${correctedTranscript}</p>`;
}

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('speech-result').textContent = `You said: ${transcript}`;
        provideFeedback(transcript); // Run feedback function
    };

    recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        document.getElementById('speech-result').textContent = 'Error with Speech Recognition. Please try again.';
    };

    document.getElementById('start-speech').addEventListener('click', () => {
        document.getElementById('speech-result').textContent = '';
        document.getElementById('feedback-container').innerHTML = ''; // Clear feedback at the start
        recognition.start();
    });
} else {
    console.warn("SpeechRecognition API is not supported in this browser.");
}
