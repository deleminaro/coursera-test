document.addEventListener('DOMContentLoaded', () => {
    // !! IMPORTANT !!
    // The Client ID below ('f6k2kBKdKxsBaJCEeHQHScqQLINy5UUN') is an OLD, PUBLIC Client ID
    // that is LIKELY DISABLED by SoundCloud, which will cause a 401 Unauthorized error.
    // You MUST replace it with your own valid Client ID obtained by registering
    // an application at https://soundcloud.com/you/apps (if registrations are open).
    //
    // !! NEVER PUT YOUR CLIENT SECRET IN CLIENT-SIDE CODE !!
    // The client_secret is like a password for your app and must be kept on a server.
    // This example only uses a client_id, which is generally safe for public client-side use.
    const CLIENT_ID = 'f6k2kBKdKxsBaJCEeHQHScqQLINy5UUN'; // <<< REPLACE THIS WITH YOUR VALID CLIENT ID
    const API_BASE_URL = 'https://api.soundcloud.com';

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');
    const audioPlayer = document.getElementById('audioPlayer');
    const nowPlayingSpan = document.querySelector('#now-playing span');
    const playerContainer = document.getElementById('player-container');
    const messageArea = document.getElementById('message');

    function showMessage(text, type = 'info') {
        messageArea.textContent = text;
        messageArea.className = `message-area ${type}`; // e.g., 'message-area error'
        resultsContainer.innerHTML = ''; // Clear results when showing a main message
    }

    async function searchTracks() {
        const query = searchInput.value.trim();
        if (!query) {
            showMessage('Please enter a search term.', 'error');
            return;
        }

        showMessage('Searching...', 'info');

        try {
            const response = await fetch(`${API_BASE_URL}/tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}&limit=24&linked_partitioning=1`);

            if (!response.ok) {
                // Try to get more specific error message from SoundCloud if available
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // Ignore if response is not JSON
                }
                const errorDetail = errorData && errorData.errors && errorData.errors[0] ? errorData.errors[0].error_message : response.statusText;
                throw new Error(`SoundCloud API error: ${response.status} - ${errorDetail}`);
            }

            const data = await response.json();
            // SoundCloud API search results can be in `data.collection` if using `linked_partitioning`
            const tracks = data.collection || data;
            displayResults(tracks);

        } catch (error) {
            console.error('Error fetching tracks:', error);
            showMessage(`Error fetching tracks: ${error.message}. This likely means the Client ID is invalid or SoundCloud has restricted access. Check the console for more details.`, 'error');
        }
    }

    function displayResults(tracks) {
        resultsContainer.innerHTML = ''; // Clear previous results or loading message
        messageArea.textContent = ''; // Clear any messages
        messageArea.className = 'message-area';


        if (!tracks || tracks.length === 0) {
            showMessage('No tracks found for your query.', 'info');
            return;
        }

        tracks.forEach(track => {
            if (track.streamable) { // Only show streamable tracks
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';

                // Artwork (use a placeholder if not available)
                const artworkUrl = track.artwork_url ? track.artwork_url.replace('large.jpg', 't300x300.jpg') : 'https://via.placeholder.com/300?text=No+Artwork';

                trackItem.innerHTML = `
                    <div class="track-artwork">
                        <img src="${artworkUrl}" alt="${track.title} artwork" loading="lazy">
                    </div>
                    <div class="track-info">
                        <div class="track-title" title="${track.title}">${track.title}</div>
                        <div class="track-artist">By: ${track.user.username}</div>
                    </div>
                    <button class="play-button">Play</button>
                `;

                const playButton = trackItem.querySelector('.play-button');
                playButton.onclick = () => playTrack(track);

                resultsContainer.appendChild(trackItem);
            }
        });
         if (resultsContainer.children.length === 0) {
            showMessage('No streamable tracks found for your query.', 'info');
        }
    }

    function playTrack(track) {
        if (!track.stream_url) {
            showMessage('This track does not have a streamable URL.', 'error');
            return;
        }
        playerContainer.style.display = 'block';
        // IMPORTANT: The stream_url already contains authentication for streaming if it's from a /tracks resolved call.
        // For public tracks via /tracks search, you append client_id.
        const streamUrlWithClient = `${track.stream_url}?client_id=${CLIENT_ID}`;

        audioPlayer.src = streamUrlWithClient;
        nowPlayingSpan.textContent = `${track.title} - ${track.user.username}`;
        audioPlayer.play()
            .catch(error => {
                console.error("Error playing track:", error);
                nowPlayingSpan.textContent = `Error: Could not play ${track.title}`;
                showMessage(`Could not play track "${track.title}". Reason: ${error.message}. This might be due to SoundCloud's streaming policies or network issues.`, 'error');
            });
    }

    searchButton.addEventListener('click', searchTracks);
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            searchTracks();
        }
    });
});