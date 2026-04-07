#!/usr/bin/node
const morgan = require('morgan')
const express = require('express')
const { Worker, isMainThread, postMessage, workerData } = require('worker_threads');

const app = express()
const port = 41783
app.use(morgan('tiny'))

function runWorker(path,cb,eh) {
    let w = new Worker(path, {workerData: cb});
    w.on('message', (msg) => {
        eh(null, msg)
    })
    w.on('error', eh);
    w.on('exit', (code) => {
        if(code != 0)
            console.error(new Error(`Worker stopped with exit code ${code}`))
    });
    return w;
}

app.get('/', (req, res) => {
    let cb = req.get('CPEE-CALLBACK');

    // start thread here
    console.log('hello students');

    let myWorker = runWorker(__dirname + '/workerCode.js', cb, (err, result) => {
        if(err) return console.error(err);
        console.log("[[Heavy computation function finished]]")
        console.log("First value is: ", result.val);
        console.log("Took: ", (result.timeDiff / 1000), " seconds");
    })

    res.set('content-type', 'application/json')
    res.set('CPEE-CALLBACK', 'true')
    res.send({"name": req.query.a, "student": "is excellent and in love with javascript"})
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})