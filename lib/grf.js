// This librarie extends default roBrowser software
// It extends roBrowser default GRF loader
// Giving it a set a new set of API's and replacing some performance critical functions
var Grf = module.exports = require('./Loaders/GameFile.js')
var Extractor = require('./extractor')

// Should we print debug messages?
Grf.prototype.printDebug = false

// Search for a pattern on the .grf file
// @param regexp: A regular expression instance
Grf.prototype.searchPattern = function search(regexp, callback) {
	var matches = []

	for(var i in this.entries) {
		var entry = this.entries[i]
		var filename = entry.filename

		if(regexp.test(filename)) {
			matches.push(entry)
		}
	}

	callback(matches)
}

// Extract all files from the .grf to a folder
// @param options {
// 		output: output directory
// 		concurrency: concurrency rate
// }
Grf.prototype.extract = function(options) {
	return new Extractor(this, options)
}

// Print a debug message if verbosity is set
Grf.prototype.debug = function debug() {
	if(this.printDebug) {
		console.log.apply(this, arguments)
	}
}
