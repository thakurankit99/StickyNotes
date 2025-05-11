/**
 * ContentEditable module for Plik
 * Handles contenteditable attributes in Angular
 */
angular.module('contentEditable', [])
    .directive('contenteditable', function() {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function(scope, element, attrs, ngModel) {
                if (!ngModel) return;

                // Specify how UI should be updated
                ngModel.$render = function() {
                    element.html(ngModel.$viewValue || '');
                };

                // Listen for change events to enable binding
                element.on('blur keyup change', function() {
                    scope.$evalAsync(read);
                });
                
                // Initialize element with view value
                ngModel.$render();

                // Write data to the model
                function read() {
                    var html = element.html();
                    if (attrs.stripBr && html === '<br>') {
                        html = '';
                    }
                    ngModel.$setViewValue(html);
                }
            }
        };
    })
    .directive('validator', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var validatorName = attrs.validator;
                if (!validatorName || !scope[validatorName]) return;
                
                var validator = scope[validatorName];
                
                ngModel.$parsers.unshift(function(value) {
                    var valid = validator(value);
                    ngModel.$setValidity('validator', valid);
                    return valid ? value : undefined;
                });
                
                ngModel.$formatters.unshift(function(value) {
                    ngModel.$setValidity('validator', validator(value));
                    return value;
                });
            }
        };
    })
    .directive('invalidClass', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var className = attrs.invalidClass || 'invalid';
                
                scope.$watch(function() {
                    return ngModel.$invalid;
                }, function(invalid) {
                    if (invalid) {
                        element.addClass(className);
                    } else {
                        element.removeClass(className);
                    }
                });
            }
        };
    }); 