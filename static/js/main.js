document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let selectedNote = null;
    let activeFilter = 'all';
    let searchQuery = '';
    const defaultHashtags = ['#BigQuery', '#GCP', '#CloudComputing'];

    // DOM Elements
    const notesListContainer = document.getElementById('notes-list');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('btn-refresh');
    const exportBtn = document.getElementById('btn-export');
    const themeBtn = document.getElementById('btn-theme');
    const syncTimeSpan = document.getElementById('sync-time');
    const filterTagsContainer = document.getElementById('filter-tags');
    
    // Tweet Panel DOM Elements
    const tweetEmptyState = document.getElementById('tweet-empty-state');
    const tweetComposer = document.getElementById('tweet-composer');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const btnTweet = document.getElementById('btn-tweet');
    const presetHashtagsContainer = document.getElementById('preset-hashtags');
    const previewLinkLabel = document.getElementById('preview-link-label');

    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportCSV);
    }
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderNotes();
    });
    
    tweetTextarea.addEventListener('input', updateCharCount);
    btnTweet.addEventListener('click', handleTweet);

    // Initial load
    fetchNotes();

    /**
     * Fetches release notes from the Flask backend API
     */
    async function fetchNotes(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = forceRefresh ? '/api/notes?refresh=true' : '/api/notes';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                releaseNotes = data.notes;
                updateSyncTime(data.last_updated);
                setupFilters(releaseNotes);
                renderNotes();
                
                // Clear active tweet selection if the note is no longer in the list
                if (selectedNote) {
                    const stillExists = releaseNotes.some(n => n.id === selectedNote.id);
                    if (!stillExists) {
                        clearSelection();
                    }
                }
            } else {
                showError(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('Network error. Please make sure the backend server is running and try again.');
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Toggles the loading UI state
     */
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            renderSkeletons();
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }

    /**
     * Renders skeleton loading cards
     */
    function renderSkeletons() {
        notesListContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <div class="skeleton-meta">
                    <div class="skeleton-text skeleton-date"></div>
                    <div class="skeleton-text skeleton-badge"></div>
                </div>
                <div class="skeleton-text skeleton-p1"></div>
                <div class="skeleton-text skeleton-p2"></div>
                <div class="skeleton-text skeleton-p3"></div>
            `;
            notesListContainer.appendChild(skeleton);
        }
    }

    /**
     * Formats and displays the last sync time
     */
    function updateSyncTime(timestamp) {
        if (!timestamp) {
            syncTimeSpan.textContent = 'Never';
            return;
        }
        const date = new Date(timestamp * 1000);
        
        // Formats time beautifully: HH:MM:SS
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        syncTimeSpan.textContent = `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Shows error state in the main content container
     */
    function showError(message) {
        notesListContainer.innerHTML = `
            <div class="error-card">
                <div class="error-title">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span>Fetch Failed</span>
                </div>
                <p>${escapeHTML(message)}</p>
                <button id="btn-retry" class="btn-retry">Try Again</button>
            </div>
        `;
        
        const retryBtn = document.getElementById('btn-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => fetchNotes(true));
        }
    }

    /**
     * Dynamically sets up categories for filtering
     */
    function setupFilters(notes) {
        // Collect all unique types
        const types = new Set(notes.map(n => n.type));
        
        // Clear except the first 'All' option
        filterTagsContainer.innerHTML = '';
        
        // Add 'All' tag
        const allTag = createFilterTag('All', 'all', activeFilter === 'all');
        filterTagsContainer.appendChild(allTag);
        
        // Add specific tags
        Array.from(types).sort().forEach(type => {
            const tag = createFilterTag(type, type.toLowerCase(), activeFilter === type.toLowerCase());
            filterTagsContainer.appendChild(tag);
        });
    }

    /**
     * Creates a filter button element
     */
    function createFilterTag(label, filterValue, isActive) {
        const button = document.createElement('button');
        button.className = `filter-tag ${isActive ? 'active' : ''}`;
        button.textContent = label;
        button.id = `filter-${filterValue}`;
        
        button.addEventListener('click', () => {
            // Update active state in UI
            document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
            button.classList.add('active');
            
            activeFilter = filterValue;
            renderNotes();
        });
        
        return button;
    }

    /**
     * Renders filtered and searched release notes
     */
    function renderNotes() {
        // Apply filters
        let filteredNotes = releaseNotes.filter(note => {
            const matchesCategory = activeFilter === 'all' || note.type.toLowerCase() === activeFilter;
            const matchesSearch = !searchQuery || 
                note.content_text.toLowerCase().includes(searchQuery) || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        notesListContainer.innerHTML = '';

        if (filteredNotes.length === 0) {
            notesListContainer.innerHTML = `
                <div class="tweet-empty-state" style="padding: 4rem 0;">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <p style="margin-top: 1rem; font-weight: 500;">No release notes match your criteria.</p>
                    <p style="font-size: 0.85rem; color: var(--color-text-dimmed);">Try adjusting your search query or switching categories.</p>
                </div>
            `;
            return;
        }

        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            const isSelected = selectedNote && selectedNote.id === note.id;
            card.className = `note-card ${isSelected ? 'selected' : ''}`;
            card.id = `note-${note.id}`;
            
            // Build the card layout
            card.innerHTML = `
                <div class="note-header">
                    <div class="note-meta">
                        <span class="note-date">${escapeHTML(note.date)}</span>
                        <span class="note-badge ${note.type.toLowerCase()}">${escapeHTML(note.type)}</span>
                    </div>
                    <div class="select-indicator"></div>
                </div>
                <div class="note-body">
                    ${note.content_html}
                </div>
                <div class="note-footer">
                    <button class="source-link btn-copy" data-id="${note.id}" onclick="event.stopPropagation();" style="background: none; border: none; font-family: inherit; font-size: inherit; cursor: pointer; padding: 0;">
                        <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        <span class="copy-text">Copy Text</span>
                    </button>
                    <a href="${escapeHTML(note.link)}" target="_blank" rel="noopener noreferrer" class="source-link" onclick="event.stopPropagation();">
                        <span>Source Doc</span>
                        <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                    </a>
                </div>
            `;

            // Bind Copy button action
            const copyBtn = card.querySelector('.btn-copy');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card selection
                    navigator.clipboard.writeText(note.content_text).then(() => {
                        const copySpan = copyBtn.querySelector('.copy-text');
                        const originalText = copySpan.textContent;
                        copySpan.textContent = 'Copied!';
                        copyBtn.style.color = 'var(--color-badge-change)'; // Green check feedback
                        setTimeout(() => {
                            copySpan.textContent = originalText;
                            copyBtn.style.color = '';
                        }, 2000);
                    }).catch(err => {
                        console.error('Could not copy text: ', err);
                    });
                });
            }

            // Card Click Handler
            card.addEventListener('click', () => selectNote(note));
            notesListContainer.appendChild(card);
        });
    }

    /**
     * Handles selection of a release note card
     */
    function selectNote(note) {
        // Toggle selection off if already selected
        if (selectedNote && selectedNote.id === note.id) {
            clearSelection();
            return;
        }

        // Remove previous selected class
        if (selectedNote) {
            const prevCard = document.getElementById(`note-${selectedNote.id}`);
            if (prevCard) prevCard.classList.remove('selected');
        }

        selectedNote = note;
        const newCard = document.getElementById(`note-${note.id}`);
        if (newCard) newCard.classList.add('selected');

        // Show Tweet Panel Composer
        tweetEmptyState.style.display = 'none';
        tweetComposer.style.display = 'flex';

        // Prepopulate text
        populateTweetDraft();
    }

    /**
     * Clears selected note state
     */
    function clearSelection() {
        if (selectedNote) {
            const card = document.getElementById(`note-${selectedNote.id}`);
            if (card) card.classList.remove('selected');
        }
        selectedNote = null;
        tweetComposer.style.display = 'none';
        tweetEmptyState.style.display = 'flex';
    }

    /**
     * Compiles a default Tweet message from the selected note
     */
    function populateTweetDraft() {
        if (!selectedNote) return;

        // Strip HTML and clean text
        const cleanText = selectedNote.content_text;
        
        // Header prefix
        const header = `BigQuery ${selectedNote.type} (${selectedNote.date}): `;
        
        // Hashtags to include
        const tags = `\n\n${defaultHashtags.join(' ')}`;
        
        // Base content space left for text
        // Twitter counts links as 23 characters
        const linkLength = 23;
        
        // Calculate max allowed length for the text snippet
        const maxSnippetLength = 280 - header.length - tags.length - linkLength - 5; // buffer
        
        let snippet = cleanText;
        if (snippet.length > maxSnippetLength) {
            snippet = snippet.substring(0, maxSnippetLength - 3) + '...';
        }

        tweetTextarea.value = `${header}${snippet}${tags}`;
        
        // Update URL preview label
        previewLinkLabel.textContent = selectedNote.link;
        previewLinkLabel.href = selectedNote.link;
        
        updateCharCount();
        setupPresetHashtags();
    }

    /**
     * Renders pills for adding preset hashtags
     */
    function setupPresetHashtags() {
        presetHashtagsContainer.innerHTML = '';
        defaultHashtags.forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'hashtag-pill';
            pill.textContent = tag;
            pill.addEventListener('click', () => {
                const currentText = tweetTextarea.value;
                if (!currentText.includes(tag)) {
                    tweetTextarea.value = currentText.trim() + ' ' + tag;
                    updateCharCount();
                }
            });
            presetHashtagsContainer.appendChild(pill);
        });
    }

    /**
     * Updates character count and validates length limits
     */
    function updateCharCount() {
        const text = tweetTextarea.value;
        
        // Twitter handles links dynamically, replacing them with a 23-char t.co link
        // Let's perform a simple estimation where any http/https URL is counted as 23 chars
        const urlRegex = /https?:\/\/[^\s]+/g;
        let estimatedLength = text.length;
        
        // Subtract standard link lengths and add 23 for each found
        const matches = text.match(urlRegex);
        if (matches) {
            matches.forEach(url => {
                estimatedLength = estimatedLength - url.length + 23;
            });
        }
        
        // Also add the selected note link if it's not already in the text (we append it on Tweet)
        // Wait, to keep things simple: we will just append the selectedNote.link when we construct the final Tweet.
        // Let's add 24 (23 + space) to the count to account for the appended link.
        const finalLength = estimatedLength + (selectedNote ? 24 : 0);

        charCounter.textContent = `${finalLength} / 280`;

        // Update color and active state
        charCounter.className = 'character-counter';
        if (finalLength > 280) {
            charCounter.classList.add('danger');
            btnTweet.disabled = true;
        } else if (finalLength > 250) {
            charCounter.classList.add('warning');
            btnTweet.disabled = false;
        } else {
            btnTweet.disabled = false;
        }
    }

    /**
     * Opens the Twitter Web Intent share page with the pre-filled message
     */
    function handleTweet() {
        if (!selectedNote || btnTweet.disabled) return;

        let tweetText = tweetTextarea.value.trim();
        
        // Append source link to the tweet text
        tweetText += ` ${selectedNote.link}`;

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    }

    /**
     * Exports the currently filtered release notes to a CSV file download
     */
    function handleExportCSV() {
        let filteredNotes = releaseNotes.filter(note => {
            const matchesCategory = activeFilter === 'all' || note.type.toLowerCase() === activeFilter;
            const matchesSearch = !searchQuery || 
                note.content_text.toLowerCase().includes(searchQuery) || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.type.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filteredNotes.length === 0) {
            alert("No notes available to export.");
            return;
        }

        const headers = ["ID", "Date", "Type", "Link", "Content"];
        const rows = filteredNotes.map(note => [
            note.id,
            note.date,
            note.type,
            note.link,
            note.content_text
        ].map(field => `"${String(field).replace(/"/g, '""')}"`));

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const filterName = activeFilter === 'all' ? 'all' : activeFilter;
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bq_release_notes_${filterName}_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Swaps the page color scheme between dark and light themes
     */
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }

    /**
     * Escapes HTML tags to prevent cross-site scripting
     */
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
