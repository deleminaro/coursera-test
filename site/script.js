document.addEventListener('DOMContentLoaded', () => {
    // !! WARNING: CRITICAL SECURITY RISK !!
    // The CLIENT_ID 'f6k2kBKdKxsBaJCEeHQHScqQLINy5UUN' is an OLD, PUBLIC ID
    // that is LIKELY DISABLED by SoundCloud. This will cause a 401 Unauthorized error.
    // You MUST replace it with your own valid Client ID obtained by registering
    // an application at https://soundcloud.com/you/apps (if registrations are open).
    const CLIENT_ID = 'f6k2kBKdKxsBaJCEeHQHScqQLINy5UUN'; // <<< REPLACE THIS WITH YOUR VALID CLIENT ID

    // !! WARNING: CRITICAL SECURITY RISK !!
    // The CLIENT_SECRET below is provided because you asked.
    // NEVER, EVER PUT YOUR ACTUAL CLIENT SECRET IN CLIENT-SIDE JAVASCRIPT
    // IF THIS CODE IS GOING TO BE ON GITHUB OR ANY PUBLIC REPOSITORY.
    // A Client Secret is like a password for your application.
    // For the SoundCloud /tracks search endpoint, the Client Secret is NOT typically required
    // if you have a valid Client ID. This will NOT fix a 401 error due to an invalid Client ID.
    // It is included here purely for demonstration of the constant, but IT WILL NOT BE USED
    // IN THE API CALLS in this example because it's improper for this endpoint client-side.
    const CLIENT_SECRET = 'oZRha8Fg7PtFl8DOQIX75FWwYIAd68gb'; // <<< DO NOT USE YOUR REAL SECRET HERE IN PUBLIC CODE

    const API_BASE_URL = 'https://api.soundcloud.com';

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlayingSpan = document.querySelector('#now-playing span');
    const playerContainer = document.getElementById('player-container');
    const messageArea = document.getElementById('messageArea'); // Updated ID
    const themeToggleButton = document.getElementById('themeToggle');
    const bodyElement = document.body;

    // --- Theme Toggle Functionality ---
    function applyTheme(theme) {
        bodyElement.dataset.theme = theme;
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('soundcloudPlayerTheme', theme);
    }

    themeToggleButton.addEventListener('click', () => {
        const currentTheme = bodyElement.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('soundcloudPlayerTheme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Optional: Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        } else {
            applyTheme('light'); // Default
        }
    }
    // Update icon on initial load based on applied theme
    themeToggleButton.textContent = bodyElement.dataset.theme === 'dark' ? '☀️' : '🌙';


    // --- API and Display Functions ---
    function showMessage(text, type = 'info') {
        messageArea.textContent = text;
        messageArea.className = `message-area ${type}`; // e.g., 'message-area error'
        messageArea.style.display = 'block';
        if (type === 'error' || type === 'info') { // Clear results for general messages/errors
             resultsContainer.innerHTML = '';
        }
    }

    function clearMessage() {
        messageArea.textContent = '';
        messageArea.style.display = 'none';
        messageArea.className = 'message-area';
    }

    async function searchTracks() {
        const query = searchInput.value.trim();
        if (!query) {
            showMessage('Please enter a search term.', 'error');
            return;
        }

        clearMessage();
        resultsContainer.innerHTML = '<p class="message-area info" style="display:block;">Searching...</p>'; // Inline style for direct display

        try {
            // Construct the URL. Note: We are NOT adding CLIENT_SECRET here.
            const url = `${API_BASE_URL}/tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}&limit=24&linked_partitioning=1`;
            console.log("Requesting URL:", url); // For debugging

            const response = await fetch(url);

            if (!response.ok) {
                let errorJson = null;
                try {
                    errorJson = await response.json(); // Try to parse error response from SoundCloud
                    console.error("SoundCloud API Error Response:", errorJson);
                } catch (e) {
                    console.error("Could not parse error response as JSON:", e);
                }

                let errorMessage = `SoundCloud API error: ${response.status} ${response.statusText}.`;
                if (errorJson && errorJson.errors && errorJson.errors.length > 0 && errorJson.errors[0].error_message) {
                    errorMessage += ` Details: ${errorJson.errors[0].error_message}`;
                } else if (errorJson && errorJson.message) {
                    errorMessage += ` Details: ${errorJson.message}`;
                }

                if (response.status === 401) {
                    errorMessage += " This (401 Unauthorized) LIKELY means the Client ID is invalid, expired, or disabled by SoundCloud. Please obtain a new Client ID from SoundCloud developer portal.";
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const tracks = data.collection || data; // Handle both paginated and non-paginated responses
            displayResults(tracks);

        } catch (error) {
            console.error('Full error object during fetch:', error);
            showMessage(`Error fetching tracks: ${error.message}. Check the console for more technical details.`, 'error');
            resultsContainer.innerHTML = ''; // Clear "Searching..."
        }
    }

    function displayResults(tracks) {
        resultsContainer.innerHTML = ''; // Clear previous results or loading message
        clearMessage();

        if (!tracks || tracks.length === 0) {
            showMessage('No tracks found for your query.', 'info');
            return;
        }

        let streamableFound = false;
        tracks.forEach(track => {
            if (track.streamable) {
                streamableFound = true;
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';

                const artworkUrl = track.artwork_url ? track.artwork_url.replace('large.jpg', 't300x300.jpg') : `https://via.placeholder.com/300/${bodyElement.dataset.theme === 'dark' ? 'EEE/111' : '111/EEE'}?text=No+Art`;


                trackItem.innerHTML = `
                    <div class="track-artwork">
                        <img src="${artworkUrl}" alt="${track.title || 'Track'} artwork" loading="lazy" onerror="this.src='https://via.placeholder.com/300/${bodyElement.dataset.theme === 'dark' ? 'EEE/111' : '111/EEE'}?text=Art+Error';">
                    </div>
                    <div class="track-info">
                        <div class="track-title" title="${track.title}">${track.title || 'Untitled Track'}</div>
                        <div class="track-artist">By: ${track.user ? track.user.username : 'Unknown Artist'}</div>
                    </div>
                    <button class="play-button">Play</button>
                `;

                const playButton = trackItem.querySelector('.play-button');
                playButton.onclick = () => playTrack(track);

                resultsContainer.appendChild(trackItem);
            }
        });

        if (!streamableFound && tracks.length > 0) {
            showMessage('Tracks found, but none appear to be streamable via the API.', 'info');
        } else if (!streamableFound) { // Should be covered by the first check, but as a fallback
             showMessage('No streamable tracks found.', 'info');
        }
    }

    function playTrack(track) {
        if (!track.stream_url) {
            showMessage('This track does not have a streamable URL or is not allowed for API streaming.', 'error');
            return;
        }
        playerContainer.style.display = 'block';
        const streamUrlWithClient = `${track.stream_url}?client_id=${CLIENT_ID}`;
        console.log("Attempting to play stream URL:", streamUrlWithClient);

        audioPlayer.src = streamUrlWithClient;
        nowPlayingSpan.textContent = `${track.title || 'Untitled Track'} - ${track.user ? track.user.username : 'Unknown Artist'}`;
        audioPlayer.play()
            .then(() => {
                clearMessage(); // Clear any previous messages if playback starts
            })
            .catch(error => {
                console.error("Error playing track:", error);
                nowPlayingSpan.textContent = `Error: Could not play ${track.title || 'track'}`;
                let playErrorMessage = `Could not play track "${track.title || 'track'}". Player error: ${error.message}.`;
                if (error.message.includes("HTTP error")) {
                    playErrorMessage += " This might be due to SoundCloud's streaming policies for this specific track (e.g., CORS, geo-restrictions, or API streaming disabled by uploader).";
                }
                showMessage(playErrorMessage, 'error');
            });
    }

    searchButton.addEventListener('click', searchTracks);
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent potential form submission if wrapped in a form
            searchTracks();
        }
    });
});