jQuery.sap.require("com.test.e2e.util.Formatter");
jQuery.sap.require("com.test.e2e.util.Controller");

com.test.e2e.util.Controller.extend("com.test.e2e.view.Master", {

	onInit : function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		this.getView().byId("list").attachEventOnce("updateFinished", function() {
			this.oInitialLoadFinishedDeferred.resolve();
			oEventBus.publish("Master", "InitialLoadFinished", { oListItem : this.getView().byId("list").getItems()[0] });
		}, this);

		var oEventBus = this.getEventBus();
		oEventBus.subscribe("Detail", "TabChanged", this.onDetailTabChanged, this);

		//on phones, we will not have to select anything in the list so we don't need to attach to events
		if (sap.ui.Device.system.phone) {
			return;
		}

		this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);

		oEventBus.subscribe("Detail", "Changed", this.onDetailChanged, this);
		oEventBus.subscribe("Detail", "NotFound", this.onNotFound, this);
	},

	onRouteMatched : function(oEvent) {
		var sName = oEvent.getParameter("name");

		if (sName !== "main") {
			return;
		}

		//Load the detail view in desktop
		this.getRouter().myNavToWithoutHash({ 
			currentView : this.getView(),
			targetViewName : "com.test.e2e.view.Detail",
			targetViewType : "XML"
		});

		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {

			//On the empty hash select the first item
			this.selectFirstItem();

		});

	},

	onDetailChanged : function (sChanel, sEvent, oData) {
		var sProductPath = oData.sProductPath;
		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {
			var oList = this.getView().byId("list");

			var oSelectedItem = oList.getSelectedItem();
			// the correct item is already selected
			if(oSelectedItem && oSelectedItem.getBindingContext().getPath() === sProductPath) {
				return;
			}

			var aItems = oList.getItems();

			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].getBindingContext().getPath() === sProductPath) {
					oList.setSelectedItem(aItems[i], true);
					break;
				}
			}
		});
	},

	onDetailTabChanged : function (sChanel, sEvent, oData) {
		this.sTab = oData.sTabKey;
	},

	waitForInitialListLoading : function (fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound : function () {
		this.getView().byId("list").removeSelections();
	},

	selectFirstItem : function() {
		var oList = this.getView().byId("list");
		var aItems = oList.getItems();
		if (aItems.length) {
			oList.setSelectedItem(aItems[0], true);
		}
	},

	onSearch : function() {
		// add filter for search
		var filters = [];
		var searchString = this.getView().byId("searchField").getValue();
		if (searchString && searchString.length > 0) {
			filters = [ new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, searchString) ];
		}

		// update list binding
		this.getView().byId("list").getBinding("items").filter(filters);
	},

	onSelect : function(oEvent) {
		// Get the list item, either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode).
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
	},
    
    //this is the function which handles the Add Product button press
    addProduct: function() {
    	//Load the detail edit view in desktop
    	this.getRouter().myNavToWithoutHash({
    		currentView: this.getView(),
    		targetViewName: "com.test.e2e.view.DetailEdit",
    		targetViewType: "XML",
    		transition : "slide"
    	});
    },
    
    flushPress: function() {
        jQuery.sap.require("sap.m.MessageBox");
        var busyIndicator = new sap.m.BusyDialog("odataBusyIndicator", {
            showCancelButton :false,
            title : "Please Wait..",
            text : "Flushing modifications"
        });
        busyIndicator.open();
 
        //flush callback for success
        function flush_success() {
            busyIndicator.close();
            busyIndicator.destroy();
            sap.m.MessageBox.show("Modifications have been flushed.", 
            				sap.m.MessageBox.Icon.INFORMATION, "Info");         	
        }
        
        //flush callback for failure
        function flush_failure() {
            busyIndicator.close();
            busyIndicator.destroy();
            sap.m.MessageBox.show("Failed flush modifications. ", 
            				sap.m.MessageBox.Icon.ERROR, "Error");         	
        }
        
        //We only have 1 store, so address the first one
        //In the stores array
        sap.OData.stores[0].flush(flush_success, flush_failure);
    },
    
    refreshPress: function() {
        var busyIndicator = new sap.m.BusyDialog("odataRefreshBusyIndicator", {
            showCancelButton :false,
            title : "Please Wait..",
            text : "Refreshing the Data"
        });
        busyIndicator.open();
        
        //refresh success callback
        function refresh_success() {
            busyIndicator.close();
            busyIndicator.destroy();
            sap.ui.getCore().getModel().refresh();        	
        }
        
        //refresh error callback
        function refresh_failure() {
            busyIndicator.close();
            busyIndicator.destroy();
            sap.m.MessageBox.show("Failed to refresh data.", 
            					sap.m.MessageBox.Icon.ERROR, "Error");         	
        }
        
        //We only have 1 store, so address the first one
        //In the stores array
        sap.OData.stores[0].refresh(refresh_success, refresh_failure);
    },
    
	showDetail : function(oItem) {
		// If we're on a phone, include nav in history; if not, don't.
		var bReplace = jQuery.device.is.phone ? false : true;
		this.getRouter().navTo("detail", {
			from: "master",
			entity: oItem.getBindingContext().getPath().substr(1),
			tab: this.sTab
		}, bReplace);
	}
});