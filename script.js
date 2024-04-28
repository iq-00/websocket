// alert("ok")

let url = "ws://localhost"

let socket = new WebSocket(url);

console.log(socket.readyState);
socket.addEventListener("error", ev => {
    console.log(ev);
})

socket.onopen = ev => {
    console.log("openend", ev);
    socket.send("abcde");
}

socket.onmessage = ev => {
    console.log(ev);
}

socket.addEventListener("close", ev => {
    console.log("closed ", ev);
})
