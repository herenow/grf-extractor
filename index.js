// Entry point
// Parse arguments and setup the enviroment
var GameFile = require('./lib/Loaders/GameFile.js')
var fs       = require('fs')
var mkdirp = require('mkdirp')

var extract_folder = './extract/'

var file = {}
file.fd = fs.openSync('./data.grf', 'r')
var grf = new GameFile(file)

var stack_max = 100
var stack_size = 0
var index = 0

console.log('Extracting', grf.entries.length, 'files.')

// Launch extractors
while(stack_size < stack_max) {
	stack_size++
	extract_next()
}

function extract_next() {
	if(index > grf.entries.length) {
		console.log('asd')
		return
	}

	var i = index++

	var entry = grf.entries[i]

	var exists = grf.getFile(entry.filename, function(data) {
		/*
		var len = data.byteLength
		var buf = new Buffer(len)

		for(var i = 0; i < len; i++) {
			buf[i] = data[i]
		}
		*/
		var buf = new Buffer( new Uint8Array(data) );

		var file = entry.filename.replace( /\\/g, '/'); // Replace \\ to /
		var path = extract_folder + file.substring(0, file.lastIndexOf("/")); // Get only path without filename
		var fullpath = extract_folder + file

		mkdirp(path, function (err) {
			if(err) {
				console.log("Failed to mkdirp", path)
				extract_next()
				return
			}

			fs.writeFile(fullpath, buf, function (err) {
				extract_next()
				if (err) {
					console.log(file, 'Failed to write extracted buffer to file')
					return
				}
				console.log(file, 'extracted!');
			});
		});
	})

	if(!exists) {
		extract_next()
		console.log(entry.filename, 'not found in grf?')
	}
}

process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});
