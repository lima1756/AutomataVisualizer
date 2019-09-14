# Automata Visualizer

## How to run

1. Inside /visualizer/sigma run `npm install`
2. Create a localhost for the whole /visualizer folder. Can be created with:
    * python http.server
    * npm http-server
    * apache

3. Run in root / `node index`, this will start the back end.
4. Open the client on the browser using the asigned port.

## Matrix input

This is a visualizer for NDFA or DFA. The input can be the Graph matrix, like the one in the matrix.csv file.
The first line are the transition functions separated by commas, while the rest of the lines are the representation of the next node in the automata, the pipe symbol "|" is used to represent the different nodes a same transition function can go to.

## Regex input

// TODO
