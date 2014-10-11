// Grf full extraction
var EventEmitter = require('events').EventEmitter
var Cluster = require('cluster')
var Os = require('os')
var Fs = require('fs')
var Util = require('util')
var Mkdirp = require('mkdirp')

// Constructor
var Extractor = function Constructor(grf, options) {
	this._progress = 0
	this.grf = grf
	this.concurrency = options.concurrency || 100
	this.output_dir = options.output || ''

	// Start at next tick, give time for event listener to bind
	process.nextTick(extractStart.bind(this))

	return this
}

// Event emmiter
Util.inherits(Extractor, EventEmitter);

// Start the extraction
function extractStart() {
	var numCpus = Os.cpus().length
	var cluster = Cluster
	var grf = this.grf
	var concurrency = this.concurrency
	var extract_folder = this.output_dir
	var self = this

	// The master only spawn workers to work on the GRF
	// And receives progress updates
	if(cluster.isMaster) {
		// Fork some workers
		for(var i = 0; i < numCpus; i++) {
			cluster.fork()
		}

		// Workers online
		var workers = []

		// Separate the entries table into the number of workers
		var entries_slices = [{
			start: 0,
			end: 0,
		}]
		var last = 0
		var chunk_size = Math.floor(grf.entries.length / numCpus)
		
		for(var i = 0; i < numCpus; i++) {
			next = last + chunk_size 

			// If last iteration, set this slice to the rest of the entries array
			if(i == numCpus - 1) {
				next = grf.entries.length
			}

			entries_slices[i] = {
				start: last,
				end: next,
			}

			last = next
		}

		// A worker is online, send it work :)
		cluster.on('online', function(worker) {
			var worker_id = workers.length

			// Send a slice of the entries table to this worker to process
			var slice = entries_slices[ worker_id ]
			worker.send(slice)

			grf.debug("Sending to worker #%d slice %d to %d.", worker_id, slice.start, slice.end)

			// Worker is reporting its progress
			worker.on('message', function(msg) {
				if(msg.cmd == 'progress') {
					self._progress++	
				}
			})

			// Register worker
			workers.push(worker)	
		})
		
		self.emit('start')

		return
	}

	// Else is, worker
	// Wait for the master to send us the go signal 
	process.on('message', function(msg) {
		// Receive a slice to work on
		var entries = grf.entries.slice(msg.start, msg.end)	
		var next = 0
		
		grf.debug("Worker received slice from %d to %d to work on.", msg.start, msg.end)
		grf.debug('Worker extracting', entries.length, 'files.')

		// Launch # concurrent extractors
		for(var i = 0; i < concurrency; i++){
			extract_next()
		}

		function extract_next() {
			if(next >= entries.length) {
				return 
			}

			var i = next++
			var entry = entries[i]

			var exists = grf.getFile(entry.filename, function(data) {
				var buf = new Buffer( new Uint8Array(data) );


				var file = entry.filename.replace( /\\/g, '/') // Replace windows back slash \ to unix forward slash
				var path = extract_folder + file.substring(0, file.lastIndexOf("/")) // Get only path without filename
				var fullpath = extract_folder + file

				Mkdirp(path, function (err) {
					if(err) {
						console.error("Failed to mkdirp", path)
					}

					Fs.writeFile(fullpath, buf, function (err) {
						if (err) {
							console.error(file, 'Failed to write extracted buffer to file')
						}
						else {
							grf.debug(file, 'Extracted.')
						}
					
						// Notify master of progress
						process.send({cmd: 'progress'})
						extract_next()
					})
				})
			})

			if(!exists) {
				extract_next()
				grf.debug(entry.filename, 'not found in grf?')
			}

			return
		}
	})

	// Avoid workers crashing because of excpections
	process.on('uncaughtException', function(err) {
		console.error(err)	
	})
}

// Progress
Extractor.prototype.progress = function progress() {
	return this._progress
}

// Exports
module.exports = Extractor
