var startTime = null;
var lastRefreshTime = null;
var store = null;
var oscontext = null;
var openStoreCallback = null;

function isDefault(port) {
    "use strict";
    return port === 80 || port === 443;
}

function formatPath(path) {
    "use strict";
    if (path && path.indexOf("/") !== 0) {
        path = "/" + path;
    }

    if (path && path.lastIndexOf("/") === path.length -1) {
        path = path.substring(0, path.length - 1);
    }

    return path;
}

function updateStatus(msg) {
    "use strict";
    //document.getElementById('statusID').innerHTML = msg + " ";
    //jQuery.sap.require("sap.m.MessageBox");
    console.log("#### " + msg);
    //sap.m.MessageBox.alert(msg, "Status");
}

 // general error handling
function onError(msg, url, line) {
    "use strict";
    var idx = url.lastIndexOf("/");
    var file = "unknown";
    if (idx > -1) {
        file = url.substring(idx + 1);
    }
    console.log("#### " + "An error occurred in " + file + " (at line # " + line + "): " + msg);

    jQuery.sap.require("sap.m.MessageBox");
    sap.ui.commons.MessageBox.alert("An error occurred in " + file + " (at line # " + line + "): " + msg, "Error");
    return false; //suppressErrorAlert;
}

function errorCallback(e) {
    "use strict";
    jQuery.sap.require("sap.m.MessageBox");
    sap.m.MessageBox.alert(e, "Error");
}

//*** opening the offline store by passing in the connection informaiton form the logon Mananger
function openStore(successCallback, logonContext) {
    "use strict";
    jQuery.sap.require("sap.ui.thirdparty.datajs");

    if (!logonContext) {
        sap.ui.commons.MessageBox.alert("Register or unlock before proceeding", "Alert");
        return;
    }
    startTime = new Date();
    updateStatus("store.open called x " + JSON.stringify(definingRequests));
    
    if (logonContext.registrationContext.farmId === "0") {
        logonContext.registrationContext.farmId = "";
    }
    
    var connectionInfo = {
        https : logonContext.registrationContext.https,
        serverHost : logonContext.registrationContext.serverHost,
        serverPort : logonContext.registrationContext.serverPort,
        appid : sap.Logon.applicationId,
        appcid : logonContext.applicationConnectionId,
        user : logonContext.registrationContext.user,
        password : logonContext.registrationContext.password,
        urlSuffix : formatPath(logonContext.registrationContext.resourcePath) + formatPath(logonContext.registrationContext.farmId)
    };

    connectionInfo.serviceUrl = (connectionInfo.https ? "https":"http") 
        + "://" + connectionInfo.serverHost 
        + (isDefault(connectionInfo.serverPort) ? "" : (":" + connectionInfo.serverPort))
        + formatPath(connectionInfo.urlSuffix)
        + formatPath(connectionInfo.appid);
    
    var auth = "Basic "+btoa(logonContext.registrationContext.user + ":" + logonContext.registrationContext.password);
    var uHeader = {"Authorization":auth};

    connectionInfo.headers = uHeader;
    
    var properties = {
            "name": "products",
            "host": connectionInfo.serverHost,
            "port": connectionInfo.serverPort,
            "https": connectionInfo.https,
            "serviceRoot" : connectionInfo.appid,
            "definingRequests" : definingRequests,
            "urlSuffix" : connectionInfo.urlSuffix,
            "customHeaders" : connectionInfo.headers
        }

    console.log("invoking createOfflineStore() " + JSON.stringify(properties));
    store = sap.OData.createOfflineStore(properties);
    store.onrequesterror = errorCallback;

    console.log("invoking store.open() ");

    //var options = {};
    store.open(function () {
        "use strict";
        var endTime = new Date();
        var duration = (endTime - startTime) / 1000;
        lastRefreshTime = endTime;

        updateStatus("Offline store opened in  " + duration + " sec.");

        successCallback(logonContext);
        }, errorCallback);
}

function closeStore() {
    "use strict";
    if (!store) {
        updateStatus("The store must be opened before it can be closed");
        return;
    }
    updateStatus("store close called");
    store.close(closeStoreSuccessCallback, errorCallback);
}

function closeStoreSuccessCallback() {
    "use strict";
    updateStatus("Offline store is now closed.");
}

