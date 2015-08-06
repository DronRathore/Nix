# Nix
Better asset compiling for NodeJS

*Note: Nix is in beta, I am working on cleaning the code and adding more robust ways to add more tasks.*

However feature requests are always welcome, feel free to add all the pains you face during production deployment for your app and I will make sure Nix solves all of it for you.

## What is Nix?
From quite a long I was looking for a asset-pipelining similar to Rails in Node(for almost a year) but didn't found any better tool for the same. Recently we at [Housing](https://housing.com) migrated our Front End Application server to NodeJS, so was the build process, I wrote the build process from scratch, copied all gulp tasks from github and then modified them to make them use the asset pipelining helper functions, as our build gets extensive we need to have a better, exntensive and robust build pipeline process, hence Nix!

## Why Nix?

Assume a file ```my-stylus.styl```
```stylus
// This is a stylus file
@less-import stylesheets/my-less
body
  height 90px
  background image-url(/images/home_page/cover.jpg)
```

And a file ```stylesheets/my-less.less```

```less
.this-class-was-in-less-file{
  background: image-url(images/service_page/sprite.png);
}
@stylus-import some_path_to_stylus
```

The above code gets compiled into something like this
```css
/* This is a stylus file */
.this-class-was-in-less-file{
  background: url(https://cdn.myhost.com/images/sprite-e419975c7b61c9027b9f2f13219e774a.png);
}
.this-class-was-in-stylus-imported-in-less{
  content: 'blah!'
}
body{
  height: 90px;
  background: url(https://cdn.myhost.com/images/cover-4a82d4eb1c8a3c3ecd56264d8e1d6116.jpg);
}
```
#####How cool is dat? No?
Okay what about this then?

```coffeescript
# backbone/map_view.coffee
  define [
    "backbone/helpers/maps"
  ], (Maps)->
    map_icon = <%= asset_url(/images/cover.jpg) %>
    <% if (NODE_ENV == "production"){ %>
      debug = false
    <% } %>
    show_map_icon
```
Above code gets compiled into something like this

```javascript
define(["backbone/helpers/maps"], function(Maps) {
  var map_icon, debug;
  map_icon = "https://cdn.myhost.com/images/cover-4a82d4eb1c8a3c3ecd56264d8e1d6116.jpg";
  debug = false;
  return show_map_icon;
});
```
Basically compile things within anything and so on.

##What Nix can compile?

- Less
- Stylus
- CSS

##Nix Options

```javascript
/**
 * @param {[object]}
 * @param {Function}
 * Options: 
 *  source: path to source directory
 *  destination: destination where to save
 *  compilers: [Array] nixCompilers
 *  options: {object} to be passed to compilers
 *  hash: boolean
 *  gzip: boolean
 *  async: boolean to compile files in async
 *  cdnBase: String to be used as prefixed in manifest and paths
 *  gzipOriginal: boolean Whether to gzip original file or create
 *                a .gz file
 *  
 * Callback: Function(optional)
 */
function Nix(options, callback){ ... }
```

## CSS Helpers

- image-url()
- font-url()
- asset-data-url() ```// return base64 encoded file content```


##What Nix will compile?
- Coffee*
- JS*
- RJS Optimise*
- Jade/Hamlc/EJS
- React

```* = Done will be pushed in a while```

## What more Nix can do? [1]
- Generate Manifest for you
- gzip the assets and save them in place
- It has extensive helpers, which can be limitless

```[1]: Wait for my next push```
## Ok, How does it work?
Basically every Nix task provides 2 major inputs while registering itself i.e. extension, compilePatterns
- Extension: These are used to pass the files matching the extension to the compiler
- compilePatterns: These are regex patterns that need to be looked inside the files before compiling them

### Executing Nix Task

```javascript
var Nix = require("./nix")
var nixLess = require("./lib/nix-less")
var nixStylus = require("./lib/nix-stylus")

Nix({
	source : "./assets/**/*.less", 
	destination:"./public/website",
	options: {
		base: .. relative path for resolving pattern imports ..,
		paths: .. required by less@import ..,
		manifest: .. path to manifest file ..
		.. further options that you want to pass to compilers ...
	},
	compilers: [nixLess, nixStylus]
})

```

### Writing a Nix Task
```javascript
var nixName	= "stylus-compiler";
var nixExtensions	= ["styl", "css"]; // patterns for which it is a core compiler
var nixPatterns		= [/@stylus-import/gmi, /@styl-import/gmi]; // patterns to look for in files

function nixCompile(file, compilers, manifest){
  // main compiler
}
function nixCompilePattern(file, compilers, manifest){
  // this function will be evoked whenever any of the nixPatterns will match in a file
  // so you can handle a complete regex pattern here
  file.content = file.content.replace(/(@stylus-import)(\s+)([\'\"]*)(\S+)([\'\"]*)/gmi, function(){
    // manipulate the values with use of extension functions provided by nix
  });
}
module.exports = {
  name: nixName,
	patterns: nixPatterns,
	extensions: nixExtensions,
	compilePattern: nixCompilePattern,
	compile: nixCompile
}
```
