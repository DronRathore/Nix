var Nix = require("./nix")
var path = require("path")
var nixLess = require("./lib/nix-less")
var nixStylus = require("./lib/nix-stylus")

Nix({
	source : "./assets/**/*.less", 
	destination:"./public/website",
	options: {
		base: "assets/stylesheets/",
		paths: [path.resolve("./assets/stylesheets")]
	},
	hash: true,
	gzip: true,
	gzipOriginal: false,
	manifest: "./manifest.json",
	cdnBase: "https://assets-0.housingcdn.com/bucket/public/website",
	compilers: [nixLess, nixStylus]
})
