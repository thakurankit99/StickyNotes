/**
 * StickyNotes Enhanced Functionality
 * Adds whole-page drag and drop and sticky notes features
 */
(function() {
    // Add the board route to the Angular app
    angular.module('plik').config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/board', {
            templateUrl: 'partials/board.html',
            controller: 'BoardCtrl'
        });
    }]);
    
    // Wait for document to be ready
    document.addEventListener('DOMContentLoaded', function() {
        setupPageDragAndDrop();
        addWelcomeNote(); // Activate the welcome note
        setupFloatingNotes(); // Initialize floating notes functionality
    });

    // Setup whole-page drag and drop
    function setupPageDragAndDrop() {
        var body = document.body;
        var dragCounter = 0;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Handle drag enter/leave
        body.addEventListener('dragenter', function(e) {
            dragCounter++;
            body.classList.add('drag-over');
            
            // Show a subtle animation to indicate the page is a drop target
            var header = document.querySelector('header');
            if (header) {
                header.style.transform = 'scale(0.98)';
                header.style.transition = 'transform 0.3s ease';
            }
        }, false);

        body.addEventListener('dragleave', function(e) {
            dragCounter--;
            if (dragCounter === 0) {
                body.classList.remove('drag-over');
                
                // Reset the header animation
                var header = document.querySelector('header');
                if (header) {
                    header.style.transform = '';
                }
            }
        }, false);

        // Handle drop
        body.addEventListener('drop', function(e) {
            dragCounter = 0;
            body.classList.remove('drag-over');
            
            // Reset the header animation
            var header = document.querySelector('header');
            if (header) {
                header.style.transform = '';
            }
            
            // Get the drop event data
            var files = e.dataTransfer.files;
            
            // If we have files, trigger the file upload programmatically
            if (files.length > 0) {
                // Find the file input or upload button and trigger it
                var fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                    // Create a new FileList-like object with our files
                    var dataTransfer = new DataTransfer();
                    for (var i = 0; i < files.length; i++) {
                        dataTransfer.items.add(files[i]);
                    }
                    
                    // Set the file input's files
                    fileInput.files = dataTransfer.files;
                    
                    // Trigger change event to notify Angular
                    var event = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(event);
                }
            }
        }, false);
    }

    // Add a welcome message for first-time users
    function addWelcomeNote() {
        // Check if we've shown the welcome note before
        if (!localStorage.getItem('stickyNotesWelcomeShown')) {
            // Mark as shown
            localStorage.setItem('stickyNotesWelcomeShown', 'true');
            
            // Add welcome message
            setTimeout(function() {
                showWelcomePopup();
            }, 1000);
        }
    }
    
    function showWelcomePopup() {
        // Create popup elements
        var overlay = document.createElement('div');
        var popup = document.createElement('div');
        var message = document.createElement('div');
        var closeBtn = document.createElement('button');
        
        // Style the overlay
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        // Style the popup
        popup.style.backgroundColor = '#fefabc';
        popup.style.padding = '20px';
        popup.style.borderRadius = '5px';
        popup.style.maxWidth = '400px';
        popup.style.fontFamily = "'Indie Flower', cursive";
        popup.style.position = 'relative';
        popup.style.boxShadow = '3px 3px 10px rgba(0,0,0,0.3)';
        popup.style.transform = 'rotate(1deg)';
        
        // Add message content
        message.innerHTML = `
            <h2 style="color:#ff6b35;text-align:center;margin-top:0;">Welcome to StickyNotes!</h2>
            <p style="font-size:16px;line-height:1.5;">
                This app helps you create and share notes with anyone. You can:
            </p>
            <ul style="font-size:16px;line-height:1.5;">
                <li>📝 Create text notes</li>
                <li>📎 Attach images and documents</li>
                <li>🔗 Share notes with a simple link</li>
                <li>⏱️ Set notes to expire automatically</li>
                <li>🎯 Try our new <a href="#/board" style="color:#ff6b35;text-decoration:underline;">Sticky Board</a> feature!</li>
            </ul>
            <p style="font-size:16px;line-height:1.5;">
                Just drag and drop content anywhere on this page to get started!
            </p>
        `;
        
        // Style the close button
        closeBtn.textContent = 'Got it!';
        closeBtn.style.display = 'block';
        closeBtn.style.margin = '20px auto 0';
        closeBtn.style.padding = '8px 16px';
        closeBtn.style.backgroundColor = '#4ecdc4';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.color = 'white';
        closeBtn.style.fontFamily = "'Indie Flower', cursive";
        closeBtn.style.fontSize = '16px';
        closeBtn.style.cursor = 'pointer';
        
        // Add close button functionality
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        
        // Assemble and add to DOM
        popup.appendChild(message);
        popup.appendChild(closeBtn);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    // Floating Sticky Notes Functionality
    function setupFloatingNotes() {
        // Create the add note button that floats on the page
        createFloatingAddButton();
        
        // Load existing floating notes from localStorage
        loadFloatingNotes();
        
        // Set up event delegation for the document to handle note interactions
        setupNoteEventListeners();
    }
    
    function createFloatingAddButton() {
        var addButton = document.createElement('button');
        addButton.className = 'floating-add-note-btn';
        addButton.innerHTML = '<i class="fa fa-plus"></i>';
        addButton.title = 'Add a quick note';
        
        addButton.addEventListener('click', function() {
            createNewFloatingNote();
        });
        
        document.body.appendChild(addButton);
    }
    
    function createNewFloatingNote(content, position, color) {
        // Generate a unique ID for the note
        var noteId = 'note-' + Date.now();
        
        // Create default note data if not provided
        content = content || 'Type your note here...';
        position = position || {
            x: 50 + Math.random() * 100,
            y: 120 + Math.random() * 100
        };
        color = color || getRandomNoteColor();
        
        // Create note HTML structure
        var noteElement = document.createElement('div');
        noteElement.className = 'floating-note ' + color;
        noteElement.id = noteId;
        noteElement.style.left = position.x + 'px';
        noteElement.style.top = position.y + 'px';
        
        noteElement.innerHTML = `
            <div class="note-header">
                <div class="note-drag-handle"></div>
                <div class="note-actions">
                    <button class="note-color-btn" title="Change color"><i class="fa fa-paint-brush"></i></button>
                    <button class="note-minimize-btn" title="Minimize"><i class="fa fa-minus"></i></button>
                    <button class="note-close-btn" title="Close"><i class="fa fa-times"></i></button>
                </div>
            </div>
            <div class="note-content" contenteditable="true">${content}</div>
            <div class="note-footer">
                <span class="note-timestamp">Just now</span>
            </div>
            <div class="note-resize-handle"></div>
        `;
        
        // Add color picker options
        var colorPicker = document.createElement('div');
        colorPicker.className = 'note-color-picker';
        
        var colors = ['note-yellow', 'note-pink', 'note-blue', 'note-green', 'note-purple'];
        colors.forEach(function(colorClass) {
            var colorOption = document.createElement('div');
            colorOption.className = 'color-option ' + colorClass;
            colorOption.setAttribute('data-color', colorClass);
            colorPicker.appendChild(colorOption);
        });
        
        noteElement.appendChild(colorPicker);
        
        // Add the note to the DOM
        document.body.appendChild(noteElement);
        
        // Make it draggable
        makeNoteDraggable(noteElement);
        
        // Make it resizable
        makeNoteResizable(noteElement);
        
        // Save this note to localStorage
        saveFloatingNote(noteId, {
            id: noteId,
            content: content,
            position: position,
            color: color,
            timestamp: new Date().toISOString(),
            minimized: false
        });
        
        return noteElement;
    }
    
    function getRandomNoteColor() {
        var colors = ['note-yellow', 'note-pink', 'note-blue', 'note-green', 'note-purple'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    function makeNoteDraggable(noteElement) {
        var dragHandle = noteElement.querySelector('.note-drag-handle');
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        dragHandle.addEventListener('mousedown', dragMouseDown);
        
        function dragMouseDown(e) {
            e.preventDefault();
            
            // Bring this note to the front
            bringNoteToFront(noteElement);
            
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
        }
        
        function elementDrag(e) {
            e.preventDefault();
            
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set the element's new position
            noteElement.style.top = (noteElement.offsetTop - pos2) + 'px';
            noteElement.style.left = (noteElement.offsetLeft - pos1) + 'px';
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);
            
            // Save the note's position
            var noteId = noteElement.id;
            var noteData = getFloatingNote(noteId);
            if (noteData) {
                noteData.position = {
                    x: noteElement.offsetLeft,
                    y: noteElement.offsetTop
                };
                saveFloatingNote(noteId, noteData);
            }
        }
    }
    
    function makeNoteResizable(noteElement) {
        var resizeHandle = noteElement.querySelector('.note-resize-handle');
        var startX, startY, startWidth, startHeight;
        
        resizeHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            bringNoteToFront(noteElement);
            
            startX = e.clientX;
            startY = e.clientY;
            startWidth = noteElement.offsetWidth;
            startHeight = noteElement.offsetHeight;
            
            document.addEventListener('mousemove', resizeNote);
            document.addEventListener('mouseup', stopResize);
        });
        
        function resizeNote(e) {
            e.preventDefault();
            
            // Calculate new size with minimum dimensions
            var newWidth = Math.max(200, startWidth + e.clientX - startX);
            var newHeight = Math.max(150, startHeight + e.clientY - startY);
            
            // Apply new size
            noteElement.style.width = newWidth + 'px';
            noteElement.style.height = newHeight + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resizeNote);
            document.removeEventListener('mouseup', stopResize);
            
            // Save the note's dimensions
            var noteId = noteElement.id;
            var noteData = getFloatingNote(noteId);
            if (noteData) {
                noteData.size = {
                    width: noteElement.offsetWidth,
                    height: noteElement.offsetHeight
                };
                saveFloatingNote(noteId, noteData);
            }
        }
    }
    
    function bringNoteToFront(noteElement) {
        // Get all notes
        var notes = document.querySelectorAll('.floating-note');
        
        // Find the highest z-index
        var maxZ = 0;
        notes.forEach(function(note) {
            var zIndex = parseInt(window.getComputedStyle(note).zIndex, 10) || 0;
            maxZ = Math.max(maxZ, zIndex);
        });
        
        // Set this note's z-index higher than the highest
        noteElement.style.zIndex = maxZ + 1;
    }
    
    function setupNoteEventListeners() {
        // Use event delegation for all note-related events
        document.addEventListener('click', function(e) {
            var target = e.target;
            
            // Close button
            if (target.closest('.note-close-btn')) {
                var note = target.closest('.floating-note');
                if (note) {
                    deleteFloatingNote(note.id);
                    note.remove();
                }
            }
            
            // Minimize button
            else if (target.closest('.note-minimize-btn')) {
                var note = target.closest('.floating-note');
                if (note) {
                    toggleNoteMinimized(note);
                }
            }
            
            // Color button
            else if (target.closest('.note-color-btn')) {
                var note = target.closest('.floating-note');
                if (note) {
                    toggleColorPicker(note);
                }
            }
            
            // Color option
            else if (target.closest('.color-option')) {
                var colorOption = target.closest('.color-option');
                var note = colorOption.closest('.floating-note');
                if (note) {
                    changeNoteColor(note, colorOption.getAttribute('data-color'));
                    toggleColorPicker(note, false); // Hide the color picker
                }
            }
            
            // Anywhere on the note brings it to front
            else if (target.closest('.floating-note')) {
                var note = target.closest('.floating-note');
                bringNoteToFront(note);
            }
        });
        
        // Track note content changes
        document.addEventListener('input', function(e) {
            if (e.target.closest('.note-content')) {
                var noteContent = e.target;
                var note = noteContent.closest('.floating-note');
                if (note) {
                    var noteId = note.id;
                    var noteData = getFloatingNote(noteId);
                    if (noteData) {
                        noteData.content = noteContent.innerHTML;
                        noteData.timestamp = new Date().toISOString();
                        saveFloatingNote(noteId, noteData);
                        
                        // Update timestamp display
                        var timestampEl = note.querySelector('.note-timestamp');
                        if (timestampEl) {
                            timestampEl.textContent = 'Just now';
                        }
                    }
                }
            }
        });
    }
    
    function toggleNoteMinimized(noteElement) {
        var noteId = noteElement.id;
        var noteData = getFloatingNote(noteId);
        
        if (noteData) {
            // Toggle minimized state
            noteData.minimized = !noteData.minimized;
            
            // Update the UI
            if (noteData.minimized) {
                noteElement.classList.add('minimized');
                var minimizeBtn = noteElement.querySelector('.note-minimize-btn i');
                if (minimizeBtn) {
                    minimizeBtn.className = 'fa fa-expand';
                }
            } else {
                noteElement.classList.remove('minimized');
                var minimizeBtn = noteElement.querySelector('.note-minimize-btn i');
                if (minimizeBtn) {
                    minimizeBtn.className = 'fa fa-minus';
                }
            }
            
            // Save the updated state
            saveFloatingNote(noteId, noteData);
        }
    }
    
    function toggleColorPicker(noteElement, show) {
        var colorPicker = noteElement.querySelector('.note-color-picker');
        if (!colorPicker) return;
        
        // If show is explicitly provided, set that state, otherwise toggle
        if (typeof show !== 'undefined') {
            colorPicker.style.display = show ? 'flex' : 'none';
        } else {
            colorPicker.style.display = colorPicker.style.display === 'flex' ? 'none' : 'flex';
        }
    }
    
    function changeNoteColor(noteElement, colorClass) {
        var noteId = noteElement.id;
        var noteData = getFloatingNote(noteId);
        
        if (noteData) {
            // Remove current color class
            var colors = ['note-yellow', 'note-pink', 'note-blue', 'note-green', 'note-purple'];
            colors.forEach(function(color) {
                noteElement.classList.remove(color);
            });
            
            // Add new color class
            noteElement.classList.add(colorClass);
            
            // Update in storage
            noteData.color = colorClass;
            saveFloatingNote(noteId, noteData);
        }
    }
    
    // Local Storage handling functions
    function saveFloatingNote(noteId, noteData) {
        // Get existing notes
        var notes = getAllFloatingNotes();
        
        // Update or add this note
        notes[noteId] = noteData;
        
        // Save back to localStorage
        localStorage.setItem('floatingNotes', JSON.stringify(notes));
    }
    
    function getFloatingNote(noteId) {
        var notes = getAllFloatingNotes();
        return notes[noteId];
    }
    
    function deleteFloatingNote(noteId) {
        var notes = getAllFloatingNotes();
        
        if (notes[noteId]) {
            delete notes[noteId];
            localStorage.setItem('floatingNotes', JSON.stringify(notes));
        }
    }
    
    function getAllFloatingNotes() {
        var notesJson = localStorage.getItem('floatingNotes');
        return notesJson ? JSON.parse(notesJson) : {};
    }
    
    function loadFloatingNotes() {
        var notes = getAllFloatingNotes();
        
        // Create DOM elements for each note
        Object.keys(notes).forEach(function(noteId) {
            var noteData = notes[noteId];
            var noteElement = createNewFloatingNote(
                noteData.content,
                noteData.position,
                noteData.color
            );
            
            // Apply saved size if available
            if (noteData.size) {
                noteElement.style.width = noteData.size.width + 'px';
                noteElement.style.height = noteData.size.height + 'px';
            }
            
            // Apply minimized state if needed
            if (noteData.minimized) {
                noteElement.classList.add('minimized');
                var minimizeBtn = noteElement.querySelector('.note-minimize-btn i');
                if (minimizeBtn) {
                    minimizeBtn.className = 'fa fa-expand';
                }
            }
            
            // Update timestamp display
            var timeAgo = getTimeAgo(new Date(noteData.timestamp));
            var timestampEl = noteElement.querySelector('.note-timestamp');
            if (timestampEl) {
                timestampEl.textContent = timeAgo;
            }
        });
    }
    
    function getTimeAgo(date) {
        var now = new Date();
        var diffMs = now - date;
        var diffSec = Math.floor(diffMs / 1000);
        var diffMin = Math.floor(diffSec / 60);
        var diffHour = Math.floor(diffMin / 60);
        var diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'Just now';
        } else if (diffMin < 60) {
            return diffMin + ' minute' + (diffMin > 1 ? 's' : '') + ' ago';
        } else if (diffHour < 24) {
            return diffHour + ' hour' + (diffHour > 1 ? 's' : '') + ' ago';
        } else {
            return diffDay + ' day' + (diffDay > 1 ? 's' : '') + ' ago';
        }
    }
})(); 