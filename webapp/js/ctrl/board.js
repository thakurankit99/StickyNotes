/**
 * Board Controller for the StickyNotes Application
 */
angular.module('plik.controllers')
    .controller('BoardCtrl', ['$scope', '$rootScope', '$dialog', '$window', '$timeout',
        function($scope, $rootScope, $dialog, $window, $timeout) {
            
            // Initialize board state
            $scope.notes = [];
            
            // Initialize the board when DOM is loaded
            $timeout(function() {
                initBoard();
            }, 100);
            
            // Add a new note to the board
            $scope.addNote = function() {
                try {
                    var boardElement = document.getElementById('board');
                    var boardRect = boardElement.getBoundingClientRect();
                    
                    // Create a position that's visible in the viewport
                    var posX = Math.random() * (boardRect.width - 250) + 50;
                    var posY = Math.random() * (boardRect.height - 250) + 50;
                    
                    var noteData = {
                        id: 'note-' + Date.now(),
                        content: '',
                        position: {
                            x: posX,
                            y: posY
                        },
                        size: {
                            width: 200,
                            height: 200
                        },
                        color: 'yellow',
                        createdAt: new Date().toISOString()
                    };
                    
                    createNoteElement(noteData);
                    $scope.notes.push(noteData);
                    saveNotesToStorage();
                } catch (error) {
                    console.error('Error adding note:', error);
                }
            };
            
            // Clear all notes from the board
            $scope.clearBoard = function() {
                try {
                    $dialog.alert({
                        message: 'Are you sure you want to clear all notes?',
                        title: 'Confirm Clear Board',
                        status: 'warning',
                        confirm: true
                    }).then(function() {
                        var notes = document.querySelectorAll('.note:not(#note-template)');
                        notes.forEach(function(note) {
                            note.remove();
                        });
                        $scope.notes = [];
                        saveNotesToStorage();
                        showToast('Board cleared');
                    });
                } catch (error) {
                    console.error('Error clearing board:', error);
                }
            };
            
            // Export the board as a JSON file
            $scope.exportBoard = function() {
                try {
                    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify($scope.notes));
                    var downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "sticky-notes-" + new Date().toISOString().split('T')[0] + ".json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                    showToast('Board exported successfully');
                } catch (error) {
                    console.error('Error exporting board:', error);
                    showToast('Failed to export board', 'error');
                }
            };
            
            // Share a note
            $scope.shareNote = function(noteId) {
                try {
                    var note = $scope.notes.find(function(n) { return n.id === noteId; });
                    if (!note) return;
                    
                    // Store the note content in localStorage for the upload page to find
                    localStorage.setItem('noteToUpload', note.content);
                    
                    // Redirect to upload page
                    $window.location.href = '#/';
                    
                    showToast('Note ready for sharing');
                } catch (error) {
                    console.error('Error sharing note:', error);
                    showToast('Failed to share note', 'error');
                }
            };
            
            // Initialize controllers that will be exposed to the window
            $window.deleteNote = function(noteId) {
                try {
                    var elementToRemove = document.getElementById(noteId);
                    if (elementToRemove) {
                        elementToRemove.remove();
                    }
                    
                    $scope.notes = $scope.notes.filter(function(note) {
                        return note.id !== noteId;
                    });
                    
                    saveNotesToStorage();
                    $scope.$apply();
                } catch (error) {
                    console.error('Error deleting note:', error);
                }
            };
            
            $window.cycleNoteColor = function(noteId) {
                try {
                    var colors = ['yellow', 'blue', 'green', 'pink', 'purple'];
                    var noteElement = document.getElementById(noteId);
                    
                    if (!noteElement) return;
                    
                    var currentColorIndex = -1;
                    
                    for (var i = 0; i < colors.length; i++) {
                        if (noteElement.classList.contains(colors[i])) {
                            currentColorIndex = i;
                            noteElement.classList.remove(colors[i]);
                            break;
                        }
                    }
                    
                    var nextColorIndex = (currentColorIndex + 1) % colors.length;
                    noteElement.classList.add(colors[nextColorIndex]);
                    
                    // Update the note data
                    var note = $scope.notes.find(function(n) { return n.id === noteId; });
                    if (note) {
                        note.color = colors[nextColorIndex];
                        saveNotesToStorage();
                    }
                } catch (error) {
                    console.error('Error cycling note color:', error);
                }
            };
            
            function createNoteElement(noteData) {
                try {
                    var template = document.getElementById('note-template');
                    var newNote = template.cloneNode(true);
                    
                    newNote.id = noteData.id;
                    newNote.style.display = 'block';
                    newNote.style.left = noteData.position.x + 'px';
                    newNote.style.top = noteData.position.y + 'px';
                    
                    if (noteData.size) {
                        newNote.style.width = noteData.size.width + 'px';
                        newNote.style.height = noteData.size.height + 'px';
                    }
                    
                    // Set note color
                    newNote.classList.add(noteData.color || 'yellow');
                    
                    // Set note content
                    var contentDiv = newNote.querySelector('.note-content');
                    contentDiv.innerHTML = noteData.content || '';
                    
                    // Add event listener for content changes
                    contentDiv.addEventListener('blur', function() {
                        noteData.content = contentDiv.innerHTML;
                        saveNotesToStorage();
                    });
                    
                    // Set up delete button
                    var deleteButton = newNote.querySelector('.note-delete');
                    deleteButton.addEventListener('click', function() {
                        $window.deleteNote(noteData.id);
                    });
                    
                    // Append the note to the board
                    document.getElementById('board').appendChild(newNote);
                    
                    // Make the note draggable and resizable
                    setupNoteDragging(newNote, noteData);
                    setupNoteResizing(newNote, noteData);
                } catch (error) {
                    console.error('Error creating note element:', error);
                }
            }
            
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
                    console.error('Error setting up note dragging:', error);
                }
            }
            
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
                    console.error('Error setting up note resizing:', error);
                }
            }
            
            function initBoard() {
                try {
                    // Initialize the board
                    setupContextMenu();
                    loadNotesFromStorage();
                    
                    // If no notes exist, create a welcome note
                    if ($scope.notes.length === 0) {
                        createWelcomeNote();
                    }
                } catch (error) {
                    console.error('Error initializing board:', error);
                }
            }
            
            function setupContextMenu() {
                try {
                    var contextMenu = document.getElementById('context-menu');
                    var activeNoteId = null;
                    
                    // Hide context menu on click outside
                    document.addEventListener('click', function() {
                        contextMenu.style.display = 'none';
                    });
                    
                    // Disable default context menu on notes
                    document.addEventListener('contextmenu', function(e) {
                        var noteElement = findParentWithClass(e.target, 'note');
                        
                        if (noteElement && noteElement.id !== 'note-template') {
                            e.preventDefault();
                            
                            // Show custom context menu
                            contextMenu.style.display = 'block';
                            contextMenu.style.left = e.pageX + 'px';
                            contextMenu.style.top = e.pageY + 'px';
                            
                            activeNoteId = noteElement.id;
                        }
                    });
                    
                    // Setup context menu actions
                    var menuItems = contextMenu.querySelectorAll('li');
                    menuItems.forEach(function(item) {
                        item.addEventListener('click', function(e) {
                            e.stopPropagation();
                            
                            var action = this.getAttribute('data-action');
                            handleContextMenuAction(action, activeNoteId);
                            contextMenu.style.display = 'none';
                        });
                    });
                } catch (error) {
                    console.error('Error setting up context menu:', error);
                }
            }
            
            function handleContextMenuAction(action, noteId) {
                try {
                    switch(action) {
                        case 'edit':
                            var noteElement = document.getElementById(noteId);
                            if (noteElement) {
                                var contentDiv = noteElement.querySelector('.note-content');
                                contentDiv.focus();
                            }
                            break;
                        case 'color':
                            $window.cycleNoteColor(noteId);
                            break;
                        case 'share':
                            $scope.shareNote(noteId);
                            break;
                        case 'delete':
                            $window.deleteNote(noteId);
                            break;
                    }
                } catch (error) {
                    console.error('Error handling context menu action:', error);
                }
            }
            
            function createWelcomeNote() {
                try {
                    var welcomeNote = {
                        id: 'note-welcome',
                        content: '<b>Welcome to StickyNotes!</b><br><br>• Add new notes with the button above<br>• Drag notes by their top handle<br>• Resize from the bottom right corner<br>• Right-click for more options<br>• Double-click to edit<br><br>Get started by adding your first note!',
                        position: {
                            x: 50,
                            y: 50
                        },
                        size: {
                            width: 250,
                            height: 250
                        },
                        color: 'blue',
                        createdAt: new Date().toISOString()
                    };
                    
                    createNoteElement(welcomeNote);
                    $scope.notes.push(welcomeNote);
                    saveNotesToStorage();
                } catch (error) {
                    console.error('Error creating welcome note:', error);
                }
            }
            
            function loadNotesFromStorage() {
                try {
                    var storedNotes = localStorage.getItem('stickyNotes');
                    if (storedNotes) {
                        $scope.notes = JSON.parse(storedNotes);
                        
                        // Create note elements for each stored note
                        $scope.notes.forEach(function(noteData) {
                            createNoteElement(noteData);
                        });
                    }
                } catch (error) {
                    console.error('Error loading notes from storage:', error);
                }
            }
            
            function saveNotesToStorage() {
                try {
                    localStorage.setItem('stickyNotes', JSON.stringify($scope.notes));
                } catch (error) {
                    console.error('Error saving notes to storage:', error);
                }
            }
            
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
            
            function findParentWithClass(element, className) {
                while (element) {
                    if (element.classList && element.classList.contains(className)) {
                        return element;
                    }
                    element = element.parentNode;
                }
                return null;
            }
            
            function showToast(message, type) {
                try {
                    var toastElement = document.getElementById('toast');
                    
                    if (type === 'error') {
                        toastElement.style.backgroundColor = '#f44336';
                    } else {
                        toastElement.style.backgroundColor = '#333';
                    }
                    
                    toastElement.textContent = message;
                    toastElement.style.display = 'block';
                    toastElement.classList.add('show');
                    
                    setTimeout(function() {
                        toastElement.classList.remove('show');
                        setTimeout(function() {
                            toastElement.style.display = 'none';
                        }, 300);
                    }, 3000);
                } catch (error) {
                    console.error('Error showing toast:', error);
                }
            }
        }
    ]); 