//Lets require/import the HTTP module
var http = require('http');
var url = require('url')
var exec = require('child_process');

//Lets define a port we want to listen to
const PORT = 8080;

//We need a function which handles requests and send response
function handleRequest(request, response) {
    console.log("Boom! request.url = " + request.url);
    var query = url.parse(request.url, true).query;
    console.log("url query = " + query.username);

    var cmd = "./say-to-file.sh \"Hello, " + query.username + ", You\'re the best!\" " + query.username;

    console.log("cmd = " + cmd);

    exec.exec(cmd, function(error, stdout, stderr) {
        console.log("error = " + error);
        console.log("stdout = " + stdout);
        console.log("stderr = " + stderr);
        console.log("greeting audio generated for username = " + query.username);
        response.end("");
    });
}

// Create a server
var server = http.createServer(handleRequest);
server.listen(PORT, function () {
    console.log("Server listening on: http://localhost:%s", PORT);
});
