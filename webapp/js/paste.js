/**
 * Paste module for Plik
 * Handles clipboard paste events
 */
angular.module('paste', [])
    .factory('$paste', ['$window', '$document', function($window, $document) {
        var paste = {};
        var callback = null;
        
        // Register paste callback
        paste.register = function(cb) {
            callback = cb;
            
            // Add paste event listener
            $document.on('paste', handlePaste);
        };
        
        // Unregister paste callback
        paste.unregister = function() {
            $document.off('paste', handlePaste);
            callback = null;
        };
        
        // Handle paste event
        function handlePaste(e) {
            if (!callback) return;
            
            var clipboard = {
                files: [],
                getData: function(type) {
                    if (e.clipboardData && e.clipboardData.getData) {
                        return e.clipboardData.getData(type);
                    }
                    return '';
                }
            };
            
            // Get files from clipboard
            if (e.clipboardData && e.clipboardData.items) {
                var items = e.clipboardData.items;
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item.kind === 'file') {
                        var file = item.getAsFile();
                        if (file) {
                            clipboard.files.push(file);
                        }
                    }
                }
            }
            
            // Call the callback
            callback(clipboard);
        }
        
        return paste;
    }]); 