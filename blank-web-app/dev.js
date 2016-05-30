/**
 * Created by kib357 on 03/12/15.
 */

var fs = require("fs");
var path = require("path");
var less = require("less");
var chokidar = require("chokidar");
var webpack = require("webpack");
var express = require("express");
var app = express();
var httpProxy = require("http-proxy");
var proxy = httpProxy.createProxyServer();
var serveStatic = require("serve-static");
var WebSocketServer = require("ws").Server;
var minimist = require("minimist");
var wpConfig = require("./webpack.config");
let argv = minimist(process.argv.slice(2));
let blankUri = argv._[0] || "http://localhost:8080/";
let assetsPath = argv.assets || argv.a;
wpConfig.entry = "./src/js/dev.js";
wpConfig.devtool = "inline-source-map";
wpConfig.output = {
    path: "./dist",
    filename: "bundle.js",
    publicPath: "/js/",
};
wpConfig.plugins = [
    new webpack.DefinePlugin({
        "process.env": {
            "WS": JSON.stringify(blankUri ? blankUri.replace("http", "ws") : ""),
        },
    }),
];

app.use("/js", serveStatic(__dirname + "/dist"));
if (assetsPath) {
    app.use("/assets", serveStatic(path.resolve(assetsPath)));
}
app.use("/app.css", function (req, res) {
    res.sendFile(path.resolve("./dist/app.css"));
});
app.use("/", function (req, res) {
    console.log("Proxy", req.url);
    proxy.web(req, res, { target: blankUri });
});
var server = app.listen(8888);
var wss = new WebSocketServer({ server: server });

var noReloadOnAssets;
var compiler = webpack(wpConfig);
var reloadClient = function (noBuildOnstart) {
    noReloadOnAssets = noBuildOnstart;
    if (wss != null) {
        if (!noReloadOnAssets) {
            wss.clients.forEach(function each(client) {
                client.send("Please update");
            });
        }
    }
};

var onWebpackEvent = function (err, stats) {
    console.log("Assets builded. Time: ", (stats.endTime - stats.startTime), "ms");
    if (err != null) {
        console.log(err);
    } else {
        reloadClient(noReloadOnAssets);
    }
    noReloadOnAssets = false;
};

compiler.watch({ // watch options:
    aggregateTimeout: 300, // wait so long for more changes
    //poll: true // use polling instead of native watchers
    // pass a number to set the polling interval
}, onWebpackEvent);

//LESS
function renderLess(cb) {
    less.render(fs.readFileSync("./src/css/app.less", "UTF8"), { "filename": "./src/css/app.less" }, function (error, output) {
        console.log("less rendered. Error: ", error);
        fs.writeFileSync("./dist/app.css", output.css, "UTF8");
        if (typeof cb === "function") {
            cb();
        }
    });
}
var lessWatcher = chokidar.watch("./src/css/", {
    persistent: true,
    ignoreInitial: true,
});
lessWatcher.on("change", function (path, stats) {
    renderLess(function () {
        reloadClient();
    });
});
renderLess();

module.exports = reloadClient;