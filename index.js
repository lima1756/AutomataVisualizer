const express = require("express");
const fs = require("fs");
const multer = require('multer');
const cors = require('cors');
const Node = require("./Node");
const Edge = require("./Edge");

var app = express();
app.use(cors());
app.options('*', cors());

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname + '-' + Date.now())
    }
  })
   
var upload = multer({ storage: storage }).single('file');

app.get('/', function (req, res, next) {
    res.send('hola');
});

app.post('/', upload, function (req, res, next) {
    const file = req.file;
    const readFile = fs.readFileSync(req.file.path);
    if(!file){
        const err = new Error("no file");
        err.httpStatusCode = 400;
        return next(err);
    }
    const content = readFile.toString().replace('\r','');
    const lines = content.split('\n');
    const transitions = lines[0].split(',');
    const parallelCounters = {}
    let nodes = Array();
    let edges = Array();
    for(let i = 1; i < lines.length; i++){
        let values = lines[i].split(',');
        for(let j = 0; j < values.length; j++){
            let index = 0;
            if (j == 0)
            {
                let start = false;
                let end = false;
                if (values[j].length > 0)
                {
                    start = values[j][0] == '>' || (values[j].Length > 1 && values[j][1] == '>');
                    end = values[j][0] == '*'|| (values[j].Length > 1 && values[j][1] == '*');
                    if(start)
                        index++;
                    if(end)
                        index++;
                }
                nodes.push(new Node(i,start,end));
            }
            let pointers = values[j].substr(index).trim().split('|');
            for(let k = 0; k < pointers.length; k++)
            {
                if(parallelCounters[parallelKey(i, pointers[k])]!=undefined){
                    parallelCounters[parallelKey(i, pointers[k])]++;
                }
                else{
                    parallelCounters[parallelKey(i, pointers[k])]=0;
                }
                // TODO: add Edge count to parallel edges
                if (pointers[k].length > 0)
                {
                    edges.push(new Edge(Math.random(), i, pointers[k], transitions[j], parallelCounters[parallelKey(i, pointers[k])]));
                }
            }
            
        }
    }
    res.json({nodes,edges});
});

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})

var parallelKey = (node1, node2) => {
    if(node1<=node2){
        return node1+","+node2;
    }
    return node2+","+node1;
}