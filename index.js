const express = require("express");
const bodyParser = require('body-parser');
const fs = require("fs");
const multer = require('multer');
const cors = require('cors');
const Node = require("./Node");
const Edge = require("./Edge");
const NFA = require("./NFA");

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.options('*', cors());
var nodeCounter = 0;
var edgeCounter = 0;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname + '-' + Date.now())
    }
  })
   
var upload = multer({ storage: storage }).single('file');

app.post('/matrix', upload, function (req, res, next) {
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

app.post('/regex', function (req, res, next){
    const regex = req.body.regex;
    const postfix = createPostFix(regex);
    const operators = [ '(', ')', '|', '', '+', '*'];
    var stack = [];
    for(let i = 0; i < postfix.length; i++)
    {
        const re = postfix[i];
        let secondElement;
        let firstElement;
        if (operators.indexOf(re)!=-1)
        {
            switch (re)
            {
                case '':
                    secondElement = stack.pop();
                    firstElement = stack.pop();
                    stack.push(concat(firstElement, secondElement));
                    break;
                case '|':
                    secondElement = stack.pop();
                    firstElement = stack.pop();
                    stack.push(union(firstElement, secondElement));
                    break;
                case '*':
                    stack.push(kleene(stack.pop()));
                    break;
                case '+':
                    stack.push(positive(stack.pop()));
                    break;
            }
        }
        else
        {
            stack.push(re);
        }
    }
    let nfa = stack.pop();
    nfa.start.setStart();
    nfa.end.setEnd();
    var removeDups = (arr) => arr.filter((v,i)=> arr.indexOf(v)===i);
    const nodes = removeDups(nfa.nodes);
    const edges = removeDups(nfa.transitions);
    edgeCounter = 0;
    nodeCounter = 0;
    res.json({nodes: nodes, edges: edges});
}) 

var compareSymbols = (symb1, symb2) => {
    const operators = [ '(', ')', '|', '', '+', '*'];
    const values = [0,0,1,2,3,4]
    return values[operators.indexOf(symb1)] > values[operators.indexOf(symb2)] ? 
        1 : (values[operators.indexOf(symb1)] < values[operators.indexOf(symb2)] ? -1 : 0);
}

var createPostFix = (regex) => {
    let stack = [];
    let postfix = [];
    const operators = ['*', '|', '+', '(', ')'];
    var lastChar = false;

    for(let i =0; i < regex.length; i++)
    {    
        const c = regex[i];
        if (operators.indexOf(c)==-1 && !lastChar)
        {
            postfix.push(c);
            lastChar = true;
        }
        else if (c == '(')
        {
            if (lastChar)
            {
                while (stack.length > 0 && compareSymbols('', stack[stack.length-1]) <= 0)
                {
                    postfix.push(stack.pop());
                }
                stack.push('');
            }
            stack.push('(');
            lastChar = false;
        }
        else if (c == ')')
        {
            while (stack.length > 0 && compareSymbols(stack[stack.length-1], '(') != 0)
            {
                postfix.push(stack.pop());
            }

            if (stack.length > 0 && compareSymbols(stack[stack.length-1], '(') != 0)
            {
                throw new Error();
            }
            else
            {
                stack.pop();
            }
            lastChar = true;
        }
        else if (operators.indexOf(c) == -1 && lastChar)
        {
            while (stack.length > 0 && compareSymbols('', stack[stack.length-1]) <= 0)
            {
                postfix.push(stack.pop());
            }
            stack.push('');
            postfix.push(c);
            lastChar = true;
        }
        else
        {
            while (stack.length > 0 && compareSymbols(c, stack[stack.length-1]) <= 0)
            {
                postfix.push(stack.pop());
            }
            stack.push(c);
            lastChar = c=='*' || c == '+';
        }
    }
    while (stack.length > 0)
    {
        postfix.push(stack.pop());
    }
    return postfix;
}

var concat = (element1, element2) => {
    let start = new Node(nodeCounter++);
    let end = new Node(nodeCounter++);
    let nodes = [];
    let transitions = [];
    if (typeof(element1)=="string" && typeof(element2)=="string")
    {
        let middle = new Node(nodeCounter++);
        transitions.push(new Edge(edgeCounter++, start.id, middle.id, element1));
        transitions.push(new Edge(edgeCounter++, middle.id, end.id, element2));
        nodes = nodes.concat([start, middle, end]);
    }
    else if (typeof(element1)== "object" && typeof(element2)=="object")
    {
        transitions = transitions.concat(element1.transitions);
        transitions = transitions.concat(element2.transitions);
        nodes = nodes.concat(element1.nodes);
        nodes = nodes.concat(element2.nodes);
        start = element1.start;
        end = element2.end;
        transitions.push(new Edge(edgeCounter++, element1.end.id, element2.start.id, 'ε'));
        nodes = nodes.concat([start, end]);
    }
    else if (typeof(element1)== "object")
    {
        transitions=transitions.concat(element1.transitions);
        nodes=nodes.concat(element1.nodes);
        start = element1.start;
        transitions.push(new Edge(edgeCounter++, element1.end.id, end.id, element2));
        nodes = nodes.concat([start, end]);
    }
    else if (typeof(element2)=="object")
    {
        transitions = transitions.concat(element2.transitions);
        nodes = nodes.concat(element2.nodes);
        end = element2.end;
        transitions.push(new Edge(edgeCounter++, start.id, element2.start.id, element1));
        nodes = nodes.concat([start, end]);
    }
    return new NFA(start, end, transitions, nodes);
}

var union = (element1, element2) => {
    let start = new Node(nodeCounter++);
    let end = new Node(nodeCounter++);
    let nodes = [];
    let transitions = [];
    if (typeof(element1)=="string" && typeof(element2)=="string")
    {
        let middle1 = new Node(nodeCounter++);
        let middle2 = new Node(nodeCounter++);
        transitions.push(new Edge(edgeCounter++, start.id, middle1.id, element1));
        transitions.push(new Edge(edgeCounter++, start.id, middle2.id, element2));
        transitions.push(new Edge(edgeCounter++, middle1.id, end.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, middle2.id, end.id, 'ε'));
        nodes = nodes.concat([start, middle1, middle2, end]);
    }
    if (typeof(element1)=="object" && typeof(element2)=="object")
    {
        transitions = transitions.concat(element1.transitions);
        transitions = transitions.concat(element2.transitions);
        nodes=nodes.concat(element1.nodes);
        nodes=nodes.concat(element2.nodes);

        transitions.push(new Edge(edgeCounter++, start.id, element1.start.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, start.id, element2.start.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, element1.end.id, end.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, element2.end.id, end.id, 'ε'));
        nodes = nodes.concat([start, end]);
    }
    else if (typeof(element1)=="object")
    {
        transitions = transitions.concat(element1.transitions);
        nodes=nodes.concat(element1.nodes);

        let middle1 = new Node(nodeCounter++);

        transitions.push(new Edge(edgeCounter++, start.id, element1.start.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, start.id, middle1.id, element2));
        transitions.push(new Edge(edgeCounter++, element1.end.id, end.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, middle1.id, end.id, 'ε'));
        nodes = nodes.concat([start, middle1, end]);
    }
    else if (typeof(element2)=="object")
    {
        transitions = transitions.concat(element2.transitions);
        nodes=nodes.concat(element2.nodes);

        let middle1 = new Node(nodeCounter++);

        transitions.push(new Edge(edgeCounter++, start.id, element2.start.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, start.id, middle1.id, element1));
        transitions.push(new Edge(edgeCounter++, element2.end.id, end.id, 'ε'));
        transitions.push(new Edge(edgeCounter++, middle1.id, end.id, 'ε'));
        nodes = nodes.concat([start, middle1, end]);
    }
    return new NFA(start, end, transitions, nodes);
}

var kleene = (element1) => {
    let nodes = [];
    let transitions = [];
    if (typeof(element1)== "object")
    {
        transitions=transitions.concat(element1.transitions);
        nodes=nodes.concat(element1.nodes);
        transitions.push(new Edge(edgeCounter++, element1.end.id, element1.start.id, 'ε'));
        return new NFA(element1.start, element1.start, transitions, nodes);
    }
    let start = new Node(nodeCounter++);
    transitions.push(new Edge(edgeCounter++, start.id, start.id, element1));
    nodes = nodes.concat([start]);
    return new NFA(start, start, transitions, [start]);
}

var positive = (element1) => {
    let nodes = [];
    let transitions = [];
    if (typeof(element1)== "object")
    {
        transitions=transitions.concat(element1.transitions);
        nodes=nodes.concat(element1.nodes);
        transitions.push(new Edge(edgeCounter++, element1.end.id, element1.start.id, 'ε'));
        return new NFA(element1.start, element2.end, transitions, nodes);
    }
    var start = new Node(nodeCounter++);
    var end = new Node(nodeCounter++);
    transitions.push(new Edge(edgeCounter++, start.id, end.id, element1));
    transitions.push(new Edge(edgeCounter++, end.id, start.id, 'ε'));
    nodes = nodes.concat([start, end]);
    return new NFA(start, end, transitions, nodes);

}

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Listening at http://%s:%s", host, port)
})

var parallelKey = (node1, node2) => {
    if(node1<=node2){
        return node1+","+node2;
    }
    return node2+","+node1;
}