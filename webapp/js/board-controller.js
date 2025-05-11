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
                zIndex: 1
            },
            {
                id: 'note-' + Date.now() + '-2',
                content: 'Drag me around!',
                x: 300,
                y: 100,
                width: 150,
                height: 150,
                color: 'pink',
                zIndex: 2
            },
            {
                id: 'note-' + Date.now() + '-3',
                content: 'Double-click to edit',
                x: 500,
                y: 150,
                width: 180,
                height: 180,
                color: 'blue',
                zIndex: 3
            }
        ];

        // Board size settings
        $scope.boardSettings = {
            height: 500, // Default height in pixels
            minHeight: 300,
            maxHeight: 2000,
            stepSize: 100
        };

        // Initialize notes array
        $scope.notes = [];

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
                zIndex: $scope.notes.length + 1
            };
            
            $scope.notes.push(newNote);
            
            // Save to localStorage
            saveBoardState();
            
            return newNote;
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
                    $scope.$apply();
                }
            }
        };

        // Board size manipulation functions
        $scope.increaseBoardSize = function() {
            if ($scope.boardSettings.height < $scope.boardSettings.maxHeight) {
                $scope.boardSettings.height += $scope.boardSettings.stepSize;
                updateBoardSize();
                saveBoardSettings();
            }
        };

        $scope.decreaseBoardSize = function() {
            if ($scope.boardSettings.height > $scope.boardSettings.minHeight) {
                $scope.boardSettings.height -= $scope.boardSettings.stepSize;
                updateBoardSize();
                saveBoardSettings();
            }
        };

        $scope.resetBoardSize = function() {
            $scope.boardSettings.height = 500; // Reset to default
            updateBoardSize();
            saveBoardSettings();
        };

        // Update the board size in the DOM
        function updateBoardSize() {
            var board = document.getElementById('notes-board');
            if (board) {
                board.style.height = $scope.boardSettings.height + 'px';
                
                // Update size indicator
                var indicator = document.getElementById('board-resize-indicator');
                if (indicator) {
                    indicator.textContent = $scope.boardSettings.height + 'px';
                }
            }
        }

        // Save board settings to localStorage
        function saveBoardSettings() {
            localStorage.setItem('stickyNotesBoardSettings', JSON.stringify($scope.boardSettings));
        }

        // Load board settings from localStorage
        function loadBoardSettings() {
            var savedSettings = localStorage.getItem('stickyNotesBoardSettings');
            if (savedSettings) {
                try {
                    var settings = JSON.parse(savedSettings);
                    if (settings && settings.height) {
                        $scope.boardSettings.height = settings.height;
                        updateBoardSize();
                    }
                } catch (e) {
                    console.error('Error loading saved board settings', e);
                }
            }
        }

        // Get a random note color
        function getRandomNoteColor() {
            var colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        // Delete a note from the board
        $scope.deleteNote = function(note) {
            // Stop event propagation to prevent issues with parent elements
            var event = window.event;
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            
            if (confirm('Are you sure you want to delete this note?')) {
                var index = $scope.notes.indexOf(note);
                if (index !== -1) {
                    $scope.notes.splice(index, 1);
                    
                    // Save to localStorage
                    saveBoardState();
                }
            }
        };

        // Open the color picker for a specific note
        $scope.openColorPicker = function(note) {
            $scope.currentNote = note;
            var colorPicker = document.getElementById('color-picker');
            if (colorPicker) {
                // Position the color picker near the note
                var noteEl = document.querySelector('[data-id="' + note.id + '"]');
                if (noteEl) {
                    var noteRect = noteEl.getBoundingClientRect();
                    var boardEl = document.getElementById('notes-board');
                    var boardRect = boardEl.getBoundingClientRect();
                    
                    // Calculate positioning
                    // Try to position to the right of the note first
                    var leftPos = noteRect.right + 10; // 10px gap
                    var topPos = noteRect.top + 30; // Align with paint button
                    var pointRight = false;
                    
                    // Check if there's room to the right
                    if (leftPos + 200 > boardRect.right) {
                        // Not enough room to the right, place to the left
                        leftPos = noteRect.left - 170; // Color picker width + gap
                        pointRight = true;
                    }
                    
                    // Check if there's room at the bottom
                    if (topPos + 60 > boardRect.bottom) {
                        // Not enough room at the bottom, adjust upward
                        topPos = noteRect.bottom - 60;
                    }
                    
                    // Ensure it's not positioned off the top
                    topPos = Math.max(topPos, boardRect.top + 10);
                    
                    // Ensure it's not positioned off the left
                    leftPos = Math.max(leftPos, boardRect.left + 10);
                    
                    // Apply position
                    colorPicker.style.top = (topPos - boardRect.top + boardEl.scrollTop) + 'px';
                    colorPicker.style.left = (leftPos - boardRect.left + boardEl.scrollLeft) + 'px';
                    colorPicker.style.right = 'auto';
                    
                    // Set pointer direction
                    if (pointRight) {
                        colorPicker.classList.add('point-right');
                    } else {
                        colorPicker.classList.remove('point-right');
                    }
                    
                    // Show the color picker
                    colorPicker.classList.add('visible');
                }
                
                // Close picker when clicking outside
                setTimeout(function() {
                    document.addEventListener('click', closeColorPicker);
                }, 10);
            }
        };

        // Change the color of a note
        $scope.changeNoteColor = function(color) {
            if ($scope.currentNote) {
                $scope.currentNote.color = color;
                closeColorPicker();
                
                // Save to localStorage
                saveBoardState();
            }
        };

        // Close the color picker
        function closeColorPicker() {
            var colorPicker = document.getElementById('color-picker');
            if (colorPicker) {
                colorPicker.classList.remove('visible');
                colorPicker.classList.remove('point-right');
                document.removeEventListener('click', closeColorPicker);
            }
        }

        // Helper function to save board state to localStorage
        function saveBoardState() {
            localStorage.setItem('stickyNotesBoardState', JSON.stringify($scope.notes));
        }

        // Load saved board state
        function loadBoardState() {
            var savedState = localStorage.getItem('stickyNotesBoardState');
            if (savedState) {
                try {
                    var notes = JSON.parse(savedState);
                    if (notes && notes.length > 0) {
                        $scope.notes = notes;
                    } else {
                        // If no notes or empty array, use initial sample notes
                        $scope.notes = angular.copy(initialNotes);
                    }
                } catch (e) {
                    console.error('Error loading saved board state', e);
                    $scope.notes = angular.copy(initialNotes);
                }
            } else {
                // If no saved state, use initial sample notes
                $scope.notes = angular.copy(initialNotes);
            }
        }

        // Initialize board
        function initBoard() {
            // Load saved state if available
            loadBoardState();
            
            // Load board settings
            loadBoardSettings();

            // Initialize drag and drop functionality
            setTimeout(setupDragAndResize, 100);
            
            // Add empty message
            var boardContainer = document.getElementById('notes-board');
            if (boardContainer) {
                var emptyMessage = document.createElement('div');
                emptyMessage.className = 'board-empty-message';
                emptyMessage.innerHTML = 'Your board is empty. Click <strong>Add Note</strong> to get started!';
                boardContainer.appendChild(emptyMessage);
                
                // Setup board resize handle
                setupBoardResize();
            }
        }

        // Setup board resize functionality
        function setupBoardResize() {
            var board = document.getElementById('notes-board');
            var resizeHandle = document.getElementById('board-resize-handle');
            var resizeIndicator = document.getElementById('board-resize-indicator');
            
            if (!board || !resizeHandle || !resizeIndicator) return;
            
            var startY, startHeight;
            
            resizeHandle.addEventListener('mousedown', initBoardResize);
            
            function initBoardResize(e) {
                e.preventDefault();
                
                startY = e.clientY;
                startHeight = parseInt(document.defaultView.getComputedStyle(board).height, 10);
                
                document.addEventListener('mousemove', resizeBoard);
                document.addEventListener('mouseup', stopBoardResize);
                
                // Show resize indicator
                resizeIndicator.classList.add('visible');
            }
            
            function resizeBoard(e) {
                e.preventDefault();
                
                // Calculate new height
                var newHeight = startHeight + e.clientY - startY;
                
                // Apply constraints
                newHeight = Math.max($scope.boardSettings.minHeight, Math.min(newHeight, $scope.boardSettings.maxHeight));
                
                // Update board height
                board.style.height = newHeight + 'px';
                
                // Update indicator
                resizeIndicator.textContent = newHeight + 'px';
                
                // Update scope variable
                $scope.boardSettings.height = newHeight;
                $scope.$apply();
            }
            
            function stopBoardResize() {
                document.removeEventListener('mousemove', resizeBoard);
                document.removeEventListener('mouseup', stopBoardResize);
                
                // Hide resize indicator after a short delay
                setTimeout(function() {
                    resizeIndicator.classList.remove('visible');
                }, 1000);
                
                // Save board settings
                saveBoardSettings();
            }
        }

        // Initialize drag and resize functionality
        function setupDragAndResize() {
            var board = document.getElementById('notes-board');
            if (!board) return;
            
            var notes = board.querySelectorAll('.board-sticky-note');
            
            notes.forEach(function(note) {
                makeElementDraggable(note);
                makeElementResizable(note);
                setupZIndexOnClick(note);
            });
        }

        // Make an element draggable
        function makeElementDraggable(element) {
            var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            
            element.addEventListener('mousedown', dragMouseDown);
            
            function dragMouseDown(e) {
                // Ignore if clicked on content div (for editing) or resize handle
                if (e.target.classList.contains('note-content') || 
                    e.target.classList.contains('resize-handle') ||
                    e.target.closest('.note-actions') ||  // Better check for buttons and their children
                    e.target.tagName === 'BUTTON' ||
                    e.target.tagName === 'I') {
                    return;
                }
                
                e.preventDefault();
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
                
                // Calculate new position
                var newTop = (element.offsetTop - pos2);
                var newLeft = (element.offsetLeft - pos1);
                var board = document.getElementById('notes-board');
                
                // Constrain within board boundaries
                if (board) {
                    var boardRect = board.getBoundingClientRect();
                    
                    // Make sure note stays within the board boundaries
                    newTop = Math.max(0, Math.min(newTop, board.clientHeight - 50));
                    newLeft = Math.max(0, Math.min(newLeft, board.clientWidth - 50));
                }
                
                // Set the element's new position
                element.style.top = newTop + "px";
                element.style.left = newLeft + "px";
                
                // Update the note model
                updateNotePosition(element);
            }
            
            function closeDragElement() {
                // Stop moving when mouse button is released
                document.removeEventListener('mouseup', closeDragElement);
                document.removeEventListener('mousemove', elementDrag);
                
                // Save the board state
                saveBoardState();
            }
        }

        // Make an element resizable
        function makeElementResizable(element) {
            var resizeHandle = element.querySelector('.resize-handle');
            if (!resizeHandle) return;
            
            var startX, startY, startWidth, startHeight;
            
            resizeHandle.addEventListener('mousedown', initResize);
            
            function initResize(e) {
                e.preventDefault();
                e.stopPropagation();
                
                startX = e.clientX;
                startY = e.clientY;
                startWidth = element.offsetWidth;
                startHeight = element.offsetHeight;
                
                document.addEventListener('mousemove', resizeElement);
                document.addEventListener('mouseup', stopResize);
            }
            
            function resizeElement(e) {
                e.preventDefault();
                
                // Calculate new dimensions
                var newWidth = (startWidth + e.clientX - startX);
                var newHeight = (startHeight + e.clientY - startY);
                
                // Apply constraints
                var board = document.getElementById('notes-board');
                if (board) {
                    var boardRect = board.getBoundingClientRect();
                    var elementRect = element.getBoundingClientRect();
                    var maxWidth = board.clientWidth - element.offsetLeft;
                    var maxHeight = board.clientHeight - element.offsetTop;
                    
                    newWidth = Math.max(100, Math.min(newWidth, maxWidth));
                    newHeight = Math.max(100, Math.min(newHeight, maxHeight));
                }
                
                // Set the new size
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                
                // Update the note model
                updateNoteSize(element);
            }
            
            function stopResize() {
                document.removeEventListener('mousemove', resizeElement);
                document.removeEventListener('mouseup', stopResize);
                
                // Save the board state
                saveBoardState();
            }
        }

        // Set up z-index change on click
        function setupZIndexOnClick(element) {
            element.addEventListener('mousedown', function() {
                var maxZ = 0;
                $scope.notes.forEach(function(note) {
                    if (note.zIndex > maxZ) {
                        maxZ = note.zIndex;
                    }
                });
                
                var noteId = element.getAttribute('data-id');
                var noteObj = $scope.notes.find(function(note) {
                    return note.id === noteId;
                });
                
                if (noteObj && noteObj.zIndex !== maxZ + 1) {
                    noteObj.zIndex = maxZ + 1;
                    element.style.zIndex = noteObj.zIndex;
                    $scope.$apply();
                }
            });
        }

        // Update note position in the model
        function updateNotePosition(element) {
            var noteId = element.getAttribute('data-id');
            var noteObj = $scope.notes.find(function(note) {
                return note.id === noteId;
            });
            
            if (noteObj) {
                noteObj.x = element.offsetLeft;
                noteObj.y = element.offsetTop;
                $scope.$apply();
            }
        }

        // Update note size in the model
        function updateNoteSize(element) {
            var noteId = element.getAttribute('data-id');
            var noteObj = $scope.notes.find(function(note) {
                return note.id === noteId;
            });
            
            if (noteObj) {
                noteObj.width = element.offsetWidth;
                noteObj.height = element.offsetHeight;
                $scope.$apply();
            }
        }

        // Initialize
        initBoard();

        // Watch for new notes being added to set up drag and resize
        $scope.$watchCollection('notes', function(newNotes, oldNotes) {
            if (newNotes && oldNotes && newNotes.length !== oldNotes.length) {
                setTimeout(setupDragAndResize, 100);
            }
        });
    }]);
})(); 