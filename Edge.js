class Edge{
    constructor(id, source, target, label){
        this.id = id+'';
        this.source = source+'';
        this.target = target+'';
        this.label = label;
        this.type = "curvedArrow";
        // this.count = count;
    }
}

module.exports = Edge;