/*
	We Love colored Strings!
*/

String.prototype.white = function(){
	return "\x1B[1m" + this.toString() + "\x1B[22m";
}
String.prototype.red = function(){
	return "\x1B[31m" + this.toString() + "\x1B[39m";
}
String.prototype.blue = function(){
	return "\x1B[36m" + this.toString() + "\x1B[39m";
}
String.prototype.green = function(){
	return "\x1B[32m\x1B[1m" + this.toString() + "\x1B[22m\x1B[39m";
}
String.concat = function(){
	var string = "";
	for (arg in arguments){
		string += (arguments[arg] + "").toString() + " ";
	}
	return string.trimRight()
}