import App from "./App.svelte";
import { version } from '../package.json';

const mainApp = new App({
	target: document.body,
	props: {
		version: version,
	}
});

export default mainApp;
