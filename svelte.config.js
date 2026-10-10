import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: '404.html' // Pure SPA fallback
		}),
		paths: {
			// On GitHub Pages, your site will be hosted at /retrograde/
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH || '/retrograde'
		}
	}
};

export default config;