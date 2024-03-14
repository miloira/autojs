importPackage(Packages["okhttp3"]); //导入包

function getFunctionName(func) {
    const funcStr = func.toString();
    const matches = funcStr.match(/function\s+([^\s(]+)/);
    return matches ? matches[1] : 'anonymous';
  }

function serializable(data) {
    if(data === undefined) {
        return null;
    }
    for(let key of Object.keys(data)) {
        if (typeof data[key] == "function") {
            data[key] = getFunctionName(data[key]);
        }
    }
    return data;
}

function startWebSocketClient(url) {
    var client = new OkHttpClient();
    var request = new Request.Builder().url(url).build();
    client.dispatcher().cancelAll();
    myListener = {
        onOpen: function (webSocket, response) {
            ws = webSocket;
            is_connected = true;
        },
        onMessage: function (webSocket, data) {
            console.log("receive data: " + data);
            try {
                packet = JSON.parse(data);
                if (packet.type === "cmd") {
                    try {

                        with (globalThis) {
                            if (packet.data === "") {
                                value = "";
                                data = "";
                            }else {
                                value = eval(packet.data)
                            }
                        }

                        if (value && typeof value == "object") {
                            //对象
                            data = serializable(value);
                        } else if (value && typeof value == "function") {
                            //函数
                            data = value.toString();
                        } else if(typeof value == "string") {
                            //字符串
                            data = value;
                        } else if(typeof value == "boolean"){
                            //布尔
                            data = value;
                        } else if (value == null) {
                            //null
                            data = value;
                        } else if (value === undefined) {
                            //undefined
                            data = "undefined";
                        } else {
                            //未知类型
                            data = value;
                        }
                        data = JSON.stringify({
                            "id": packet.id,
                            "type": "result",
                            "data": data
                        });
                    } catch(e) {
                        data = JSON.stringify({
                            "id": packet.id,
                            "type": "error",
                            "data": e.toString()
                        });
                    }
                } else {
                    throw Error("Not support argument type:" + packet.type)
                }
            } catch(e) {
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
            console.log(webSocket, code, reason)
           is_connected = false;
        },
        onFailure: function (webSocket, throwable, response) {
            console.log(webSocket, throwable, response)
            is_connected = false;
        },
    };

    return client.newWebSocket(request, new WebSocketListener(myListener));
}

console.show();

//服务器配置
const host = "101.37.172.239";
const port = 8765;
var ws;
var is_connected = false;

setInterval(() => {
    try{
        if(!is_connected) {
            console.info("Waiting for the robot server " + host + ":" + port + " to issue command...")
            ws = startWebSocketClient("ws://" + host + ":" + port + "/");
        }
    } catch(e) {
        console.log(e)
    }
}, 1000); //防止主线程退出


events.on("exit", function (){
    ws.close(1001, "closed");
    console.log("客户端已退出！")
})