function flushStore() {
    "use strict";
    updateStatus("store.flush called");
    store.flush(flushStoreSuccessCallback, errorCallback);
}

function flushStoreSuccessCallback() {
    "use strict";
    if (!store) {
        updateStatus("The store must be open before it can be flushed");
        return;
    }
    updateStatus("Store has been flushed.");
}

function refreshStore() {
    "use strict";
    if (window.cordova || getUrlParameterName("companionbuster")) {
        startTime = new Date();
        updateStatus("store.refresh called");
        store.refresh(refreshStoreCallback, errorCallback);
    } else {
        jQuery.sap.require("sap.m.MessageBox");
        sap.m.MessageBox.alert("This refresh feature is only available when the application is built using the SAP Mobile Platform.");
    }
}

function refreshStoreCallback() {
    if (!store) {
        updateStatus("The store must be open before it can be refreshed");
    } else {
        var endTime = new Date();
        var duration = (endTime - startTime) / 1000;
        lastRefreshTime = endTime;
        updateStatus("Offline store refreshed in  " + duration + " seconds");
    }
}

function clearStore() {
    if (!store) {
        updateStatus("The store must be closed before it can be cleared");
    } else {
       store.clear(clearStoreSuccessCallback, errorCallback);
    }
}

function clearStoreSuccessCallback() {
    updateStatus("Offline store has been cleared");
}

function registerForPush() {
    "use strict";
    var nTypes = sap.Push.notificationType.SOUNDS | sap.Push.notificationType.ALERT;
    var GCMID = null; //GCM Sender ID, null for APNS
    sap.Push.registerForNotificationTypes(nTypes, regSuccess, regFailure, processNotification, GCMID);
}

function unregisterForPush() {
    "use strict";
    //var nTypes = sap.Push.notificationType.SOUNDS | sap.Push.notificationType.ALERT;
    sap.Push.unregisterForNotificationTypes(unregCallback);
}

function regSuccess(result) {
    "use strict";
    updateStatus("Successfully registered: " + JSON.stringify(result));
}

function regFailure(errorInfo) {
    "use strict";
    updateStatus("Error while registering.  " + JSON.stringify(errorInfo));
}

function unregCallback(result) {
    "use strict";
    updateStatus("Successfully unregistered: " + JSON.stringify(result));
}

function processNotification(notification) {
    "use strict";
    updateStatus("in processNotification: " + JSON.stringify(notification));
}

function processMissedNotification(notification) {
    "use strict";
    updateStatus("In processMissedNotification " + JSON.stringify(notification));
}

function checkForNotification(notification) {
    "use strict";
    sap.Push.checkForNotification(processMissedNotification);
}

function checkForAppUpdate() {
    "use strict";
    sap.AppUpdate.addEventListener("checking", function (e) {
        updateStatus("Checking for update");
    });

    sap.AppUpdate.addEventListener("noupdate", function (e) {
        updateStatus("No update");
    });

    sap.AppUpdate.addEventListener("downloading", function (e) {
        updateStatus("Downloading update");
    });

    sap.AppUpdate.addEventListener("progress", function (e) {
        if (e.lengthComputable) {
            var percent = Math.round(e.loaded / e.total * 100);
            if (percent > 0) {
                updateStatus("Progress " + percent);
            }
            //document.getElementById("statusLabel").innerHTML = "Download progress " + percent + "%";
        }
    });

    sap.AppUpdate.addEventListener("error", function (e) {
        updateStatus("Error downloading update. statusCode: " + e.statusCode + " statusMessage: " + e.statusMessage);
    });

    /*  //Notice that addEventListener adds the function to the chain of functions that are notified. 
            sap.AppUpdate.addEventListener("updateready", function(e) {
                console.log("Update ready");
            }); 
            */

    //Notice here that we are overriding the default handler for the updateready event
    sap.AppUpdate.onupdateready = function () {
        updateStatus("Confirming application update");
        //document.getElementById('statusLabel').innerHTML = "";
        navigator.notification.confirm("New update available",
            function (buttonIndex) {
                if (buttonIndex === 2) {
                    updateStatus("Applying application update");
                    sap.AppUpdate.reloadApp();
                }
            },
            "Update", ["Later", "Relaunch Now"]);
    };
    sap.AppUpdate.update();

}