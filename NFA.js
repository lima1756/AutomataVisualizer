class NFA{
    constructor(start, end, transitions, nodes){
        this.start = start;
        this.end = end;
        this.transitions = transitions;
        this.nodes = nodes;
    }
}

module.exports = NFA;