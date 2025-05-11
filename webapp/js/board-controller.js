/**
 * Board Controller
 * Provides functionality for the sticky notes board
 */
(function() {
    'use strict';

    angular.module('plik').controller('BoardCtrl', ['$scope', '$http', function($scope, $http) {
        // Sample initial notes
        $scope.notes = [
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
                y: 200,
                width: 180,
                height: 180,
                color: 'blue',
                zIndex: 3
            },
            {
                id: 'note-' + Date.now() + '-4',
                content: 'Resize me using the corners!',
                x: 200,
                y: 300,
                width: 220,
                height: 220,
                color: 'green',
                zIndex: 4
            }
        ];

        // Current note being modified
        $scope.currentNote = null;

        // Add a new note to the board
        $scope.addNote = function() {
            var newNote = {
                id: 'note-' + Date.now(),
                content: 'New note',
                x: 100 + Math.random() * 200,
                y: 100 + Math.random() * 200,
                width: 200,
                height: 200,
                color: 'yellow',
                zIndex: $scope.notes.length + 1
            };
            
            $scope.notes.push(newNote);
            
            // In a real implementation, this would save to a server
            saveBoardState();
        };

        // Delete a note from the board
        $scope.deleteNote = function(note) {
            var index = $scope.notes.indexOf(note);
            if (index !== -1) {
                $scope.notes.splice(index, 1);
                
                // In a real implementation, this would save to a server
                saveBoardState();
            }
        };

        // Open the color picker for a specific note
        $scope.openColorPicker = function(note) {
            $scope.currentNote = note;
            var colorPicker = document.getElementById('color-picker');
            colorPicker.classList.add('visible');
            
            // Position the color picker near the note
            var noteEl = document.querySelector('[data-id="' + note.id + '"]');
            if (noteEl) {
                var rect = noteEl.getBoundingClientRect();
                colorPicker.style.top = (rect.top + window.scrollY) + 'px';
                colorPicker.style.right = (window.innerWidth - rect.left - window.scrollX) + 'px';
                colorPicker.style.bottom = 'auto';
            }
            
            // Close picker when clicking outside
            setTimeout(function() {
                document.addEventListener('click', closeColorPicker);
            }, 10);
        };

        // Change the color of a note
        $scope.changeNoteColor = function(color) {
            if ($scope.currentNote) {
                $scope.currentNote.color = color;
                closeColorPicker();
                
                // In a real implementation, this would save to a server
                saveBoardState();
            }
        };

        // Close the color picker
        function closeColorPicker() {
            document.getElementById('color-picker').classList.remove('visible');
            document.removeEventListener('click', closeColorPicker);
        }

        // Save the board
        $scope.saveBoard = function() {
            // In a real implementation, this would save to a server
            saveBoardState();
            alert('Board saved successfully!');
        };

        // Share the board
        $scope.shareBoard = function() {
            // In a real implementation, this would generate a sharing link
            alert('Sharing link created: ' + window.location.href + '?board=demo');
        };

        // Helper function to save board state (currently just to localStorage)
        function saveBoardState() {
            localStorage.setItem('stickyNotesBoardState', JSON.stringify($scope.notes));
        }

        // Load saved board state
        function loadBoardState() {
            var savedState = localStorage.getItem('stickyNotesBoardState');
            if (savedState) {
                try {
                    $scope.notes = JSON.parse(savedState);
                } catch (e) {
                    console.error('Error loading saved board state', e);
                }
            }
        }

        // Initialize board
        function initBoard() {
            // Load saved state if available
            loadBoardState();

            // Initialize drag and drop functionality
            setTimeout(setupDragAndResize, 100);
        }

        // Initialize drag and resize functionality
        function setupDragAndResize() {
            var board = document.getElementById('notes-board');
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
                // Set the element's new position
                element.style.top = (element.offsetTop - pos2) + "px";
                element.style.left = (element.offsetLeft - pos1) + "px";
                
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
                
                // Set the new size
                element.style.width = (startWidth + e.clientX - startX) + 'px';
                element.style.height = (startHeight + e.clientY - startY) + 'px';
                
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
            if (newNotes.length !== oldNotes.length) {
                setTimeout(setupDragAndResize, 100);
            }
        });
    }]);
})(); 