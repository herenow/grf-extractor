#!/usr/bin/env node
// Entry point
// Parse arguments and setup the enviroment

// Dependencies
var argv = require('optimist')
var Grf  = require('./lib/grf.js')
var ProgressBar = require('progress')
var Fs = require('fs')

// Setup args
argv.options('g', {
	alias: 'grf',
	describe: 'The grf file to be worked on.',
})
argv.options('s', {
	alias: 'search',
	describe: 'Search a single file on the .grf or a list of files separated by comma. RegExp are supported.',
})
argv.options('l', {
	alias: 'list',
	describe: 'List files inside the grf.',
})
argv.options('o', {
	alias: 'output',
	describe: 'Output directoy to write the extracted files to.',
})
argv.options('e', {
	alias: 'extract',
	describe: 'Extract a single file from the .grf, prints to stdout. Example: grf-extractor -e data/clientinfo.xml > clientinfo.xml',
})
argv.options('c', {
	alias: 'concurrency',
	default: 100,
	describe: 'Concurrency rate, how many parallel extractions should we do, set it to higher values for a faster extraction.',
})
argv.options('v', {
	alias: 'verbose',
	describe: 'Enable verbose output, will print debug messages.',
})
argv.options('h', {
	alias: 'help',
	describe: 'Print help and usage information',
})


// Parse arguments
var arg = argv.argv

// Print help
if(!arg.g || arg.h) {
	console.error("Usage: grf-extractor -g data.grf -o output_dir")
	argv.showHelp()
	return
}

// Init working grf
var fd = Fs.openSync(arg.g, 'r')

var grf = new Grf({
	fd: fd
})

// Set debugging mode
if(typeof arg.d !== 'undefined') {
	grf.printDebug = true
}

// Search and print information about a single file in the grf 
if(typeof arg.s === 'string') {
	var list = arg.s.split(',')

	for(var i in list) {
		var pattern = list[i]

		grf.searchPattern(new RegExp(pattern, 'gi'), function(matches) {
			console.log("Search for %s:", pattern)
			
			if(! matches) {
				console.log("- Nothing found matching this pattern.")
				return
			}

			for(var m in matches) {
				var match = matches[m]

				console.log("- File path: %s - File size: %d kb", match.filename, match.real_size/1000)
			}
		})
	}

	return
}

// List files inside the grf
if(typeof arg.l !== 'undefined') {
	var list = grf.entries

	for(var i in list) {
		var file = list[i]

		console.log("%s - size in bytes: %d", file.filename, file.real_size)
	}

	return
}

// Extract a single file frm the grf
if(typeof arg.e === 'string') {
	var filename = arg.e

	// We need to replace our normal slashes for windows double forward slash
	// Since the .grf filenames are written as so. Example: data\\clientinfo.xl
	filename = filename.replace( /\//g, '\\')

	var exists = grf.getFile(filename, process.stdout.write)

	if(exists === false) {
		console.error("File not in the .grf, don't forget to put the data/ folder in front.'")
		console.error("Example: -e data/clientinfo.xml")
	}

	return
}

// Default action, extract the entire grf
var extraction = grf.extract({
	output: (typeof arg.o !== 'string' ? '' : arg.o),
	concurrency: arg.c,
})

extraction.on('start', function() {
	console.log("Extraction has started on %d files.", grf.entries.length)
	
	// Pretty progress bar extraction on process
	var bar = new ProgressBar('Progress [:current/:total] [:bar] :percent :elapseds - :etas', {
		width: 100,
		total: grf.entries.length
	})
	var timer = setInterval(function () {
		var progress = extraction.progress()
		
		bar.tick(progress)

		if (bar.complete) {
			clearInterval(timer);
		}
	}, 100)
})

extraction.on('error', function(err) {
	console.error("Extraction error", err)
})

// Profiler
if(require('cluster').isMaster) {
	var agent = require('webkit-devtools-agent');
	agent.start()
}
