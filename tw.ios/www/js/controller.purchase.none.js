/**
 * https://github.com/WizardFactory/TodayWeather/issues/524
 * none inapp purchase
 * Created by aleckim on 2016. 4. 11..
 */

angular.module('controller.purchase', [])
    .factory('Purchase', function($rootScope, $http, $q, TwAds, Util) {
        var obj = {};
        obj.ACCOUNT_LEVEL_FREE = 'free';
        obj.ACCOUNT_LEVEL_PREMIUM = 'premium';
        //for paid app without ads, in app purchase
        obj.ACCOUNT_LEVEL_PAID = 'paid';
        obj.accountLevel = obj.ACCOUNT_LEVEL_FREE;
        obj.productId = null;
        obj.expirationDate = null;
        obj.loaded = false;
        obj.products = null;
        //for only ads app without in app purchase
        obj.hasInAppPurchase = false;
        obj.paidAppUrl='';

        if (twClientConfig.isPaidApp) {
            obj.accountLevel = obj.ACCOUNT_LEVEL_PAID;
            TwAds.setEnableAds(false);
        }

        obj.setAccountLevel = function (accountLevel) {
            var self = this;
            if (self.accountLevel != accountLevel) {
                console.log('set account level ='+accountLevel);
                //update accountLevel
                self.accountLevel = accountLevel;
                if (accountLevel === self.ACCOUNT_LEVEL_FREE) {
                    TwAds.setEnableAds(true);
                }
                else if (accountLevel === self.ACCOUNT_LEVEL_PREMIUM) {
                    TwAds.setEnableAds(false);
                }
            }
            else {
                console.log('account level is already set level='+accountLevel);
            }
        };

        obj.checkReceiptValidation = function(storeReceipt, callback) {
            var url = twClientConfig.serverUrl  + '/v000705' + '/check-purchase';
            $http({
                method: 'POST',
                headers: Util.getHeaders(),
                url: url,
                data: storeReceipt,
                timeout: 10000
            })
                .success(function (data) {
                    callback(undefined, data);
                })
                .error(function (data, status) {
                    console.log(status +":"+data);
                    data = data || "Request failed";
                    var err = new Error(data);
                    err.code = status;

                    Util.ga.trackEvent('plugin', 'error', 'checkReceiptValidation');
                    Util.ga.trackException(err, false);
                    callback(err);
                });
        };

        obj.saveStoreReceipt = function (storeReceipt) {
            localStorage.setItem("storeReceipt", JSON.stringify(storeReceipt));
        };

        obj.loadStoreReceipt = function () {
            return JSON.parse(localStorage.getItem("storeReceipt"));
        };

        obj.loadPurchaseInfo = function () {
            var self = this;
            console.log('load purchase info');
            var purchaseInfo = JSON.parse(localStorage.getItem("purchaseInfo"));

            if (purchaseInfo != undefined) {
                console.log('load purchaseInfo='+JSON.stringify(purchaseInfo));
                self.expirationDate = purchaseInfo.expirationDate;
                //check account date
                if ((new Date(purchaseInfo.expirationDate)).getTime() < Date.now()) {
                    console.log('account expired, please renewal or restore');
                    Util.ga.trackEvent('purchase', 'expired', 'subscribeExpired '+purchaseInfo.expirationDate);
                    purchaseInfo.accountLevel = self.ACCOUNT_LEVEL_FREE;
                }
                self.setAccountLevel(purchaseInfo.accountLevel);
            }
            else {
                self.setAccountLevel(self.ACCOUNT_LEVEL_FREE);
            }
        };

        obj.savePurchaseInfo = function (accountLevel, expirationDate) {
            var self = this;
            var purchaseInfo = {accountLevel: accountLevel, expirationDate: expirationDate};
            localStorage.setItem("purchaseInfo", JSON.stringify(purchaseInfo));

            if (purchaseInfo.accountLevel === self.ACCOUNT_LEVEL_PREMIUM) {
                TwAds.saveTwAdsInfo(false);
            }
            else {
                TwAds.saveTwAdsInfo(true);
            }
        };

        obj.updatePurchaseInfo = function () {
            var self = this;
            var restoreFunc = function () {
                if (ionic.Platform.isIOS()) {
                    return inAppPurchase.getReceipt().then(function (receipt) {
                        if (receipt == undefined) {
                            return undefined;
                        }
                        return  {type: 'ios', id: self.productId, receipt: receipt};
                    });
                }
                else if (ionic.Platform.isAndroid()) {
                    return inAppPurchase.restorePurchases().then(function(data) {
                        console.log('Purchases INFO!!!');
                        console.log(JSON.stringify(data));
                        console.log('receipt count='+data.length);
                        data.forEach(function (purchase) {
                            var inReceipt = JSON.parse(purchase.receipt);
                            console.log('receipt: '+JSON.stringify(inReceipt));
                            console.log('purchaseTime='+new Date(inReceipt.purchaseTime));
                        });
                        if (data.length == 0) {
                            return undefined;
                        }
                        //if you have many product find by product id
                        return {type: 'android', id: self.productId, receipt: data};
                    });
                }
                else {
                    throw new Error("Unknown platform");
                }
            };

            return restoreFunc()
                .then(function (storeReceipt) {
                    if (storeReceipt == undefined)  {
                        throw new Error("Can not find any purchase");
                    }
                    self.saveStoreReceipt(storeReceipt);
                    var deferred = $q.defer();
                    self.checkReceiptValidation(storeReceipt, function (err, receiptInfo) {
                        if (err) {
                            deferred.reject(new Error("Fail to connect validation server. Please restore after 1~2 minutes"));
                            return;
                        }

                        deferred.resolve(receiptInfo);
                    });
                    return deferred.promise;
                })
        };

        return obj;
    })
    .run(function($ionicPopup, $q, Purchase, $rootScope, $location, $translate, Util) {

        return;
    })
    .controller('PurchaseCtrl', function($scope, $ionicLoading, $ionicHistory, $ionicPopup,
                                         Purchase, TwAds, $translate, Util) {

        return;

        //var spinner = '<ion-spinner icon="dots" class="spinner-stable"></ion-spinner><br/>';
        //
        //var strPurchaseError = "Purchase error";
        //var strFailToConnectServer = "Fail to connect validation server.";
        //var strPleaseRestoreAfter = "Please restore after 1~2 minutes";
        //var strRestoringPurchases = "Restoring Purchases...";
        //var strRestoreError = "Restore error";
        //var strPurchasing = "Purchasing...";
        //$translate(['LOC_PURCHASE_ERROR', 'LOC_FAIL_TO_CONNECT_VALIDATION_SERVER', 'LOC_PLEASE_RESTORE_AFTER_1_2_MINUTES',
        //    'LOC_RESTORING_PURCHASES', 'LOC_RESTORE_ERROR', 'LOC_PURCHASING']).then(function (translations) {
        //    strPurchaseError = translations.LOC_PURCHASE_ERROR;
        //    strFailToConnectServer = translations.LOC_FAIL_TO_CONNECT_VALIDATION_SERVER;
        //    strPleaseRestoreAfter = translations.LOC_PLEASE_RESTORE_AFTER_1_2_MINUTES;
        //    strRestoringPurchases = translations.LOC_RESTORING_PURCHASES;
        //    strRestoreError = translations.LOC_RESTORE_ERROR;
        //    strPurchasing = translations.LOC_PURCHASING;
        //}, function (translationIds) {
        //   console.log("Fail to translations "+JSON.stringify(translationIds));
        //});
        //
        //$scope.order = function () {
        //    $ionicLoading.show({ template: spinner + strPurchasing });
        //    console.log('subscribe product='+Purchase.productId);
        //    inAppPurchase
        //        .subscribe(Purchase.productId)
        //        .then(function (data) {
        //            console.log('subscribe ok!');
        //            console.log(JSON.stringify(data));
        //            //$ionicPopup.alert({
        //            //    title: 'subscribe',
        //            //    template: JSON.stringify(data)
        //            //});
        //            if (ionic.Platform.isIOS()) {
        //               return {type: 'ios', id: Purchase.productId, receipt: data.receipt};
        //            }
        //            else if (ionic.Platform.isAndroid()) {
        //               return {type: 'android', id: Purchase.productId, receipt: [data]}
        //            }
        //            Util.ga.trackEvent('purchase', 'order', 'subscribe');
        //        })
        //        .then(function (storeReceipt) {
        //            //$ionicLoading.hide();
        //            console.log(JSON.stringify(storeReceipt));
        //            Purchase.saveStoreReceipt(storeReceipt);
        //            Purchase.checkReceiptValidation(storeReceipt, function (err, receiptInfo) {
        //                $ionicLoading.hide();
        //                if (err) {
        //                    console.log(JSON.stringify(err));
        //                    var msg =  strFailToConnectServer + " " + strPleaseRestoreAfter;
        //                    throw new Error(msg);
        //                }
        //                console.log(JSON.stringify(receiptInfo));
        //                if (!receiptInfo.ok) {
        //                    Util.ga.trackEvent('purchase', 'invalid', 'subscribe', 0);
        //                    console.log(JSON.stringify(receiptInfo.data));
        //                    throw new Error(receiptInfo.data.message);
        //                }
        //
        //                Purchase.setAccountLevel(Purchase.ACCOUNT_LEVEL_PREMIUM);
        //                Purchase.expirationDate = receiptInfo.data.expires_date;
        //                $scope.accountLevel = Purchase.ACCOUNT_LEVEL_PREMIUM;
        //                $scope.expirationDate = (new Date(Purchase.expirationDate)).toLocaleDateString();
        //                console.log('set accountLevel='+$scope.accountLevel);
        //                Purchase.savePurchaseInfo(Purchase.accountLevel, Purchase.expirationDate);
        //            });
        //        })
        //        .catch(function (err) {
        //            $ionicLoading.hide();
        //            console.log(strPurchaseError);
        //            console.log(JSON.stringify(err));
        //            $ionicPopup.alert({
        //                title: strPurchaseError,
        //                template: err.message
        //            });
        //            if (err instanceof Error) {
        //                if (err.code == -5) {
        //                    Util.ga.trackEvent('purchase', 'cancel', 'subscribe');
        //                }
        //                else {
        //                    Util.ga.trackEvent('purchase', 'error', 'subscribe');
        //                    Util.ga.trackException(err, false);
        //                }
        //            }
        //            else {
        //                Util.ga.trackException(err, false);
        //            }
        //        });
        //};
        //
        //$scope.restore = function () {
        //    $ionicLoading.show({ template: spinner + strRestoringPurchases });
        //
        //    Purchase.updatePurchaseInfo()
        //        .then(function (receiptInfo) {
        //            $ionicLoading.hide();
        //
        //            if (!receiptInfo.ok) {
        //                console.log(JSON.stringify(receiptInfo.data));
        //                Util.ga.trackEvent('purchase', 'invalid', 'subscribe', 1);
        //                throw new Error(receiptInfo.data.message);
        //            }
        //            else {
        //                Purchase.setAccountLevel(Purchase.ACCOUNT_LEVEL_PREMIUM);
        //                Purchase.expirationDate = receiptInfo.data.expires_date;
        //                $scope.accountLevel = Purchase.ACCOUNT_LEVEL_PREMIUM;
        //                $scope.expirationDate = (new Date(Purchase.expirationDate)).toLocaleDateString();
        //                console.log('set accountLevel=' + $scope.accountLevel);
        //                Purchase.savePurchaseInfo(Purchase.accountLevel, Purchase.expirationDate);
        //                Util.ga.trackEvent('purchase', 'restore', 'subscribe');
        //            }
        //        })
        //        .catch(function (err) {
        //            $ionicLoading.hide();
        //            console.log(JSON.stringify(err));
        //            Util.ga.trackEvent('purchase', 'error', 'subscribe');
        //            Util.ga.trackException(err, false);
        //            $ionicPopup.alert({
        //                title: strRestoreError,
        //                template: err.message
        //            });
        //        });
        //};
        //
        //$scope.onClose = function() {
        //    if ($scope.accountLevel == Purchase.ACCOUNT_LEVEL_PREMIUM) {
        //        TwAds.setShowAds(false);
        //    }
        //    else {
        //        TwAds.setShowAds(true);
        //    }
        //    $ionicHistory.goBack();
        //};
        //
        //$scope.$on('$ionicView.leave', function() {
        //    if ($scope.accountLevel == Purchase.ACCOUNT_LEVEL_PREMIUM) {
        //        TwAds.setShowAds(false);
        //    }
        //    else {
        //        TwAds.setShowAds(true);
        //    }
        //});
        //
        //$scope.$on('$ionicView.enter', function() {
        //    TwAds.setShowAds(false);
        //    if (window.StatusBar) {
        //        StatusBar.backgroundColorByHexString('#0288D1');
        //    }
        //});
        //
        //function init() {
        //    var expirationDate = new Date(Purchase.expirationDate);
        //    var showRenewDate = new Date();
        //
        //    //for fast close ads when first loading
        //    TwAds.setShowAds(false);
        //    $scope.accountLevel = Purchase.accountLevel;
        //    $scope.expirationDate = expirationDate.toLocaleDateString();
        //
        //    //Todo: check expire date for ios, check autoRenewing and expire date for android
        //    showRenewDate.setMonth(showRenewDate.getMonth()+3);
        //
        //    $scope.showRenew = expirationDate.getTime() <= showRenewDate.getTime();
        //
        //    if (!window.inAppPurchase) {
        //        //for develop mode
        //        var title = "Premium";
        //        var description = "Subscribe to premium and use without Ads for 1 year";
        //        $translate(['LOC_PREMIUM', 'LOC_SUBSCRIBE_TO_PREMIUM_AND_USE_WITHOUT_ADS_FOR_1_YEAR']).then(function (translations) {
        //            title = translations.LOC_PREMIUM;
        //            description = translations.LOC_SUBSCRIBE_TO_PREMIUM_AND_USE_WITHOUT_ADS_FOR_1_YEAR;
        //        }, function (translationIds) {
        //            console.log("Fail to translations "+JSON.stringify(translationIds));
        //        }).finally(function () {
        //            $scope.product = {title: title,  price: '$1.09', description: description};
        //        });
        //    }
        //    else {
        //        if (Purchase.products && Purchase.products.length) {
        //            $scope.product = Purchase.products[0];
        //        }
        //        else {
        //            console.log("Failed to get product info at start");
        //        }
        //    }
        //
        //    $scope.listWidth = window.innerWidth;
        //}
        //
        //init();
    });
