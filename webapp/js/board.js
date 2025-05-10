/**
 * Sticky Board functionality
 * Implements dragging, resizing, and interactive features for sticky notes
 */
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        initBoard();
    });

    function initBoard() {
        // Initialize the board when Angular is ready
        var checkInterval = setInterval(function() {
            if (window.angular) {
                clearInterval(checkInterval);
                
                // Register controller with Angular
                angular.module('plik').controller('BoardCtrl', BoardController);
                
                // Initialize drag and drop for existing notes
                setTimeout(function() {
                    initDragAndDrop();
                    loadNotesFromStorage();
                    initContextMenu();
                }, 500);
            }
        }, 100);
    }

    // Board controller for Angular
    function BoardController($scope, $timeout) {
        $scope.notes = [];
        $scope.selectedColor = 'yellow';
        
        // Color selection
        $scope.selectColor = function(color) {
            $scope.selectedColor = color;
        };
        
        // Add a new note
        $scope.addNewNote = function() {
            var board = document.getElementById('sticky-board');
            if (!board) return;
            
            // Generate random position within visible area
            var boardRect = board.getBoundingClientRect();
            var maxLeft = boardRect.width - 200;
            var maxTop = boardRect.height - 200;
            
            var left = Math.floor(Math.random() * maxLeft);
            var top = Math.floor(Math.random() * maxTop);
            
            // Create the note
            var note = document.createElement('div');
            note.className = 'sticky-note sticky-note-' + $scope.selectedColor;
            note.style.top = top + 'px';
            note.style.left = left + 'px';
            note.setAttribute('data-id', 'note-' + Date.now());
            
            note.innerHTML = `
                <div class="sticky-note-header">
                    <div class="sticky-note-controls">
                        <button class="sticky-control-btn" title="Delete" onclick="deleteNote(this)"><i class="fa fa-trash"></i></button>
                        <button class="sticky-control-btn" title="Change Color" onclick="cycleNoteColor(this)"><i class="fa fa-palette"></i></button>
                    </div>
                </div>
                <div class="sticky-note-content" contenteditable="true">New Note</div>
                <div class="resize-handle"></div>
            `;
            
            board.appendChild(note);
            
            // Set up dragging and resizing for the new note
            setupNoteDragging(note);
            setupNoteResizing(note);
            
            // Focus the content for editing
            $timeout(function() {
                var content = note.querySelector('.sticky-note-content');
                content.focus();
                
                // Select all the text
                var range = document.createRange();
                range.selectNodeContents(content);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 100);
            
            // Save to storage after a delay
            setTimeout(saveNotesToStorage, 500);
        };
        
        // Handle file attachment
        $scope.attachFile = function() {
            // Trigger hidden file input
            var fileInput = document.getElementById('hidden-file-input');
            if (fileInput) {
                fileInput.click();
                
                // Listen for file selection
                fileInput.onchange = function() {
                    if (fileInput.files.length > 0) {
                        // Redirect to upload view with files
                        window.location.href = '#/upload';
                        
                        // Store that we came from board view
                        localStorage.setItem('cameFromBoardView', 'true');
                        
                        // The file selection will be handled by the main controller
                    }
                };
            }
        };
        
        // Show upload from note
        $scope.showUploadFromNote = function(noteContent) {
            // Open the upload view with the note content
            var cleanContent = noteContent.replace(/<[^>]*>/g, '');
            localStorage.setItem('noteToUpload', cleanContent);
            window.location.href = '#/upload';
        };
        
        // Initialize
        function init() {
            // Check if we got redirected back from upload
            if (localStorage.getItem('cameFromBoardView')) {
                localStorage.removeItem('cameFromBoardView');
                // Show success message
                showToast('Note created successfully! You can share it from the traditional view.');
            }
        }
        
        // Run initialization
        init();
    }
    
    // Initialize dragging and resizing for all notes
    function initDragAndDrop() {
        var notes = document.querySelectorAll('.sticky-note');
        notes.forEach(function(note) {
            setupNoteDragging(note);
            setupNoteResizing(note);
            
            // Set up content change listeners
            var content = note.querySelector('.sticky-note-content');
            if (content) {
                content.addEventListener('input', function() {
                    // Save when content changes
                    setTimeout(saveNotesToStorage, 500);
                });
            }
        });
    }
    
    // Setup drag functionality for a note
    function setupNoteDragging(note) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        // Get the header element for dragging
        var header = note.querySelector('.sticky-note-header');
        if (header) {
            header.onmousedown = dragMouseDown;
        } else {
            note.onmousedown = dragMouseDown;
        }
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Don't start drag if clicked on a control button or content
            if (e.target.classList.contains('sticky-control-btn') || 
                e.target.closest('.sticky-control-btn') ||
                e.target.classList.contains('sticky-note-content') ||
                e.target.closest('.sticky-note-content') ||
                e.target.classList.contains('resize-handle')) {
                return;
            }
            
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Bring this note to the front
            bringToFront(note);
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set the element's new position
            note.style.top = (note.offsetTop - pos2) + "px";
            note.style.left = (note.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
            
            // Save the new position
            saveNotesToStorage();
        }
    }
    
    // Setup resize functionality for a note
    function setupNoteResizing(note) {
        var resizeHandle = note.querySelector('.resize-handle');
        if (!resizeHandle) return;
        
        var startX, startY, startWidth, startHeight;
        
        resizeHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            
            // Bring this note to the front
            bringToFront(note);
            
            // Get initial position and size
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(note).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(note).height, 10);
            
            // Add resize events
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });
        
        function resize(e) {
            // Calculate new size
            note.style.width = (startWidth + e.clientX - startX) + 'px';
            note.style.height = (startHeight + e.clientY - startY) + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            
            // Save the new size
            saveNotesToStorage();
        }
    }
    
    // Bring a note to the front
    function bringToFront(note) {
        var notes = document.querySelectorAll('.sticky-note');
        var maxZ = 0;
        
        notes.forEach(function(n) {
            var zIndex = parseInt(window.getComputedStyle(n).zIndex) || 1;
            maxZ = Math.max(maxZ, zIndex);
        });
        
        note.style.zIndex = maxZ + 1;
    }
    
    // Save all notes to local storage
    function saveNotesToStorage() {
        var notes = document.querySelectorAll('.sticky-note');
        var savedNotes = [];
        
        notes.forEach(function(note) {
            // Ensure each note has an ID
            if (!note.getAttribute('data-id')) {
                note.setAttribute('data-id', 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
            }
            
            // Get color class
            var colorClass = '';
            ['yellow', 'pink', 'blue', 'green'].forEach(function(color) {
                if (note.classList.contains('sticky-note-' + color)) {
                    colorClass = 'sticky-note-' + color;
                }
            });
            
            // Get content
            var content = note.querySelector('.sticky-note-content');
            var text = content ? content.innerHTML : '';
            
            // Get author if present
            var authorEl = note.querySelector('.sticky-author');
            var author = authorEl ? authorEl.textContent : '';
            
            // Save the note data
            savedNotes.push({
                id: note.getAttribute('data-id'),
                top: note.style.top,
                left: note.style.left,
                width: note.style.width,
                height: note.style.height,
                zIndex: note.style.zIndex,
                colorClass: colorClass,
                content: text,
                author: author
            });
        });
        
        // Save to local storage
        localStorage.setItem('stickyBoardNotes', JSON.stringify(savedNotes));
    }
    
    // Load notes from local storage
    function loadNotesFromStorage() {
        var board = document.getElementById('sticky-board');
        if (!board) return;
        
        var savedNotesJSON = localStorage.getItem('stickyBoardNotes');
        if (!savedNotesJSON) return;
        
        try {
            var savedNotes = JSON.parse(savedNotesJSON);
            
            // Remove sample notes
            var sampleNotes = board.querySelectorAll('.sticky-note');
            sampleNotes.forEach(function(note) {
                note.parentNode.removeChild(note);
            });
            
            // Create notes from saved data
            savedNotes.forEach(function(noteData) {
                var note = document.createElement('div');
                note.className = 'sticky-note ' + noteData.colorClass;
                note.style.top = noteData.top;
                note.style.left = noteData.left;
                
                if (noteData.width) note.style.width = noteData.width;
                if (noteData.height) note.style.height = noteData.height;
                if (noteData.zIndex) note.style.zIndex = noteData.zIndex;
                
                note.setAttribute('data-id', noteData.id);
                
                note.innerHTML = `
                    <div class="sticky-note-header">
                        <div class="sticky-note-controls">
                            <button class="sticky-control-btn" title="Delete" onclick="deleteNote(this)"><i class="fa fa-trash"></i></button>
                            <button class="sticky-control-btn" title="Change Color" onclick="cycleNoteColor(this)"><i class="fa fa-palette"></i></button>
                        </div>
                    </div>
                    <div class="sticky-note-content" contenteditable="true">${noteData.content}</div>
                    <div class="resize-handle"></div>
                `;
                
                // Add author if present
                if (noteData.author) {
                    var authorDiv = document.createElement('div');
                    authorDiv.className = 'sticky-author';
                    authorDiv.textContent = noteData.author;
                    note.appendChild(authorDiv);
                }
                
                board.appendChild(note);
                
                // Set up events
                setupNoteDragging(note);
                setupNoteResizing(note);
                
                // Set up content change listeners
                var content = note.querySelector('.sticky-note-content');
                if (content) {
                    content.addEventListener('input', function() {
                        // Save when content changes
                        setTimeout(saveNotesToStorage, 500);
                    });
                }
            });
        } catch (e) {
            console.error('Error loading notes from storage:', e);
        }
    }
    
    // Global functions for note manipulation
    window.deleteNote = function(button) {
        var note = button.closest('.sticky-note');
        if (note && note.parentNode) {
            note.parentNode.removeChild(note);
            saveNotesToStorage();
        }
    };
    
    window.cycleNoteColor = function(button) {
        var note = button.closest('.sticky-note');
        if (!note) return;
        
        var colors = ['yellow', 'pink', 'blue', 'green'];
        var currentColor = '';
        
        // Find current color
        colors.forEach(function(color) {
            if (note.classList.contains('sticky-note-' + color)) {
                currentColor = color;
            }
        });
        
        // Get next color in cycle
        var currentIndex = colors.indexOf(currentColor);
        var nextIndex = (currentIndex + 1) % colors.length;
        var nextColor = colors[nextIndex];
        
        // Remove current color class and add next one
        note.classList.remove('sticky-note-' + currentColor);
        note.classList.add('sticky-note-' + nextColor);
        
        // Save the color change
        saveNotesToStorage();
    };
    
    // Show a toast message
    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'board-toast';
        toast.textContent = message;
        
        // Style the toast
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '10000';
        toast.style.animation = 'fadeInOut 3s ease-in-out';
        
        // Add animation style
        var style = document.createElement('style');
        style.innerHTML = `
            @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Add to body
        document.body.appendChild(toast);
        
        // Remove after animation
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    // Add to Angular routes
    angular.module('plik').config(function($routeProvider) {
        // This attempts to add a new route, but in practice you'd need to modify the existing config
        // Note: This might not work as expected if the module configuration is already completed
        $routeProvider.when('/board', {
            controller: 'BoardCtrl',
            templateUrl: 'partials/board.html'
        });
    });

    // Initialize context menu
    function initContextMenu() {
        var contextMenu = document.getElementById('note-context-menu');
        if (!contextMenu) return;
        
        var activeNote = null;
        
        // Add right-click event to notes
        document.addEventListener('contextmenu', function(e) {
            // Check if right-clicked on a note
            var noteElement = e.target.closest('.sticky-note');
            if (noteElement) {
                e.preventDefault();
                
                // Store reference to active note
                activeNote = noteElement;
                
                // Position the menu
                contextMenu.style.left = e.pageX + 'px';
                contextMenu.style.top = e.pageY + 'px';
                contextMenu.style.display = 'block';
            }
        });
        
        // Close the menu when clicking elsewhere
        document.addEventListener('click', function() {
            contextMenu.style.display = 'none';
        });
        
        // Menu item actions
        document.getElementById('ctx-edit').addEventListener('click', function() {
            if (activeNote) {
                var content = activeNote.querySelector('.sticky-note-content');
                if (content) {
                    content.focus();
                    
                    // Select all the text
                    var range = document.createRange();
                    range.selectNodeContents(content);
                    var selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        });
        
        document.getElementById('ctx-change-color').addEventListener('click', function() {
            if (activeNote) {
                cycleNoteColor(activeNote.querySelector('.sticky-control-btn[title="Change Color"]'));
            }
        });
        
        document.getElementById('ctx-send-to-upload').addEventListener('click', function() {
            if (activeNote) {
                var content = activeNote.querySelector('.sticky-note-content');
                if (content) {
                    // Get angular scope
                    var scope = angular.element(document.querySelector('[ng-controller="BoardCtrl"]')).scope();
                    if (scope && scope.showUploadFromNote) {
                        scope.showUploadFromNote(content.innerHTML);
                    }
                }
            }
        });
        
        document.getElementById('ctx-delete').addEventListener('click', function() {
            if (activeNote) {
                // Use the existing delete function
                deleteNote(activeNote.querySelector('.sticky-control-btn[title="Delete"]'));
            }
        });
    }
})(); 