jQuery.sap.require("com.test.e2e.util.Formatter");
jQuery.sap.require("com.test.e2e.util.Controller");

com.test.e2e.util.Controller.extend("com.test.e2e.view.Detail", {

	onInit: function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		if (sap.ui.Device.system.phone) {
			//don't wait for the master on a phone
			this.oInitialLoadFinishedDeferred.resolve();
		} else {
			this.getView().setBusy(true);
			this.getEventBus().subscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
		}

		this.getRouter().attachRouteMatched(this.onRouteMatched, this);

	},

	onMasterLoaded: function(sChannel, sEvent, oData) {
		if (oData.oListItem) {
			this.bindView(oData.oListItem.getBindingContext().getPath());
			this.getView().setBusy(false);
			this.oInitialLoadFinishedDeferred.resolve();
		}
	},

	onRouteMatched: function(oEvent) {
		var oParameters = oEvent.getParameters();

		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function() {
			var oView = this.getView();

			// when detail navigation occurs, update the binding context
			if (oParameters.name !== "detail") {
				return;
			}

			var sEntityPath = "/" + oParameters.arguments.entity;
			this.bindView(sEntityPath);

			var oIconTabBar = oView.byId("idIconTabBar");
			oIconTabBar.getItems().forEach(function(oItem) {
				oItem.bindElement(com.test.e2e.util.Formatter.uppercaseFirstChar(oItem.getKey()));
			});

			// Which tab?
			var sTabKey = oParameters.arguments.tab;
			this.getEventBus().publish("Detail", "TabChanged", {
				sTabKey: sTabKey
			});

			if (oIconTabBar.getSelectedKey() !== sTabKey) {
				oIconTabBar.setSelectedKey(sTabKey);
			}
		}, this));

	},

	bindView: function(sEntityPath) {
		var oView = this.getView();
		oView.bindElement(sEntityPath);

		var frag = this.byId("detailFragment");
		frag.bindElement(sEntityPath + "/Supplier");

// 		//Check if the data is already on the client
// 		if (!oView.getModel().getData(sEntityPath)) {

// 			// Check that the entity specified actually was found.
// 			oView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function() {
// 				var oData = oView.getModel().getData(sEntityPath);
// 				if (!oData) {
// 					this.showEmptyView();
// 					this.fireDetailNotFound();
// 				} else {
// 					this.fireDetailChanged(sEntityPath);
// 				}
// 			}, this));

// 		} else {
 			this.fireDetailChanged(sEntityPath);
// 		}

	},

	showEmptyView: function() {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "com.test.e2e.view.NotFound",
			targetViewType: "XML"
		});
	},

	fireDetailChanged: function(sEntityPath) {
		this.getEventBus().publish("Detail", "Changed", {
			sEntityPath: sEntityPath
		});
	},

	fireDetailNotFound: function() {
		this.getEventBus().publish("Detail", "NotFound");
	},

	onNavBack: function() {
		// This is only relevant when running on phone devices
		this.getRouter().myNavBack("main");
	},
    
    //This function handles the editing of a product
	editProduct: function() {
        //get the binding context from the current view
		var oBindingContext = this.getView().getBindingContext();
		//create a new object to host the context
		var oSelectedData = {};
		oSelectedData.ProductId = oBindingContext.getProperty("ProductId");
		oSelectedData.Name = oBindingContext.getProperty("Name");
		oSelectedData.ShortDescription = oBindingContext.getProperty("ShortDescription");
		oSelectedData.Price = oBindingContext.getProperty("Price");
		oSelectedData.CurrencyCode = oBindingContext.getProperty("CurrencyCode");
		oSelectedData.SupplierId = oBindingContext.getProperty("SupplierId");
		oSelectedData.Supplier = oBindingContext.getProperty("Supplier");

        //the context variable is made global so that we can read it from the destination view
        //in this way we can pass values from a window to another
		sap.ui.getCore().oSelectedData = oSelectedData;

		//Load the detail edit view in desktop
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "com.test.e2e.view.DetailEdit",
			targetViewType: "XML",
			transition: "slide"
		});
	},

	//This function handles the deletion of a product
	deleteProduct: function() {
	    //get the name of the product to be deleted
		var ProductId = this.getView().getBindingContext().getPath();
		
		//get the data model where this product is located
		var oModel = this.getOwnerComponent().getModel();
		
		//create the function that will take care of deleting the product. This function is assigned to a variable
		var fnDelete = jQuery.proxy(function() {
		    //before we delete the product, we read the first product in the list
			this.getView().getModel().read("/Products", {
				urlParameters: {
					"$top": 1,
					"$orderby": "ProductId asc",
					"$select": "ProductId"
				},
				async: false,
				//if the reading is successful...
				success: jQuery.proxy(function(oData) {
				    //... then we navigate to this product 
					sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
						entity: "Products('" + oData.results[0].ProductId + "')",
						tab: "Supplier"
					}, true);
				}, this),
				error: jQuery.proxy(function() {
					this.oBusyDialog.close();
					this.showErrorAlert("Cannot determine the first product in the list");
				}, this)
			});
			
            //now we remove the selected product
			oModel.remove(ProductId, null, null, function() {
                //if the deletion is successful we display the following message 
				sap.m.MessageToast.show("Product successfully deleted!");
			}, function() {
                //if the deletion fails we display the following message
				sap.m.MessageToast.show("Delete operation failed!");
			});
		}, this);

		jQuery.sap.require("sap.m.MessageBox");
		var sDelete = "Delete";

        //A confirmation dialog is displayed before the product deletion
		sap.m.MessageBox.show("Do you really want to delete the product " + ProductId.substr(1), {
			icon: sap.m.MessageBox.Icon.WARNING,
			title: "Delete",
			actions: [sDelete, sap.m.MessageBox.Action.CANCEL],
			onClose: function(oAction) {
			    //only if the chosen action is "Delete" we effectively delete the product
				if (oAction === sDelete) {
					fnDelete();
				}
			},
			styleClass: (!sap.ui.Device.support.touch ? "sapUiSizeCompact" : "")
		});
	},

	onDetailSelect: function(oEvent) {
		sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
			entity: oEvent.getSource().getBindingContext().getPath().slice(1),
			tab: oEvent.getParameter("selectedKey")
		}, true);
	}

});