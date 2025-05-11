/**
 * Board functionality for the StickyNotes Application
 * Handles drag & drop, resizing, and interactive features for sticky notes
 */
(function() {
    // Initialize the board when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        try {
            initBoard();
        } catch (error) {
            console.error('Error initializing board:', error);
        }
    });
    
    /**
     * Initialize the board
     */
    function initBoard() {
        try {
            // Initialize drag and drop
            initDragAndDrop();
            
            // Load notes from storage
            loadNotesFromStorage();
            
            // Initialize the context menu
            initContextMenu();
        } catch (error) {
            console.error('Error in initBoard:', error);
        }
    }
    
    /**
     * Initialize drag and drop for the board
     */
    function initDragAndDrop() {
        try {
            var board = document.getElementById('board');
            if (!board) return;
            
            // Prevent default drag behavior to avoid browser handling
            board.addEventListener('dragover', function(e) {
                e.preventDefault();
            });
            
            board.addEventListener('drop', function(e) {
                e.preventDefault();
                
                // Handle dropped files
                if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                    // Get the file input element
                    var fileInput = document.querySelector('input[type="file"]');
                    if (fileInput) {
                        // Create a new FileList from the dropped files
                        var files = e.dataTransfer.files;
                        
                        // Create a new input element
                        var newInput = document.createElement('input');
                        newInput.type = 'file';
                        newInput.multiple = true;
                        newInput.style.display = 'none';
                        
                        // Set the files on the new input
                        try {
                            newInput.files = files;
                        } catch (error) {
                            console.log('Cannot directly set files, dispatching change event');
                        }
                        
                        // Replace the old input
                        fileInput.parentNode.replaceChild(newInput, fileInput);
                        
                        // Trigger a change event
                        var event = new Event('change', { bubbles: true });
                        newInput.dispatchEvent(event);
                    }
                }
            });
        } catch (error) {
            console.error('Error in initDragAndDrop:', error);
        }
    }
    
    /**
     * Set up dragging functionality for a note
     */
    function setupNoteDragging(noteElement, noteData) {
        try {
            var dragHandle = noteElement.querySelector('.note-drag-handle');
            var dragOffsetX, dragOffsetY;
            
            dragHandle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                
                // Bring note to front
                noteElement.style.zIndex = getHighestZIndex() + 1;
                
                // Calculate offset
                var rect = noteElement.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                
                // Add event listeners for drag
                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd);
            });
            
            function onDragMove(e) {
                e.preventDefault();
                
                var board = document.getElementById('board');
                var boardRect = board.getBoundingClientRect();
                
                // Calculate new position relative to board
                var x = e.clientX - boardRect.left - dragOffsetX;
                var y = e.clientY - boardRect.top - dragOffsetY;
                
                // Apply constraints to keep note within board
                x = Math.max(0, Math.min(x, boardRect.width - parseFloat(noteElement.style.width)));
                y = Math.max(0, Math.min(y, boardRect.height - parseFloat(noteElement.style.height)));
                
                // Update position
                noteElement.style.left = x + 'px';
                noteElement.style.top = y + 'px';
                
                // Update note data
                noteData.position.x = x;
                noteData.position.y = y;
            }
            
            function onDragEnd() {
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
                saveNotesToStorage();
            }
        } catch (error) {
            console.error('Error in setupNoteDragging:', error);
        }
    }
    
    /**
     * Set up resizing functionality for a note
     */
    function setupNoteResizing(noteElement, noteData) {
        try {
            var resizeHandle = noteElement.querySelector('.note-resize-handle');
            var startWidth, startHeight, startX, startY;
            
            resizeHandle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Record starting values
                startWidth = parseFloat(noteElement.style.width);
                startHeight = parseFloat(noteElement.style.height);
                startX = e.clientX;
                startY = e.clientY;
                
                // Add event listeners for resize
                document.addEventListener('mousemove', onResizeMove);
                document.addEventListener('mouseup', onResizeEnd);
            });
            
            function onResizeMove(e) {
                e.preventDefault();
                
                // Calculate new dimensions
                var newWidth = startWidth + (e.clientX - startX);
                var newHeight = startHeight + (e.clientY - startY);
                
                // Apply min constraints
                newWidth = Math.max(150, newWidth);
                newHeight = Math.max(150, newHeight);
                
                // Update size
                noteElement.style.width = newWidth + 'px';
                noteElement.style.height = newHeight + 'px';
                
                // Update note data
                noteData.size.width = newWidth;
                noteData.size.height = newHeight;
            }
            
            function onResizeEnd() {
                document.removeEventListener('mousemove', onResizeMove);
                document.removeEventListener('mouseup', onResizeEnd);
                saveNotesToStorage();
            }
        } catch (error) {
            console.error('Error in setupNoteResizing:', error);
        }
    }
    
    /**
     * Save notes to local storage
     */
    function saveNotesToStorage() {
        try {
            var notes = [];
            var noteElements = document.querySelectorAll('.note:not(#note-template)');
            
            noteElements.forEach(function(noteElement) {
                var contentElement = noteElement.querySelector('.note-content');
                
                // Determine the note color
                var colorClasses = ['yellow', 'blue', 'green', 'pink', 'purple'];
                var noteColor = 'yellow';
                for (var i = 0; i < colorClasses.length; i++) {
                    if (noteElement.classList.contains(colorClasses[i])) {
                        noteColor = colorClasses[i];
                        break;
                    }
                }
                
                var note = {
                    id: noteElement.id,
                    content: contentElement.innerHTML,
                    position: {
                        x: parseFloat(noteElement.style.left),
                        y: parseFloat(noteElement.style.top)
                    },
                    size: {
                        width: parseFloat(noteElement.style.width),
                        height: parseFloat(noteElement.style.height)
                    },
                    color: noteColor,
                    createdAt: new Date().toISOString()
                };
                
                notes.push(note);
            });
            
            localStorage.setItem('stickyNotes', JSON.stringify(notes));
        } catch (error) {
            console.error('Error in saveNotesToStorage:', error);
        }
    }
    
    /**
     * Load notes from local storage
     */
    function loadNotesFromStorage() {
        try {
            var storedNotes = localStorage.getItem('stickyNotes');
            if (!storedNotes) return;
            
            var notes = JSON.parse(storedNotes);
            var board = document.getElementById('board');
            var template = document.getElementById('note-template');
            
            notes.forEach(function(noteData) {
                // Create note element
                var newNote = template.cloneNode(true);
                newNote.id = noteData.id;
                newNote.style.display = 'block';
                newNote.style.left = noteData.position.x + 'px';
                newNote.style.top = noteData.position.y + 'px';
                newNote.style.width = noteData.size.width + 'px';
                newNote.style.height = noteData.size.height + 'px';
                
                // Add color class
                newNote.classList.add(noteData.color || 'yellow');
                
                // Set content
                var contentElement = newNote.querySelector('.note-content');
                contentElement.innerHTML = noteData.content || '';
                
                // Set up content change listener
                contentElement.addEventListener('blur', function() {
                    saveNotesToStorage();
                });
                
                // Set up delete button
                var deleteButton = newNote.querySelector('.note-delete');
                deleteButton.addEventListener('click', function() {
                    deleteNote(noteData.id);
                });
                
                // Add note to board
                board.appendChild(newNote);
                
                // Make note draggable and resizable
                setupNoteDragging(newNote, noteData);
                setupNoteResizing(newNote, noteData);
            });
        } catch (error) {
            console.error('Error in loadNotesFromStorage:', error);
        }
    }
    
    /**
     * Initialize the context menu
     */
    function initContextMenu() {
        try {
            var contextMenu = document.getElementById('context-menu');
            var activeNoteId = null;
            
            // Hide context menu on click outside
            document.addEventListener('click', function() {
                contextMenu.style.display = 'none';
            });
            
            // Show custom context menu on right-click
            document.addEventListener('contextmenu', function(e) {
                var noteElement = findParentWithClass(e.target, 'note');
                
                if (noteElement && noteElement.id !== 'note-template') {
                    e.preventDefault();
                    
                    // Show context menu at click position
                    contextMenu.style.display = 'block';
                    contextMenu.style.left = e.pageX + 'px';
                    contextMenu.style.top = e.pageY + 'px';
                    
                    // Store active note ID
                    activeNoteId = noteElement.id;
                }
            });
            
            // Set up context menu item actions
            var menuItems = contextMenu.querySelectorAll('li');
            menuItems.forEach(function(item) {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    var action = this.getAttribute('data-action');
                    
                    // Handle different actions
                    switch(action) {
                        case 'edit':
                            var noteElement = document.getElementById(activeNoteId);
                            var contentElement = noteElement.querySelector('.note-content');
                            contentElement.focus();
                            break;
                        case 'color':
                            cycleNoteColor(activeNoteId);
                            break;
                        case 'share':
                            shareNote(activeNoteId);
                            break;
                        case 'delete':
                            deleteNote(activeNoteId);
                            break;
                    }
                    
                    // Hide context menu
                    contextMenu.style.display = 'none';
                });
            });
        } catch (error) {
            console.error('Error in initContextMenu:', error);
        }
    }
    
    /**
     * Delete a note
     */
    window.deleteNote = function(noteId) {
        try {
            var noteElement = document.getElementById(noteId);
            if (noteElement) {
                noteElement.remove();
                saveNotesToStorage();
                showToast('Note deleted');
            }
        } catch (error) {
            console.error('Error in deleteNote:', error);
        }
    };
    
    /**
     * Cycle through note colors
     */
    window.cycleNoteColor = function(noteId) {
        try {
            var colors = ['yellow', 'blue', 'green', 'pink', 'purple'];
            var noteElement = document.getElementById(noteId);
            
            if (!noteElement) return;
            
            // Find current color
            var currentColorIndex = -1;
            for (var i = 0; i < colors.length; i++) {
                if (noteElement.classList.contains(colors[i])) {
                    currentColorIndex = i;
                    noteElement.classList.remove(colors[i]);
                    break;
                }
            }
            
            // Set next color
            var nextColorIndex = (currentColorIndex + 1) % colors.length;
            noteElement.classList.add(colors[nextColorIndex]);
            
            saveNotesToStorage();
            showToast('Note color changed');
        } catch (error) {
            console.error('Error in cycleNoteColor:', error);
        }
    };
    
    /**
     * Share a note by saving it to localStorage and navigating to upload page
     */
    function shareNote(noteId) {
        try {
            var noteElement = document.getElementById(noteId);
            if (!noteElement) return;
            
            var contentElement = noteElement.querySelector('.note-content');
            var content = contentElement.innerHTML;
            
            // Save content to localStorage
            localStorage.setItem('noteToUpload', content);
            
            // Navigate to upload page
            window.location.href = '#/';
            
            showToast('Note ready for sharing');
        } catch (error) {
            console.error('Error in shareNote:', error);
        }
    }
    
    /**
     * Show a toast message
     */
    function showToast(message, type) {
        try {
            var toast = document.getElementById('toast');
            
            if (type === 'error') {
                toast.style.backgroundColor = '#f44336';
            } else {
                toast.style.backgroundColor = '#333';
            }
            
            toast.textContent = message;
            toast.style.display = 'block';
            toast.classList.add('show');
            
            setTimeout(function() {
                toast.classList.remove('show');
                setTimeout(function() {
                    toast.style.display = 'none';
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('Error in showToast:', error);
        }
    }
    
    /**
     * Get the highest z-index among notes
     */
    function getHighestZIndex() {
        var notes = document.querySelectorAll('.note');
        var highest = 1;
        
        notes.forEach(function(note) {
            var zIndex = parseInt(window.getComputedStyle(note).zIndex, 10);
            if (!isNaN(zIndex) && zIndex > highest) {
                highest = zIndex;
            }
        });
        
        return highest;
    }
    
    /**
     * Find a parent element with a specific class
     */
    function findParentWithClass(element, className) {
        while (element) {
            if (element.classList && element.classList.contains(className)) {
                return element;
            }
            element = element.parentNode;
        }
        return null;
    }
})(); 