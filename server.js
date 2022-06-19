var connect = require('connect');
var serveStatic = require('serve-static');
var http = require('http'),
    fs = require('fs');


fs.readFile('./lab2/index.html', function (err, html) {
    if (err) {
        throw err;
    }
    http.createServer(function(request, response) {
        if (request.url === '/') {
            response.writeHeader(200, {"Content-Type": "text/html"});
            response.write(html);
            response.end();
        }
        if (request.url === '/shader.gpu') {
            response.write(fs.readFileSync('./lab2/shader.gpu'));
            response.end();
        }
        if (request.url === '/main.js') {
            response.write(fs.readFileSync('./lab2/main.js'));
            response.end();
        }
        if (request.url === '/Utils/trackball-rotator.js') {
            response.write(fs.readFileSync('./lab2//Utils/trackball-rotator.js'));
            response.end();
        }

    }).listen(process.env.PORT || 8080);
});
