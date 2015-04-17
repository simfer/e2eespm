jQuery.sap.declare("com.test.e2e.util.Controller");

sap.ui.core.mvc.Controller.extend("com.test.e2e.util.Controller", {
	getEventBus : function () {
		return sap.ui.getCore().getEventBus();
	},

	getRouter : function () {
		return sap.ui.core.UIComponent.getRouterFor(this);
	}
});