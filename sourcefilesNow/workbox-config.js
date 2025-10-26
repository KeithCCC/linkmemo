module.exports = {
	globDirectory: 'src/',
	globPatterns: [
		'**/*.{css,jsx,js}'
	],
	swDest: 'src/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};