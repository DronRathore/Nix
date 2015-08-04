var glob = require("glob");
var path = require("path");
var url	 = require("url");
var zlib = require("zlib");
var fs	 = require("fs");
var rang = require("./lib/string");
var crypto = require("crypto");

function Nix(options, callback){
	var async = false, files, compiledWriters = [], saving = false, compilerOptions = {}, doesHash = false, doesGzip = false, manifest, basePath, compilers = [], patterns = [], extensions = [], doneFiles = 0, errorFiles = 0, destination, source;
	
	/*
		@usage: Returns the last extension of file
	*/
	var getExtension = function(path){
		return path.substr(path.lastIndexOf(".") + 1, path.length)
	}

	/*
		@usage: Replaces extension
	*/
	var replaceExtension = function(path, oldExt, newExt){
		return path.replace(oldExt, newExt);
	}

	/*
		@usage: Returns Files from given glob patterns
	*/
	var returnAsArray = function(source){
		var array_source = [];
		if (typeof source == 'string'){
			array_source.push(source)
		} else {
			array_source = source;
		}
		return array_source;
	}

	/*
		@usage: Grab files with given pattern
	*/
	var globFilesFromPatterns = function(source, basePath){
		var _fileList = [];
		var patterns = [];
		patterns = returnAsArray(source)
		patterns.forEach(function(_pattern){
			var _files;
			var files_path = path.resolve(basePath, _pattern);
			if(_files = glob.sync(files_path)){
				_files.forEach(function(_isFile){
					if (fs.statSync(_isFile).isFile()){
						_fileList.push(_isFile)
					}
				})
			}
		})
		return _fileList;
	}
	
	/*
		@usage: Register patterns
	*/
	var registerPatterns = function(_patterns){
		var list;
		if (!_patterns){
			return false;
		}
		if ((list = returnAsArray(_patterns)).length > 0 ){
			patterns = patterns.concat(list)
		}
	}

	/*
		@usage: Register Extensions of files of compilers
	*/
	var registerExtensions = function(_patterns){
		var list;
		if ((list = returnAsArray(_patterns)).length > 0 ){
			extensions = extensions.concat(list)
		}
	}

	/*
		@usage: Validate Compilers config
	*/
	var getCompilerConfig = function(compilers){
		var compilerList = [];
		if (!compilers.length){
			return compilerList;
		}
		compilers.map(function(_compiler){
			if ((!_compiler.patterns && !_compiler.extensions) || !_compiler.compile){
				console.log(String.concat("\t[ ⨯ ]", _compiler.name, "module registration failed").red().white());
			} else {
				compilerList.push(_compiler);
				registerPatterns(_compiler.patterns);
				registerExtensions(_compiler.extensions);
			}
		});
		return compilerList;
	}

	/*
		@usage: To check whether the given pattern or ext matches the compiler
		_pattern: A regex pattern or an extension
		key: pattern || extensions
	*/
	var getPatternMatchingCompilers = function(_pattern, key){
		var _compilers;
		if (key != "patterns" && key != "extensions"){
			return exitNix("NixError: called getPatternMatchingCompilers without any key, report this error")
		}
		/*
			I hate adding multiple if clauses. :-/
			Anyways, never can be a "pattern == extension"
		*/
		if (patterns.indexOf(_pattern) != -1 || extensions.indexOf(_pattern) != -1){
			_compilers = compilers.filter(function(_compiler){
				// there can be compilers with only extension or pattern
				if (!_compiler[key]){
					return false;
				}

				if (_compiler.strict){
					var hasExt = _compiler[key].filter(function(_ext){
						return _ext == _pattern
					})
					if (hasExt.length > 0){
						return true;
					} else {
						return false;
					}
				} else {
					var hasExt = _compiler[key].filter(function(_ext){
						// is this a regex?
						if (_ext.source){
							return _pattern.source == _ext.source
						}
						// no this is just a string
						return (_ext.indexOf(_pattern)!= -1)
					})
					if (hasExt.length > 0){
						return true;
					} else {
						return false;
					}
				}
			})
			if (_compilers.length > 0){
				return _compilers;
			} else {
				return null;
			}
		} else {
			return null;
		}
	}
	/*
		@usage: Returns Patterns
	*/
	var extractPatterns = function(string){
		var matchedPatterns = [];
		patterns.forEach(function(_pattern){
			if (_pattern.test(string)){
				var compilers = getPatternMatchingCompilers(_pattern, "patterns");
				if (compilers)
					matchedPatterns = matchedPatterns.concat(compilers);
			}
		})
		return matchedPatterns;
	}
	/*
		@usage: Helper to be exposed to compilers
	*/
	var nixExecPatterns = function(file, compilers, manifest){
		var patterns = file.extractPatterns(file.content);
		patterns.forEach(function(compiler){
			compiler.compilePattern(file, compilers, manifest);
		})
		return file;
	}
	var nixReturnFileObject = function(file_path, oldFile){
		try{
			var content = fs.readFileSync(file_path)
			var file = {
				nixReturnFileObject : oldFile.nixReturnFileObject,
				nixExecPatterns : oldFile.nixExecPatterns,
				content: content.toString(),
				path: file_path,
				chainPaths: oldFile.chainPaths,
				basePath: oldFile.basePath,
				options: oldFile.options,
				extractPatterns: extractPatterns,
				nixGetFilePath: nixGetFilePath
			};
			return file;
		} catch(e){
			throw new Error(e)
		}
	}
	/*
		@usage: Returns the file path(if exists)
	*/
	var nixGetFilePath = function(_path, options){
		var basePath = path.resolve(options.basePath, _path);
		var current_path = path.resolve(options.current_path, _path);
		
		if (fs.existsSync(basePath) && _path.indexOf("./") == -1){
			return basePath
		} else if (fs.existsSync(current_path)){
			return current_path;
		} else {
			return false;
		}
	}
	var nixEnsureDirectories = function(_path){
		_path = _path.substr(0, _path.lastIndexOf("/"))
		var _paths = _path.split("/");
		var lastPath = "";
		_paths.map(function(path){
			try{
				var stat = fs.statSync(lastPath + path+"/")
				if (stat.isDirectory()){
					lastPath += path+"/";
				}
			} catch(e){
				lastPath += path+"/";
				fs.mkdirSync(lastPath)
			}
		})
	}

	var saveCompiledFiles = function(file){
		if (doesHash){
			var hash = crypto.createHash("md5");
			hash = hash.update(file.content)
			hash = hash.digest('hex');
		}
		var writer = fs.createWriteStream(file.path, "w+");
		writer.write(file.content, function(err, data){
			writer.destroy();
			_processNextFile();
		});
	}
	/*
		@usage: On basis of option, extract manifest
	*/
	var getManifest = function(_manifest){
		if (typeof _manifest == 'string'){
			// we have a path for manifest file
			manifest = require(path.resolve(basePath, _manifest))
		} else {
			// did you just passed the manifest file to me? Kewl!
			manifest = _manifest;
		}
	}

	/*
		@usage: Returns paths from manifest to replace in files
	*/
	var manifestHelper = function(path, file_name){
		if (manifest){
			if (manifest[path]){
				return manifest[path];
			} else {
				console.log(String.concat("\t[ ⨯ ] Can't find", path, "in manifest for", file_name));
				return path;
			}
		} else {
			return path;
		}
	}

	/*
		@usage: A color coded console logger
	*/
	var endLog = function(successCount, errorCount, message){
		message = message? message : "";
		console.log(message.white());
		console.log(String.concat("\t[ ✓ ]", successCount.toString(), "files compiled").white().green());
		console.log(String.concat("\t[ ⨯ ]", errorCount.toString(), "files errored out").white().red());
	}

	/*
		@usage: Todo: Error logger
	*/
	var errorLogger = function(fileInfo){

	}
	/*
		@usage: Logs the critical error and exits
	*/
	var exitNix = function(message){
		console.log(message.red().white());
		endLog(doneFiles, errorFiles, "Exiting Nix")
		return process.exit();	
	}
	/*
		:= Actual Flow Starts from here :=
		Do we have necessary options to continue?
	*/
	if (options){
		if (!options.source && !options.destination, !options.compilers)
			throw new Error("Nix called without passing source, destination and compilers".red().white())
	} else {
		throw new Error("Nix called without any options".red().white())
	}
	/*
		We will take the process.cwd as base if none is provided
	*/	
	basePath = options.basePath? options.basePath: process.cwd();
	destination = options.destination;
	compilerOptions = options.options;
	source = options.source.substr(0, options.source.indexOf("*"));
	/*
		Manifest JSON is required in case you are building a prod build
		or have arbitary paths to load things from
	*/
	manifest = options.manifest? getManifest(options.manifest): null;

	// Ninja Options!
	doesGzip = doesGzip || options.gzip;
	doesHash = doesHash || options.hash;
	async	 = async    || options.async;
	if ((files = globFilesFromPatterns(options.source, basePath)).length === 0){
		return endLog(0, 0, "Black hole passed to me!");
	}

	/*
		Now that we have a file list, we need to build the compilation
		configuration
	*/
	if ((compilers = getCompilerConfig(options.compilers)).length === 0){
		return endLog(0, 0, "cannot compile with the compilers passed to me!".red())
	}
	/*
		So, now we have compilers, files list, lets compile them!
	*/
	if (files.length == 0){
		endLog(0, 0, "Meh.. None of matching file found to compile.. Nix!")
		process.exit()
	}
	/*
		This homey is core of everything!
		It compiles with patterns and compilers
	*/
	var processFile = function(err, data, file){
		var CompiledFile = {
			content: data.toString(),
			path: file,
			destination: destination,
			options: compilerOptions,
			basePath: basePath,
			chainPaths: [file],
			notLogged: true,
			nixGetFilePath: nixGetFilePath
		}
		if(err){
			return console.log("Cannot read file", file, err)
		}
		var ext = getExtension(file);
		var _compilers;
		/*
			Search for compilers for this file by extension
			@strict mode
		*/
		if (_compilers = getPatternMatchingCompilers(ext, "extensions")){
			// First Compile Patterns
			var _patternCompilers;
			_patternCompilers = extractPatterns(CompiledFile.content)
			if (_patternCompilers){
				_patternCompilers.forEach(function(_compiler){
					// I don't wanna take risk
					CompiledFile.extractPatterns = extractPatterns;
					CompiledFile.nixExecPatterns = nixExecPatterns;
					CompiledFile.nixReturnFileObject = nixReturnFileObject;
					if (_compiler.compilePattern){
						console.log(String.concat(_compiler.name).white().green(), String.concat(CompiledFile.path).white())
						_compiler.compilePattern(CompiledFile, _compilers, manifestHelper);
					} else {
						// just warn daug, that the function wasn't there
						console.log(String.concat("Yo daug, where is compilePattern function in your pattern helper?").red().white())
					}
				}) // pattern Compiler dies here!
			}
			/*
				Compile the file with each compiler
			*/
			
			_compilers.forEach(function(_compiler){
				if (CompiledFile.notLogged)
					console.log(String.concat(_compiler.name).white().green(), String.concat(CompiledFile.path).white())
				_compiler.compile(CompiledFile, _compilers, manifestHelper);
			})
			
			/*
				We are done with compilation, lets save the file
			*/
			var _source = path.resolve(basePath, source);
			var _destination = path.resolve(basePath, destination);
			var _fpath = _destination+CompiledFile.path.replace(_source, "");
			nixEnsureDirectories(_fpath);
			CompiledFile.path = _fpath;
			return saveCompiledFiles(CompiledFile);
		} else {
			console.log(String.concat("Skipped", file, "as no matching compiler for", ext, "extensions").red().white())
			_processNextFile()
		}
	}

	var _processNextFile = function(){
		var file = files.shift();
		if (!file)
			return false;
		// this is dead end, no turning back
		// we have to fight the war or die trying!
		try{
			if (async){
				fs.readFile(file, function(err, data){
					return processFile(err, data, file)
				})
			} else {
				var data = fs.readFileSync(file);
				processFile(null, data, file)
			}
		} catch (err){
				console.log(String.concat("Oops, something broke for", file, err.stack).red().white())
		}
	}


	_processNextFile();
	//console.log("Saving Compiled File, hold on!".green().white())
}
module.exports = Nix;