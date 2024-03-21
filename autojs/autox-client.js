importPackage(Packages["okhttp3"]);

console.show();

const host = "192.168.0.100";
const port = 8765;
var isConnected = false;
var reconnectInterval = 1000;
var ws;

function serializable(data) {
    for (let key of Object.keys(data)) {
        if (typeof data[key] == "function") {
            data[key] = data[key].toString();
        } else if (typeof data[key] == "object") {
            data[key] = serializable(data[key]);
        }
    }
    return data;
}

function startWebSocketClient(url) {
    const client = new OkHttpClient();
    const request = new Request.Builder().url(url).build();
    client.dispatcher().cancelAll();
    return client.newWebSocket(request, new WebSocketListener({
        onOpen: function (webSocket, response) {
            console.log("onOpen", webSocket, response);
            ws = webSocket;
            isConnected = true;
        },
        onMessage: function (webSocket, data) {
            console.log("receive data: " + data);
            try {
                packet = JSON.parse(data);
                if (packet.type === "cmd") {
                    try {
                        with (globalThis) {
                            if (packet.data === "") {
                                data = "";
                            } else {
                                value = eval(packet.data);
                                console.log(value, typeof value);
                                if (typeof value == "object") {
                                    if (value == null) {
                                        data = value;
                                    } else {
                                        try {
                                            data = serializable(value);
                                        } catch (e) {
                                            errorMessage = e.toString();
                                            if (errorMessage.indexOf('InternalError: Java method "getClass" cannot be assigned to.') !== -1) {
                                                data = value.toString();
                                            } else {
                                                data = value;
                                            }
                                        }
                                    }
                                } else if (typeof value == "string") {
                                    data = value;
                                } else if (typeof value == "number") {
                                    if (isNaN(value)) {
                                        data = "NaN";
                                    } else if (value === Infinity) {
                                        data = "Infinity";
                                    } else if (value === -Infinity) {
                                        data = "-Infinity";
                                    } else {
                                        data = value;
                                    }
                                } else if (typeof value == "boolean") {
                                    data = value;
                                } else if (typeof value == "function") {
                                    try {
                                        data = value.toString().trim();
                                    } catch (e) {
                                        data = value;
                                    }
                                } else if (typeof value == "undefined") {
                                    data = "undefined";
                                } else if (typeof value == "bigint") {
                                    data = value;
                                } else if (typeof value == "symbol") {
                                    data = value.toString();
                                } else {
                                    data = value;
                                }
                            }
                        }
                        data = JSON.stringify({
                            "id": packet.id,
                            "type": "result",
                            "data": data
                        });
                    } catch (e) {
                        data = JSON.stringify({
                            "id": packet.id,
                            "type": "error",
                            "data": e.toString()
                        });
                    }
                } else {
                    throw new Error("Not support argument type:" + packet.type);
                }
            } catch (e) {
                data = JSON.stringify({
                    "id": packet.id,
                    "type": "error",
                    "data": e.toString()
                });
            } finally {
                console.log("send data: " + data);
                webSocket.send(data);
            }
        },
        onClosed: function (webSocket, code, reason) {
            console.log("onClosed", webSocket, code, reason);
            isConnected = false;
        },
        onFailure: function (webSocket, throwable, response) {
            console.log("onFailure", webSocket, throwable, response);
            isConnected = false;
        },
    }));
}

setInterval(() => {
    try {
        if (!isConnected) {
            console.info("Waiting for the Autojs server " + host + ":" + port + " to issue command...");
            ws = startWebSocketClient("ws://" + host + ":" + port + "/");
        }
    } catch (e) {
        console.log(e);
    }
}, reconnectInterval);

events.on("exit", function () {
    ws.close(1001, "closed");
    console.log("autojs client exit.");
    console.hide();
})
