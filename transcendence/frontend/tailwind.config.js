/** @type {import('tailwindcss').Config} */

export default {
	content: [
		"./index.html",
		"./src/**/*.{ts,tsx,js,jsx,html}"
	],
	theme: {
		extend: {},
		screens: {
			sm: "640px",
			md: "768px",
			lg: "1024px",
			xl: "1280px",
			"2xl": "1536px",	// Starting with digit char occurs error in JS, so attach double quotes.
		},
		container: {
			center: true,
			padding: {
				DEFAULT: "1rem",
				sm: "1.5rem",
				lg: "2rem",		// xl, 2xl accept same option.
			},
		},
	},
	plugins: [],
}