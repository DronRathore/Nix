/*
	Nix-Less/ Nix-CSS
*/

var less	= require("less");
var path	= require("path");
var fs		= require("fs");
var nixName	= "less-compiler";
var nixExtensions	= ["less", "css"];
var nixPatterns		= [/@less-import/gmi];
var nixCssHelper	= require("./nix-css");
/*
	@usage: See if the file was already in the chain
*/
function nixNotInChain(file, file_path){
	return !(file.path == file_path);
}
function extendObject(obj, _obj){
	(Object.keys(obj)).map(function(key){
		_obj[key] = obj[key]
	})
	return _obj;
}
/*
	Main Compiler
*/
function nixCompile(file, compilers, manifest, _forPattern){
	// Call Css helper and get helper functions replaced
	file = nixCssHelper(file, compilers, manifest);
	if (_forPattern)
		console.log(String.concat("◕ less-import").white().green(), String.concat(file.path).white())
	// Sync Compilation of less
	var options = extendObject(file.options, {isSync: true});

	less.render(file.content, options, function(err, results){
		if (err){
			console.log(String.concat("less-error : ", file.path).red().white(), err);
			process.exit(-1);
		}
		file.content = results.css;
	})
	file.path = file.path.replace(".less", ".css")
	return file;
}

/*
	Pattern Compiler
*/
function nixCompilePattern(file, compilers, manifest){
	file.content = file.content.replace(/(@less-import)(\s+)([\'\"]*)(\S+)([\'\"]*)/gmi, function(a, b, c, d, file_url){
		var filePath, current_path, _path, basePath, chainFile, compiled;
		_path = path.parse(file.path);
		current_path = _path.dir;
		// We will be having a relative path or a path from css_base
		basePath = file.options.base? file.options.base: file.options.basePath;
		var options = {
			basePath: basePath,
			current_path: current_path
		}
		file_url = file_url.indexOf(".less") == -1 && file_url.indexOf(".css") == -1?file_url + ".less": file_url;
		if ( filePath = file.nixGetFilePath(file_url, options)){
			if (!nixNotInChain(file, filePath)){
				console.log(String.concat("\t[-] less-skipped : warning", filePath, "is a cyclic dependency, this will lead to infinte compile cycle").red().white())
				return "";
			}
			/*
				Add dependency to file chain, so that we can warn
			*/
			file.chainPaths.push(filePath)
			// Past this we will now compile this dependency
			chainFile = file.nixReturnFileObject(filePath, file)
			// First Compile By RegEx this dependency
			compiled = chainFile.nixExecPatterns(chainFile, compilers, manifest);
			// Now run our Compiler
			compiled = nixCompile(compiled, compilers, manifest, true)
			delete chainFile;
			console.log(String.concat("\t[+] Dep ", file.path.substr(file.path.lastIndexOf("/"), file.path.length),":=>", filePath).blue().white())
			return compiled.content;
		} else {
			// File not available
			console.log(String.concat("◕ less-import", "Can't find file", file_url, "in", current_path).red().white())
			process.exit(-1);
		}
	})
	file.notLogged = false;
	return file;
}


module.exports = {
	name: nixName,
	patterns: nixPatterns,
	extensions: nixExtensions,
	compilePattern: nixCompilePattern,
	compile: nixCompile
}