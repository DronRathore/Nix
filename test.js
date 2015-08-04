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
	compilers: [nixLess, nixStylus]
})
