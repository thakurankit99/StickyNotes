/**
 * Config module for Plik
 * Handles application configuration
 */
angular.module('config', ['api'])
    .factory('$config', ['$api', '$q', function($api, $q) {
        var config = {};
        
        // Get server configuration (cached)
        var configPromise = null;
        config.getConfig = function() {
            if (!configPromise) {
                configPromise = $api.getConfig();
            }
            return configPromise;
        };
        
        // Refresh configuration
        config.refreshConfig = function() {
            configPromise = $api.getConfig();
            return configPromise;
        };
        
        // Get current user (cached)
        var userPromise = null;
        config.getUser = function() {
            if (!userPromise) {
                userPromise = $api.getUser();
            }
            return userPromise;
        };
        
        // Refresh user
        config.refreshUser = function() {
            userPromise = $api.getUser();
            return userPromise;
        };
        
        return config;
    }]); 