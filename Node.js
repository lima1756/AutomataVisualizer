class Node{
    constructor(id, start=false, end=false){
        this.id = ''+id;
        this.label = (start?'start: ':'') + (end?'end: ':'')+ 'q'+id;
        this.x = Math.random();
        this.y = Math.random();
        if(start)
            this.color = "#00FF00"
        if(end)
            this.type= "diamond"
    }
}

module.exports = Node;