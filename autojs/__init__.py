import os
import sys
import json
import uuid

import threading

import readline
from loguru import logger
from websockets.sync.server import serve

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def get_script(filename):
    with open(os.path.join(BASE_DIR, filename), "r", encoding="utf-8") as f:
        code = f.read()
    return code


def get_autox_js_client_script():
    return get_script("autox-client.js")


class AutoJS:

    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.code = ""
        self.EXIT_CMD = ["\q", "quit"]
        self.logger = self.set_logger(
            logger,
            sink=sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <level>{message}</level>",
            level="INFO"
        )
        self.event = threading.Event()
        self.is_running = False

    def set_logger(self, logger, *args, **kwargs):
        logger.remove()
        logger.add(*args, **kwargs)
        return logger

    def send(self, data):
        try:
            data = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            try:
                self.connection.send(data)
            except Exception as e:
                self.remote_host = None
                self.remote_port = None
                raise e
            self.logger.debug(f"send: {data}")
            result = self.connection.recv()
            self.logger.debug(f"receive: {result}")
            return json.loads(result)["data"]
        except Exception as exc:
            self.logger.error(exc)

    def eval(self, code):
        self.code = ""
        return self.send({
            "id": str(uuid.uuid4()),
            "type": "cmd",
            "data": code
        })

    def call(self):
        return self.eval(self.code)

    def handler(self, connection):
        self.connection = connection
        self.remote_host, self.remote_port = self.connection.remote_address
        logger.info("Client(host=\"%s\", port=%s) connected." % (self.remote_host, self.remote_port))
        self.event.set()

        while self.is_running:
            pass

        connection.close_socket()

    def run(self):
        self.logger.info(f"Starting Autojs Server at {self.host}:{self.port}")
        self.server = serve(self.handler, self.host, self.port)
        self.server.serve_forever()

    def start(self):
        self.is_running = True
        self.websocket_server_thread = threading.Thread(target=self.run)
        self.websocket_server_thread.daemon = True
        self.websocket_server_thread.start()
        self.event.wait()

    def stop(self):
        self.is_running = False
        self.server.shutdown()

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

    def __getattr__(self, item):
        if self.code == "":
            self.code += item
        else:
            self.code += "." + item
        return self

    def __call__(self, *args, **kwargs):
        arguments = json.dumps(args, ensure_ascii=False, separators=(",", ":"))[1:-1]
        self.code += f"({arguments})"
        return self

    def shell(self):
        if not self.is_running:
            raise Exception("Can't use shell when server is not running.")

        while True:
            if self.remote_host is None and self.remote_port is None:
                input(f"> ")
                if self.remote_host is not None and self.port is not None:
                    code = input(f"({self.remote_host}:{self.remote_port})> ")
                    if code in self.EXIT_CMD:
                        break
                    result = self.eval(code)
                    if result == "":
                        print(result, end="")
                    else:
                        print(result)
                else:
                    print("No available client.")
            else:
                code = input(f"({self.remote_host}:{self.remote_port})> ")
                if code in self.EXIT_CMD:
                    break
                result = self.eval(code)
                if result == "":
                    print(result, end="")
                else:
                    print(result)
