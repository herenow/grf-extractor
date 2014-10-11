// Profiler
var cluster = require('cluster')
var agent = require('webkit-devtools-agent');

if(cluster.isMaster) {
	agent.start()
}
else {
	var id = cluster.worker.id + 1
	agent.start({
		port: 9999 + id,
		ipc_port: 3333 + id,
	})
	console.log("Worker #%d inspector on port %d.", id, 9999 + id)
}

require('./index.js')
