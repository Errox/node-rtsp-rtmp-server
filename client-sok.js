
const
    io = require("socket.io-client"),
    ioClient = io.connect("http://145.49.6.193:3000");


    ioClient.emit("megafaggot");
    
    ioClient.on("json", (msg) => console.info(msg));
