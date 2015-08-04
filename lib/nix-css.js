/*
	nixCSSHelper
	All helper regex's that can be shared
	between different CSS preprocessors
*/


/*
	@usage: Returns the extension of the file
*/
function nixReturnExt(filePath){
	return filePath.substr(filePath.lastIndexOf(".")+1, filePath.length);
}
/*
	@usage: Read an image file and inline it
*/
function nixReadFile(file_name, file){
	var _file, _path = file.basePath;
	if (file.options.img_base){
		_path = path.resolve(_path, file.options.img_base)
	}
	// Let's read the file
	try{
		_file = fs.readFileSync(path);
		_file = new Buffer(file).toString('base64');
		return "data:image/" + nixReturnExt(path) + ";base64," + _file;
	} catch(e){
		console.log(String.concat("◕ less-compile").white().red(), String.concat("Cannot find ", file_name, "using path = ", _path).white().red());
		return false;
	}
}
/*
	@usage: Compile the string against pipeline regex's
*/
function nixCSSHelper (file, compilers, manifest) {
var img_base = file.options.img_base? file.options.img_base: "";
	var font_base = file.options.font_base? file.options.font_base: "";
	var css_base = file.options.base? file.options.base : file.basePath;
	file.content = file.content
					// Image URL helper, easiest way to inject things
					.replace(/(?:image\-url)(?:\()(?:[\'|\"]*)([\S]+)(?:[\'|\"]*)(?:\))/igm,
						function(a, image_url, c, d){
							var asset = manifest(image_url.replace(/[\'\"]/g, ""));
							if (asset){
								return "url("+ asset +")";
							} else {
								return "url(" + img_base + image_url + ")";
							}
					})
					// Font URLs helper
					.replace(/(?:font\-url\()(\S+)(\))|(?:font\-url\()(\S+)(\))/igm,
						function(a, url, c, d, maybe_a_url){
							var index, asset;
							if (url || maybe_a_url){
								url = url ? url : maybe_a_url;
								url = url.replace(/([\'|\"])/ig, "")
								if ((index = url.indexOf("?#")) != -1){
									url = url.substr(0, index)
									asset = manifest(url)
									asset += "?#iefix"
								} else {
									asset = manifest(url)
								}
								return "url('"+ font_base + asset + "')";
							}
					})
					// base64 Encoded Inline Image Data
					.replace(/(?:asset\-data\-url\()(\S+)(\)(\;))|(?:asset\-data\-url\()(\S+)(\))/igm,
						function(a, url, c, d, maybe_a_url){
						if (url || maybe_a_url){
							url = url ? url : maybe_a_url;
							url = url.replace(/([\'|\"])/ig, "")
							return "url("+nixReadFile(url, file)+")";
						}
					});
	return file;
}
module.exports = nixCSSHelper;