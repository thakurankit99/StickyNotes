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
})(); 