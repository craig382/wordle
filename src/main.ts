import App from "./App.svelte";
import { version } from '../package.json';

const mainApp = new App({
	target: document.body,
	props: {
		version: version,
	}
});

export default mainApp;

// From https://stackoverflow.com/questions/43329654/android-back-button-on-a-progressive-web-application-closes-de-app
window.addEventListener('load', function() {
		window.history.pushState({}, '')
  });

window.addEventListener('popstate', function() {
	window.history.pushState({}, '')
});
