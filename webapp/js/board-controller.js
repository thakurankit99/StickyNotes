/**
 * Board Controller
 * Provides functionality for the sticky notes board
 */
(function() {
    'use strict';

    angular.module('plik').controller('BoardCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
        // Sample initial notes if no saved notes
        var initialNotes = [
            {
                id: 'note-' + Date.now() + '-1',
                content: 'Welcome to your Sticky Board!',
                x: 50,
                y: 50,
                width: 200,
                height: 200,
                color: 'yellow',
                zIndex: 1,
                tags: ['welcome'],
                createdAt: new Date().toISOString()
            },
            {
                id: 'note-' + Date.now() + '-2',
                content: 'Drag me around!',
                x: 300,
                y: 100,
                width: 150,
                height: 150,
                color: 'pink',
                zIndex: 2,
                tags: ['tutorial'],
                createdAt: new Date().toISOString()
            },
            {
                id: 'note-' + Date.now() + '-3',
                content: 'Double-click to edit',
                x: 500,
                y: 150,
                width: 180,
                height: 180,
                color: 'blue',
                zIndex: 3,
                tags: ['tutorial'],
                createdAt: new Date().toISOString()
            }
        ];

        // Board size settings
        $scope.boardSettings = {
            height: 500, // Default height in pixels
            minHeight: 300,
            maxHeight: 2000,
            stepSize: 100,
            gridSnap: false,
            showTags: true,
            background: 'default'
        };

        // Initialize notes array
        $scope.notes = [];
        
        // Initialize filtered notes array
        $scope.filteredNotes = [];
        
        // Search text
        $scope.searchText = '';
        
        // Sort criteria
        $scope.sortCriteria = 'date'; // Default sort by date

        // Current note being modified
        $scope.currentNote = null;

        // Add a new note to the board
        $scope.addNote = function() {
            var newNote = {
                id: 'note-' + Date.now(),
                content: 'New note',
                x: 100 + Math.random() * 200,
                y: 100 + Math.random() * 150,
                width: 200,
                height: 200,
                color: getRandomNoteColor(),
                zIndex: $scope.notes.length + 1,
                tags: [],
                createdAt: new Date().toISOString()
            };
            
            $scope.notes.push(newNote);
            
            // Save to localStorage
            saveBoardState();
            
            // Apply filtering
            filterNotes();
            
            return newNote;
        };
        
        // Filter notes based on the search text
        $scope.filterNotes = function() {
            if (!$scope.searchText || $scope.searchText.trim() === '') {
                $scope.filteredNotes = $scope.notes.slice();
            } else {
                var searchTerm = $scope.searchText.toLowerCase();
                $scope.filteredNotes = $scope.notes.filter(function(note) {
                    // Search in content
                    if (note.content && note.content.toLowerCase().includes(searchTerm)) {
                        return true;
                    }
                    
                    // Search in tags
                    if (note.tags && note.tags.some(function(tag) {
                        return tag.toLowerCase().includes(searchTerm);
                    })) {
                        return true;
                    }
                    
                    return false;
                });
            }
            
            // Apply sorting
            applySorting();
        };
        
        // Toggle sort dropdown
        $scope.toggleSortDropdown = function(event) {
            if (event) {
                event.stopPropagation();
            }
            
            var dropdown = document.getElementById('sort-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('visible');
                
                // Close when clicking outside
                if (dropdown.classList.contains('visible')) {
                    setTimeout(function() {
                        document.addEventListener('click', closeSortDropdown);
                    }, 10);
                }
            }
        };
        
        // Close sort dropdown
        function closeSortDropdown() {
            var dropdown = document.getElementById('sort-dropdown');
            if (dropdown) {
                dropdown.classList.remove('visible');
                document.removeEventListener('click', closeSortDropdown);
            }
        }
        
        // Sort notes based on criteria
        $scope.sortNotes = function(criteria) {
            $scope.sortCriteria = criteria;
            applySorting();
            closeSortDropdown();
            saveBoardSettings();
        };
        
        // Apply selected sorting
        function applySorting() {
            switch ($scope.sortCriteria) {
                case 'date':
                    $scope.filteredNotes.sort(function(a, b) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
                    break;
                case 'color':
                    $scope.filteredNotes.sort(function(a, b) {
                        return a.color.localeCompare(b.color);
                    });
                    break;
                case 'position':
                    $scope.filteredNotes.sort(function(a, b) {
                        // Sort by Y position primarily, then by X
                        if (a.y !== b.y) {
                            return a.y - b.y;
                        }
                        return a.x - b.x;
                    });
                    break;
            }
        }
        
        // Toggle board settings panel
        $scope.toggleBoardSettings = function(event) {
            if (event) {
                event.stopPropagation();
            }
            
            var panel = document.getElementById('board-settings-panel');
            if (panel) {
                panel.classList.toggle('visible');
                
                // Close when clicking outside
                if (panel.classList.contains('visible')) {
                    setTimeout(function() {
                        document.addEventListener('click', closeBoardSettings);
                    }, 10);
                }
            }
        };
        
        // Close board settings panel
        function closeBoardSettings() {
            var panel = document.getElementById('board-settings-panel');
            if (panel) {
                panel.classList.remove('visible');
                document.removeEventListener('click', closeBoardSettings);
            }
        }
        
        // Update board settings
        $scope.updateBoardSettings = function() {
            // Apply grid snap immediately if enabled
            if ($scope.boardSettings.gridSnap) {
                applyGridSnap();
            }
            
            // Apply background
            applyBoardBackground();
            
            // Save settings
            saveBoardSettings();
        };
        
        // Apply grid snap to all notes
        function applyGridSnap() {
            var gridSize = 20; // Size of grid cells
            
            $scope.notes.forEach(function(note) {
                // Snap to grid
                note.x = Math.round(note.x / gridSize) * gridSize;
                note.y = Math.round(note.y / gridSize) * gridSize;
                
                // Update note position in DOM
                var noteEl = document.querySelector('[data-id="' + note.id + '"]');
                if (noteEl) {
                    noteEl.style.left = note.x + 'px';
                    noteEl.style.top = note.y + 'px';
                }
            });
            
            // Save changes
            saveBoardState();
        }
        
        // Apply board background
        function applyBoardBackground() {
            var board = document.getElementById('notes-board');
            if (!board) return;
            
            // Reset existing background
            board.style.backgroundImage = '';
            board.style.backgroundColor = '';
            
            // Apply selected background
            switch ($scope.boardSettings.background) {
                case 'default':
                    board.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="%23f0f0f0"/><rect x="10" y="10" width="10" height="10" fill="%23f0f0f0"/></svg>\')';
                    break;
                case 'lines':
                    board.style.backgroundImage = 'linear-gradient(0deg, transparent 24px, rgba(0, 0, 0, 0.05) 25px, transparent 26px), linear-gradient(90deg, transparent 24px, rgba(0, 0, 0, 0.05) 25px, transparent 26px)';
                    board.style.backgroundSize = '25px 25px';
                    break;
                case 'dots':
                    board.style.backgroundImage = 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)';
                    board.style.backgroundSize = '20px 20px';
                    break;
                case 'solid':
                    board.style.backgroundColor = '#f5f5f5';
                    break;
            }
        }
        
        // Add tag to a note
        $scope.addTagToNote = function(note, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            var tagName = prompt('Enter a tag for this note:');
            if (tagName && tagName.trim() !== '') {
                if (!note.tags) {
                    note.tags = [];
                }
                
                // Avoid duplicates
                if (!note.tags.includes(tagName.trim())) {
                    note.tags.push(tagName.trim());
                    saveBoardState();
                }
            }
        };
        
        // Export board to JSON file
        $scope.exportBoard = function() {
            var boardData = {
                notes: $scope.notes,
                settings: $scope.boardSettings
            };
            
            var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(boardData));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);
            downloadAnchorNode.setAttribute('download', 'sticky_board_' + new Date().toISOString().slice(0,10) + '.json');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };
        
        // Import board from JSON file
        $scope.importBoard = function(files) {
            if (!files || !files.length) return;
            
            var file = files[0];
            var reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    var boardData = JSON.parse(e.target.result);
                    
                    if (boardData.notes && Array.isArray(boardData.notes)) {
                        if (confirm('This will replace your current notes. Are you sure?')) {
                            $scope.notes = boardData.notes;
                            
                            // Also import settings if available
                            if (boardData.settings) {
                                $scope.boardSettings = boardData.settings;
                                updateBoardSize();
                                applyBoardBackground();
                            }
                            
                            saveBoardState();
                            saveBoardSettings();
                            
                            // Apply filtering
                            $scope.filterNotes();
                            
                            // Need to apply changes since we're out of the Angular digest cycle
                            $scope.$apply();
                        }
                    } else {
                        alert('Invalid board data format.');
                    }
                } catch (err) {
                    alert('Could not parse board data: ' + err.message);
                }
            };
            
            reader.readAsText(file);
        };

        // Function that's called from outside the controller
        $rootScope.addStickyNote = function() {
            if ($scope && $scope.addNote) {
                $scope.addNote();
                $scope.$apply();
            }
        };

        // Function that's called from outside the controller
        $rootScope.saveBoard = function() {
            if ($scope) {
                saveBoardState();
                alert('Board saved successfully!');
                $scope.$apply();
            }
        };

        // Function that's called from outside the controller
        $rootScope.clearBoard = function() {
            if ($scope) {
                if (confirm('Are you sure you want to clear all notes from the board?')) {
                    $scope.notes = [];
                    saveBoardState();
                    $scope.filterNotes();
                    $scope.$apply();
                }
            }
        };

        // Function to update the board size
        $scope.updateBoardSize = function() {
            updateBoardSize();
            saveBoardSettings();
        };
        
        // Update the board size based on settings
        function updateBoardSize() {
            var board = document.getElementById('notes-board');
            if (board) {
                board.style.minHeight = $scope.boardSettings.height + 'px';
            }
        }
        
        // Save board settings to localStorage
        function saveBoardSettings() {
            localStorage.setItem('sticky-board-settings', JSON.stringify($scope.boardSettings));
        }
        
        // Load board settings from localStorage
        function loadBoardSettings() {
            var savedSettings = localStorage.getItem('sticky-board-settings');
            if (savedSettings) {
                try {
                    var settings = JSON.parse(savedSettings);
                    $scope.boardSettings = angular.extend($scope.boardSettings, settings);
                } catch (e) {
                    console.error('Error loading board settings:', e);
                }
            }
        }

        // Generate a random color for new notes
        function getRandomNoteColor() {
            var colors = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        // Delete a note
        $scope.deleteNote = function(note, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            var index = $scope.notes.findIndex(function(n) {
                return n.id === note.id;
            });
            
            if (index !== -1) {
                $scope.notes.splice(index, 1);
                saveBoardState();
                
                // Update filtered notes
                filterNotes();
            }
        };

        // Open color picker for a note
        $scope.openColorPicker = function(note, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            $scope.currentNote = note;
            
            var noteEl = event ? event.target.closest('.sticky-note') : document.querySelector('[data-id="' + note.id + '"]');
            var picker = document.querySelector('.color-picker');
            
            if (noteEl && picker) {
                // Position picker near the note but ensure it stays within the board boundaries
                var board = document.getElementById('notes-board');
                var boardRect = board.getBoundingClientRect();
                var noteRect = noteEl.getBoundingClientRect();
                
                // Calculate position relative to the board
                var pickerX = note.x + note.width + 10;
                var pickerY = note.y;
                
                // Ensure the picker doesn't go out of bounds
                var pickerWidth = 150; // Approximate width of the picker
                if (pickerX + pickerWidth > boardRect.width) {
                    pickerX = note.x - pickerWidth - 10;
                }
                
                picker.style.left = pickerX + 'px';
                picker.style.top = pickerY + 'px';
                picker.style.display = 'flex';
                
                // Close picker when clicking outside
                setTimeout(function() {
                    document.addEventListener('click', closeColorPicker);
                }, 10);
            }
        };
        
        // Close color picker
        function closeColorPicker(event) {
            var picker = document.querySelector('.color-picker');
            if (picker && event && !picker.contains(event.target)) {
                picker.style.display = 'none';
                document.removeEventListener('click', closeColorPicker);
            }
        }

        // Change note color
        $scope.changeNoteColor = function(color) {
            if ($scope.currentNote) {
                $scope.currentNote.color = color;
                saveBoardState();
            }
            
            var picker = document.querySelector('.color-picker');
            if (picker) {
                picker.style.display = 'none';
                document.removeEventListener('click', closeColorPicker);
            }
        };

        // Save current board state to localStorage
        function saveBoardState() {
            localStorage.setItem('sticky-board-notes', JSON.stringify($scope.notes));
        }

        // Load board state from localStorage
        function loadBoardState() {
            var savedNotes = localStorage.getItem('sticky-board-notes');
            if (savedNotes) {
                try {
                    $scope.notes = JSON.parse(savedNotes);
                    
                    // Ensure all notes have required properties
                    $scope.notes.forEach(function(note) {
                        if (!note.tags) note.tags = [];
                        if (!note.createdAt) note.createdAt = new Date().toISOString();
                    });
                } catch (e) {
                    console.error('Error loading board state:', e);
                    $scope.notes = initialNotes.slice();
                }
            } else {
                // Use initial notes for first-time users
                $scope.notes = initialNotes.slice();
            }
            
            // Initialize filtered notes
            filterNotes();
        }
        
        // Filter notes based on the search text
        function filterNotes() {
            $scope.filterNotes();
        }

        // Initialize board and set up event listeners
        function initBoard() {
            // Load board settings and state
            loadBoardSettings();
            loadBoardState();
            
            // Setup board size
            updateBoardSize();
            
            // Setup board background
            applyBoardBackground();
            
            // Setup listeners
            var board = document.getElementById('notes-board');
            if (board) {
                // Make notes draggable and resizable
                setupNotesInteractivity();
                
                // Close dropdowns when clicking on the board
                board.addEventListener('click', function(event) {
                    if (!event.target.closest('.sort-dropdown') && 
                        !event.target.closest('.board-settings-panel')) {
                        closeSortDropdown();
                        closeBoardSettings();
                    }
                });
            }
        }
        
        // Setup interactivity for notes (drag, resize, etc.)
        function setupNotesInteractivity() {
            // This will be called after Angular renders the notes in the DOM
            setTimeout(function() {
                var notes = document.querySelectorAll('.sticky-note');
                notes.forEach(function(noteEl) {
                    makeNoteDraggable(noteEl);
                    makeNoteResizable(noteEl);
                    makeNoteEditable(noteEl);
                });
            }, 100);
        }
        
        // Make a note draggable
        function makeNoteDraggable(noteEl) {
            var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            var header = noteEl.querySelector('.note-header');
            var board = document.getElementById('notes-board');
            var boardRect = board.getBoundingClientRect();
            
            if (header) {
                header.onmousedown = dragMouseDown;
            }
            
            function dragMouseDown(e) {
                e.preventDefault();
                
                // Bring note to front
                var noteId = noteEl.getAttribute('data-id');
                var note = $scope.notes.find(function(n) { return n.id === noteId; });
                if (note) {
                    bringNoteToFront(note);
                }
                
                // Get mouse position at start
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }
            
            function elementDrag(e) {
                e.preventDefault();
                
                // Calculate new position
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                // Get current position
                var noteX = noteEl.offsetLeft - pos1;
                var noteY = noteEl.offsetTop - pos2;
                
                // Keep note within board boundaries
                var boardRect = board.getBoundingClientRect();
                var noteRect = noteEl.getBoundingClientRect();
                
                // Constrain horizontal movement
                if (noteX < 0) noteX = 0;
                if (noteX + noteRect.width > boardRect.width) {
                    noteX = boardRect.width - noteRect.width;
                }
                
                // Constrain vertical movement (only bottom constraint, can go negative for scrolling)
                if (noteY < 0) noteY = 0;
                
                // Update position
                noteEl.style.left = noteX + 'px';
                noteEl.style.top = noteY + 'px';
                
                // Apply grid snap if enabled
                if ($scope.boardSettings.gridSnap) {
                    var gridSize = 20;
                    noteEl.style.left = Math.round(noteX / gridSize) * gridSize + 'px';
                    noteEl.style.top = Math.round(noteY / gridSize) * gridSize + 'px';
                }
            }
            
            function closeDragElement() {
                // Stop moving when mouse button released
                document.onmouseup = null;
                document.onmousemove = null;
                
                // Update the note's position in the model
                var noteId = noteEl.getAttribute('data-id');
                var note = $scope.notes.find(function(n) { return n.id === noteId; });
                if (note) {
                    note.x = parseInt(noteEl.style.left, 10) || note.x;
                    note.y = parseInt(noteEl.style.top, 10) || note.y;
                    
                    // Save updated position
                    $scope.$apply(function() {
                        saveBoardState();
                    });
                }
            }
        }
        
        // Make a note resizable
        function makeNoteResizable(noteEl) {
            var resizer = document.createElement('div');
            resizer.className = 'note-resizer';
            noteEl.appendChild(resizer);
            
            var startX, startY, startWidth, startHeight;
            var board = document.getElementById('notes-board');
            
            resizer.addEventListener('mousedown', initResize, false);
            
            function initResize(e) {
                e.preventDefault();
                
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(document.defaultView.getComputedStyle(noteEl).width, 10);
                startHeight = parseInt(document.defaultView.getComputedStyle(noteEl).height, 10);
                
                document.addEventListener('mousemove', resizeNote, false);
                document.addEventListener('mouseup', stopResize, false);
            }
            
            function resizeNote(e) {
                e.preventDefault();
                
                // Calculate new size
                var newWidth = startWidth + e.clientX - startX;
                var newHeight = startHeight + e.clientY - startY;
                
                // Apply minimum size constraints
                if (newWidth < 100) newWidth = 100;
                if (newHeight < 100) newHeight = 100;
                
                // Apply grid snap if enabled
                if ($scope.boardSettings.gridSnap) {
                    var gridSize = 20;
                    newWidth = Math.round(newWidth / gridSize) * gridSize;
                    newHeight = Math.round(newHeight / gridSize) * gridSize;
                }
                
                // Update size
                noteEl.style.width = newWidth + 'px';
                noteEl.style.height = newHeight + 'px';
            }
            
            function stopResize() {
                document.removeEventListener('mousemove', resizeNote, false);
                document.removeEventListener('mouseup', stopResize, false);
                
                // Update the note's size in the model
                var noteId = noteEl.getAttribute('data-id');
                var note = $scope.notes.find(function(n) { return n.id === noteId; });
                if (note) {
                    note.width = parseInt(noteEl.style.width, 10) || note.width;
                    note.height = parseInt(noteEl.style.height, 10) || note.height;
                    
                    // Save updated size
                    $scope.$apply(function() {
                        saveBoardState();
                    });
                }
            }
        }
        
        // Make a note content editable
        function makeNoteEditable(noteEl) {
            var content = noteEl.querySelector('.note-content');
            if (!content) return;
            
            content.addEventListener('dblclick', function(e) {
                // Enable editing
                content.setAttribute('contenteditable', 'true');
                content.focus();
                
                // Select all text
                var range = document.createRange();
                range.selectNodeContents(content);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
            
            content.addEventListener('blur', function() {
                // Disable editing
                content.setAttribute('contenteditable', 'false');
                
                // Update the note's content in the model
                var noteId = noteEl.getAttribute('data-id');
                var note = $scope.notes.find(function(n) { return n.id === noteId; });
                if (note) {
                    note.content = content.innerText || note.content;
                    
                    // Save updated content
                    $scope.$apply(function() {
                        saveBoardState();
                    });
                }
            });
            
            // Handle enter key to save and exit editing
            content.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    content.blur();
                }
            });
        }
        
        // Bring a note to the front by increasing its z-index
        function bringNoteToFront(note) {
            // Find the highest z-index
            var maxZ = Math.max.apply(null, $scope.notes.map(function(n) {
                return n.zIndex || 0;
            }));
            
            // Increment z-index for clicked note
            note.zIndex = maxZ + 1;
            
            // Apply change to DOM
            var noteEl = document.querySelector('[data-id="' + note.id + '"]');
            if (noteEl) {
                noteEl.style.zIndex = note.zIndex;
            }
            
            saveBoardState();
        }
        
        // Initialize the board
        $scope.$on('$viewContentLoaded', function() {
            // Wait for DOM to be ready
            setTimeout(initBoard, 100);
        });
        
        // Watch for DOM changes to set up new notes
        $scope.$watchCollection('notes', function() {
            setupNotesInteractivity();
        });
    }]);
})(); 