/**
 * Dialog module for Plik
 * Handles modal dialogs and alerts
 */
angular.module('dialog', ['ui.bootstrap'])
    .factory('$dialog', ['$uibModal', '$q', function($uibModal, $q) {
        var dialog = {};
        
        // Display alert dialog
        dialog.alert = function(options) {
            // Default options
            if (typeof options === 'string') {
                options = {message: options};
            }
            
            var title = options.title || 'Alert';
            var message = options.message || '';
            var status = options.status || '';
            var value = options.value || '';
            var confirm = options.confirm || false;
            
            var modalInstance = dialog.openDialog({
                backdrop: 'static',
                keyboard: true,
                templateUrl: 'partials/alert.html',
                controller: 'AlertController',
                resolve: {
                    args: function() {
                        return {
                            title: title,
                            message: message,
                            status: status,
                            value: value,
                            confirm: confirm
                        };
                    }
                }
            });
            
            return modalInstance;
        };
        
        // Open modal dialog
        dialog.openDialog = function(options) {
            return $uibModal.open(options);
        };
        
        return dialog;
    }])
    .controller('AlertController', ['$scope', '$uibModalInstance', 'args',
        function($scope, $uibModalInstance, args) {
            $scope.title = args.title;
            $scope.message = args.message;
            $scope.status = args.status;
            $scope.value = args.value;
            $scope.confirm = args.confirm;
            
            $scope.close = function(result) {
                $uibModalInstance.close(result);
            };
            
            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
            };
        }
    ])
    .controller('QRCodeController', ['$scope', '$uibModalInstance', 'args',
        function($scope, $uibModalInstance, args) {
            $scope.title = args.title;
            $scope.url = args.url;
            $scope.qrcode = args.qrcode;
            
            $scope.close = function() {
                $uibModalInstance.close();
            };
        }
    ])
    .controller('PasswordController', ['$scope', '$uibModalInstance',
        function($scope, $uibModalInstance) {
            $scope.login = '';
            $scope.password = '';
            
            $scope.submit = function() {
                $uibModalInstance.close({
                    login: $scope.login,
                    password: $scope.password
                });
            };
            
            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
            };
        }
    ])
    .controller('PasteController', ['$scope', '$uibModalInstance', 'args',
        function($scope, $uibModalInstance, args) {
            $scope.text = args.text || '';
            
            $scope.submit = function() {
                $uibModalInstance.close({
                    text: $scope.text
                });
            };
            
            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
            };
        }
    ]); 