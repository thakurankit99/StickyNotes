/**
 * API module for Plik
 * Handles server communication
 */
angular.module('api', [])
    .factory('$api', ['$http', '$q', function($http, $q) {
        var api = {};
        
        // Base URL for API calls
        api.base = '';
        
        // Get server configuration
        api.getConfig = function() {
            var deferred = $q.defer();
            
            // Basic mock implementation
            deferred.resolve({
                feature_one_shot: 'default',
                feature_removable: 'default',
                feature_stream: 'default',
                feature_password: 'default',
                feature_comments: 'default',
                feature_text: 'default',
                defaultTTL: 86400 * 30, // 30 days in seconds
                maxTTL: -1, // No limit
                maxFileSize: 10 * 1024 * 1024 * 1024 // 10GB
            });
            
            return deferred.promise;
        };

        // Get current user
        api.getUser = function() {
            var deferred = $q.defer();
            deferred.resolve(null); // No user by default
            return deferred.promise;
        };

        // Create a new upload
        api.createUpload = function(upload) {
            var deferred = $q.defer();
            
            // Simple mock with generated ID
            var id = 'upload_' + Date.now();
            var result = angular.copy(upload);
            result.id = id;
            result.uploadToken = 'token_' + id;
            result.files = result.files || [];
            
            // Set file IDs
            angular.forEach(result.files, function(file, index) {
                file.id = 'file_' + index;
                file.status = 'uploaded';
            });
            
            deferred.resolve(result);
            return deferred.promise;
        };

        // Upload a file
        api.uploadFile = function(upload, file, progressCallback) {
            var deferred = $q.defer();
            
            // Simulate progress (for UI feedback)
            var progress = 0;
            var interval = setInterval(function() {
                progress += 10;
                if (progressCallback) progressCallback({loaded: progress, total: 100});
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Return completed file
                    var result = angular.copy(file);
                    result.id = 'file_' + Date.now();
                    result.status = 'uploaded';
                    deferred.resolve(result);
                }
            }, 300);
            
            return deferred.promise;
        };

        // Get an upload
        api.getUpload = function(id, token) {
            var deferred = $q.defer();
            
            // Mock implementation
            deferred.resolve({
                id: id,
                uploadToken: token,
                removable: true,
                ttl: 86400 * 30,
                files: []
            });
            
            return deferred.promise;
        };

        // Remove file
        api.removeFile = function(upload, file) {
            var deferred = $q.defer();
            deferred.resolve(true);
            return deferred.promise;
        };

        // Remove upload
        api.removeUpload = function(upload) {
            var deferred = $q.defer();
            deferred.resolve(true);
            return deferred.promise;
        };

        return api;
    }]); 