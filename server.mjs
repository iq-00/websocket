import { createFrame, generateAcceptValue, parseFrame } from "./ws.mjs"
import http from "http"
import fs from "fs"


let server = http.createServer();
server.on("request", (req, res) => {
    console.log(req.url);
    if (req.url == "/") {
        fs.readFile("./index.html", (err, dat) => res.end(dat))
    }
    else if (req.url == "/css") {
        fs.readFile("./style.css", (err, dat) => res.end(dat))
    }
    else if (req.url == "/js") {
        fs.readFile("./script.js", (err, dat) => res.end(dat))
    }
})

let users = []
server.on("upgrade", (req, socket, head) => {

    const acceptKey = req.headers['sec-websocket-key'];
    const hash = generateAcceptValue(acceptKey);

    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Connection: Upgrade',
        'Upgrade: WebSocket',
        `Sec-WebSocket-Accept: ${hash}`
    ];

    users.push(socket)
    socket.write(responseHeaders.concat('\r\n').join('\r\n'));


    socket.on('data', buffer => {
        const message = parseFrame(buffer);
        console.log(message);
        socket.write(createFrame("server"));
    });

    socket.on("close", ev => {
        console.log("close", ev);
    })

})

server.listen(80, () => {
    console.log("on default port");
})


