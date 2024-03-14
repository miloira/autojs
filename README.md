`autojs`
===============================================
The RPC framework of autojs allows you to use Python to operate phone.

Usage
-----


1.Download and install [AutoX.js](https://github.com/kkevsekk1/AutoX/releases)

2.Add autox-client.js to AutoX.js app, then run this script

3.Install autojs

```bash
$ pip install autojs
```

script mode
```python
from autojs import AutoJS

with AutoJS() as auto_js:
    auto_js.app.launchApp('微信')
    auto_js.eval('console.log("Hello AutoX.js")')
```

shell mode
```python
from autojs import AutoJS

with AutoJS() as auto_js:
    auto_js.shell()
```

Documentation
-------------

AutoX.js API documentation at `<http://doc.autoxjs.com>`.

Meta
----


Distributed under the MIT license. See `LICENSE <https://github.com/miloira/autojs/LICENSE>` for more information.

https://github.com/miloira/autojs