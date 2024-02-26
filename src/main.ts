//! IF ANYTHING IN THIS FILE IS CHANGED MAKE SURE setVersion.js HAS ALSO BEEN UPDATED
import App from "./App.svelte";

const mainApp = new App({
	target: document.body,
	props: {
		version: "2.0.7",
	}
});

export default mainApp;