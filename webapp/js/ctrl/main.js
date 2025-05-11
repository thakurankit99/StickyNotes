/**
 * Main Controller for the StickyNotes Application
 */
angular.module('plik.controllers')
    .controller('MainCtrl', ['$scope', '$rootScope', '$dialog', '$window', '$timeout', '$location', 'api', 'config',
        function($scope, $rootScope, $dialog, $window, $timeout, $location, api, config) {
            // Default values
            $scope.mode = 'upload';
            $scope.uploadID = null;
            $scope.uploadToken = null;
            $scope.password = false;
            $scope.upload = {
                comments: '',
                files: [],
                token: '',
                oneShot: false,
                removable: false,
                stream: false,
                password: '',
                ttl: 0,
                extend_ttl: false
            };
            $scope.ttlValue = 30;
            $scope.ttlUnit = 'days';
            $scope.ttlUnits = ['minutes', 'hours', 'days', 'weeks', 'months', 'years', 'unlimited'];
            $scope.files = [];
            $scope.totalFiles = 0;
            $scope.totalSize = 0;
            $scope.enableComments = false;
            
            // Get server configuration
            $scope.getConfig = function() {
                config.getConfig().then(
                    function (config) {
                        $scope.config = config;
                    }, 
                    function(error) {
                        console.error('Error loading config:', error);
                        $dialog.alert({
                            title: 'Configuration error',
                            message: 'Failed to load server configuration: ' + error.message,
                            status: 'error'
                        });
                    }
                );
            };
            
            // Check if a feature is enabled
            $scope.isFeatureEnabled = function(feature) {
                if (!$scope.config || !$scope.config.features) return false;
                return $scope.config.features.indexOf(feature) >= 0;
            };
            
            // Check if a feature is forced (must be enabled)
            $scope.isFeatureForced = function(feature) {
                if (!$scope.config || !$scope.config.forced_features) return false;
                return $scope.config.forced_features.indexOf(feature) >= 0;
            };
            
            // Open a text dialog to add text content
            $scope.openTextDialog = function(text) {
                $dialog.openDialog({
                    controller: 'PasteController',
                    templateUrl: 'partials/paste.html',
                    resolve: {
                        options: function() {
                            return { text: text };
                        }
                    }
                }).result.then(function(content) {
                    // Create a file from the text content
                    var file = new File([content], "note.txt", {type: "text/plain"});
                    $scope.handleFile(file);
                });
            };
            
            // Handle file selection
            $scope.handleFile = function(file) {
                var fileObject = {
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    file: file,
                    progress: 0,
                    uploaded: false,
                    error: ''
                };
                
                $scope.files.push(fileObject);
                $scope.totalFiles = $scope.files.length;
                $scope.totalSize += file.size;
            };
            
            // Handle file selection from input
            $scope.onFileSelect = function(files) {
                if (!files || !files.length) return;
                
                for (var i = 0; i < files.length; i++) {
                    $scope.handleFile(files[i]);
                }
            };
            
            // Handle file drop
            $scope.onFileDrop = function(files, event) {
                event.stopPropagation();
                event.preventDefault();
                
                $scope.onFileSelect(files);
            };
            
            // Create a new upload
            $scope.newUpload = function(empty) {
                if (empty) {
                    console.log('Creating empty upload');
                    createUpload();
                } else if ($scope.somethingToUpload()) {
                    console.log('Creating upload with files');
                    createUpload();
                }
            };
            
            // Check if there's something to upload
            $scope.somethingToUpload = function() {
                return $scope.files.length > 0;
            };
            
            // Create an upload
            function createUpload() {
                // Prepare upload parameters
                var params = {
                    oneShot: $scope.upload.oneShot,
                    removable: $scope.upload.removable,
                    stream: $scope.upload.stream,
                    ttl: calculateTTL($scope.ttlValue, $scope.ttlUnit),
                    extend_ttl: $scope.upload.extend_ttl,
                    comments: $scope.enableComments ? $scope.upload.comments : ''
                };
                
                // Add password if enabled
                if ($scope.password && $scope.upload.password) {
                    params.password = $scope.upload.password;
                }
                
                // Create upload using API
                api.createUpload(params).then(
                    function(upload) {
                        $scope.upload = upload;
                        $scope.uploadID = upload.id;
                        $scope.uploadToken = upload.token;
                        
                        if ($scope.somethingToUpload()) {
                            // Upload files
                            uploadFiles();
                        } else {
                            // Navigate to upload view
                            $location.path('/upload/' + upload.id);
                        }
                    },
                    function(error) {
                        console.error('Error creating upload:', error);
                        $dialog.alert({
                            title: 'Upload error',
                            message: 'Failed to create upload: ' + error.message,
                            status: 'error'
                        });
                    }
                );
            }
            
            // Upload files to the server
            function uploadFiles() {
                for (var i = 0; i < $scope.files.length; i++) {
                    uploadFile($scope.files[i]);
                }
            }
            
            // Upload a single file
            function uploadFile(fileObj) {
                api.uploadFile($scope.uploadID, $scope.uploadToken, fileObj.file, function(progress) {
                    fileObj.progress = progress;
                    $scope.$apply();
                }).then(
                    function(result) {
                        fileObj.uploaded = true;
                        fileObj.token = result.token;
                        $scope.$apply();
                        
                        // Check if all files are uploaded
                        checkAllUploaded();
                    },
                    function(error) {
                        fileObj.error = error.message || 'Upload failed';
                        $scope.$apply();
                        
                        // Check if all files are uploaded
                        checkAllUploaded();
                    }
                );
            }
            
            // Check if all files are uploaded
            function checkAllUploaded() {
                var allDone = true;
                for (var i = 0; i < $scope.files.length; i++) {
                    if (!$scope.files[i].uploaded && !$scope.files[i].error) {
                        allDone = false;
                        break;
                    }
                }
                
                if (allDone) {
                    // Navigate to upload view
                    $location.path('/upload/' + $scope.uploadID);
                }
            }
            
            // Calculate TTL in seconds based on value and unit
            function calculateTTL(value, unit) {
                if (unit === 'unlimited') return 0;
                
                var seconds = value;
                
                switch (unit) {
                    case 'minutes':
                        seconds *= 60;
                        break;
                    case 'hours':
                        seconds *= 3600;
                        break;
                    case 'days':
                        seconds *= 86400;
                        break;
                    case 'weeks':
                        seconds *= 604800;
                        break;
                    case 'months':
                        seconds *= 2592000;
                        break;
                    case 'years':
                        seconds *= 31536000;
                        break;
                }
                
                return seconds;
            }
            
            // Check for a note to upload from localStorage when app is ready
            $timeout(function() {
                var noteToUpload = localStorage.getItem('noteToUpload');
                if (noteToUpload) {
                    // Remove the note from localStorage
                    localStorage.removeItem('noteToUpload');
                    
                    // Open text dialog with the note content
                    if ($scope.isFeatureEnabled('text')) {
                        $scope.openTextDialog(noteToUpload);
                    } else {
                        $scope.openTextDialog('');
                    }
                }
            }, 500);
            
            // Initialize controller
            $scope.getConfig();
        }
    ])
    .controller('MenuCtrl', ['$scope', 'config', function($scope, config) {
        $scope.title = 'StickyNotes';
        
        config.getConfig().then(function(config) {
            $scope.config = config;
        });
        
        config.getUser().then(function(user) {
            $scope.user = user;
        });
        
        $scope.isFeatureEnabled = function(feature) {
            if (!$scope.config || !$scope.config.features) return false;
            return $scope.config.features.indexOf(feature) >= 0;
        };
    }]);