/**
 * StickyNotes Enhanced Functionality
 * Adds whole-page drag and drop and sticky notes features
 */
(function() {
    // Wait for document to be ready
    document.addEventListener('DOMContentLoaded', function() {
        setupPageDragAndDrop();
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
        }, false);

        body.addEventListener('dragleave', function(e) {
            dragCounter--;
            if (dragCounter === 0) {
                body.classList.remove('drag-over');
            }
        }, false);

        // Handle drop
        body.addEventListener('drop', function(e) {
            dragCounter = 0;
            body.classList.remove('drag-over');
            
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
            
            // TODO: Add welcome note using the app's API
            // This would typically be done through the app's normal note creation flow
            // For now, we'll just show an alert
            setTimeout(function() {
                alert("Welcome to StickyNotes! Drop files anywhere on the page to create a new note.");
            }, 1000);
        }
    }
})(); 