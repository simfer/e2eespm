jQuery.sap.require("com.test.e2e.util.Formatter");
jQuery.sap.require("com.test.e2e.util.Controller");

com.test.e2e.util.Controller.extend("com.test.e2e.view.DetailEdit", {

	oAlertDialog : null,
	oBusyDialog : null,
	oMode: null,
	
	//in the init function we define a new model for this view. This new model "newProduct" will host the temporary values
	//for the product being created or edited
	onInit: function() {
		this.getView().setModel(new sap.ui.model.json.JSONModel(), "newProduct");
		//we define a new delegate for the current view in order to take into account a new event triggered just before the
		//view is shown
        this.getView().addEventDelegate({
            onBeforeShow : jQuery.proxy(function(evt) {  
                this.onBeforeShow(evt);  
            }, this)
        }); 
	},
	
	//every time the view is shown we initialize the fields
    onBeforeShow: function(evt) {
        if(evt) {
		    this.initializeNewProductData();
        }
    },
    
    //this function initializes the current view
    initializeNewProductData : function() {
        //if the global variable "sap.ui.getCore().oSelectedData" is present it means that the user pressed the Edit button
        if (sap.ui.getCore().oSelectedData) {
            //we are in the edit mode
            this.oMode = "edit";
            //we need to instantiate all the fields and the new model with the values coming from the Detail view
    	    var oSelectedData = sap.ui.getCore().oSelectedData;
		    this.getView().getModel("newProduct").setData({
			    Detail: {
			        ProductId: oSelectedData.ProductId,
			        Name: oSelectedData.Name,
			        ShortDescription: oSelectedData.ShortDescription,
			        Price: oSelectedData.Price,
				    CurrencyCode: oSelectedData.CurrencyCode,
				    SupplierId: oSelectedData.SupplierId,
				    PictureUrl: oSelectedData.PictureUrl,
				    Supplier: oSelectedData.Supplier
			    }
		    });
            //the global variable "sap.ui.getCore().oSelectedData" is destroyed
		    sap.ui.getCore().oSelectedData = undefined;
        } else {
            //if the global variable "sap.ui.getCore().oSelectedData" is not present, it means that we are in "add" mode
            this.oMode = "add";
            //the "newProduct" model is just initialized with a default currency code
		    this.getView().getModel("newProduct").setData({
			    Detail: {
				    CurrencyCode: "EUR",
				    PictureUrl: "PF-1000.jpg"
			    }
		    });
        }
	},
	
	//this function shows an error message
    showErrorAlert : function(sMessage) {
		jQuery.sap.require("sap.m.MessageBox");
		sap.m.MessageBox.alert(sMessage);
	},    
    
    //back press event handler
    onBackPress: function() {
		this.getRouter().backWithoutHash(this.getView());
    },

    //save press event handler
    onSavePress: function() {
		// Show message if no product name has been entered
		if (!this.getView().getModel("newProduct").getProperty("/Detail/Name")) {
			if (!this.oAlertDialog) {
				this.oAlertDialog = sap.ui.xmlfragment("com.test.e2e.view.NameRequiredDialog", this);
				this.getView().addDependent(this.oAlertDialog);
			}
			this.oAlertDialog.open();
		} else {
			if (!this.oBusyDialog) {
				this.oBusyDialog = new sap.m.BusyDialog();
			}
			this.oBusyDialog.open();
            //now we check if we are in add or edit mode
			if(this.oMode === "add") { 
			    //if we are in add mode we need to determine which is the next available product ID to assign to the new product
			    //we read the list of all the products in descending order and select the first product ID
    			this.getView().getModel().read("/Products", {
    				urlParameters : {
    					"$top" : 1,
    					"$orderby" : "ProductId desc",
    					"$select" : "ProductId"
    				},
    				async : false,
    				success : jQuery.proxy(function(oData) {
    				    //if we are able to get the last product in the list
    				    var str = oData.results[0].ProductId;
    				    //we take just the numeric part of the ID and increase it by 1
    				    var num = parseInt(str.match(/\d+/),10) + 1;
    				    //then we create the new product id
    				    str = "HT-" + num.toString();
    				    //and assign it to the product being created
		                this.getView().getModel("newProduct").setProperty("/Detail/ProductId",str);
		                //now we can save the product
    					this.saveProduct();
    				}, this),
    				error : jQuery.proxy(function() {
    					this.oBusyDialog.close();
    					this.showErrorAlert("Cannot determine next Product ID for new product");
    				}, this)
    			});
			} else {
			    //if this is just an edit operation we need simply to save the product
			    this.saveProduct();
			}
		}		
    },

    //this function takes care of saving the changes to the product
    saveProduct: function()   {
        //getting the details of the product which needs to be saved
		var mNewProduct = this.getView().getModel("newProduct").getData().Detail;
		
		// We need to build the payload in a JSON format
		var mPayload = {
			ProductId: mNewProduct.ProductId,
			Name: mNewProduct.Name,
			ShortDescription: mNewProduct.ShortDescription,
			Price: mNewProduct.Price.toString(),
			CurrencyCode: mNewProduct.CurrencyCode,
			PictureUrl: mNewProduct.PictureUrl
		};

        // Add supplier association to the current payload
		["Supplier"].forEach(function(sRelation) {
			var oSelect = this.getView().byId("idSelect" + sRelation);
			var sPath = oSelect.getSelectedItem().getBindingContext().getPath().substr(1);
			mPayload[sRelation] = {
				__metadata: {
					uri: sPath
				}
			};
		}, this);
		
	    // Send OData Create request
		var oModel = this.getView().getModel();
		if(this.oMode === "add") {
    		oModel.create("/Products", mPayload, {
    			success : jQuery.proxy(function(mResponse) {
    				this.initializeNewProductData();
    				sap.ui.core.UIComponent.getRouterFor(this).navTo("detail",{
		                entity : "Products('" + mResponse.ProductId + "')",
			            tab: "Supplier"
		            }, true);
    				jQuery.sap.require("sap.m.MessageToast");
    				// ID of newly inserted product is available in mResponse.ID
    				this.oBusyDialog.close();
    				sap.m.MessageToast.show("Product '" + mPayload.Name + "' successfully added");
    			}, this),
    			error : jQuery.proxy(function() {
    				this.oBusyDialog.close();
    				this.showErrorAlert("Problem encountered when creating the new product!");
    			}, this)
    		});
		} else {
    		oModel.update("/Products('" + mPayload.ProductId + "')", mPayload, {
    			success : jQuery.proxy(function() {
    				this.initializeNewProductData();
    				sap.ui.core.UIComponent.getRouterFor(this).navTo("detail",{
		                entity : "Products('" + mPayload.ProductId + "')",
			            tab: "Supplier"
		            }, true);
    				jQuery.sap.require("sap.m.MessageToast");
    				// ID of newly inserted product is available in mResponse.ID
    				this.oBusyDialog.close();
    				sap.m.MessageToast.show("Product '" + mPayload.Name + "' successfully updated");
    			}, this),
    			error : jQuery.proxy(function() {
    				this.oBusyDialog.close();
    				this.showErrorAlert("Problem encountered when updating the new product!");
    			}, this)
    		});
		}
    },
    
    onDialogClose : function(oEvent) {
		oEvent.getSource().getParent().close();
	}
});
