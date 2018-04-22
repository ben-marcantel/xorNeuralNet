const synaptic = require('synaptic');
const CellularAutomata = require('cellular-automata');


const output = document.getElementById("output"); 




 
// create a cellular automata with width of 200 cells and a height of 80 cells 
var cellularAutomata = new CellularAutomata([200, 80]);
 
// fill the array with 95% of 0 values and 5% of 1 values 
cellularAutomata.fillWithDistribution([[0, 95], [1, 5]]);
 
// define that the value out of the array should be interpreted as 0 values 
cellularAutomata.setOutOfBoundValue(0);
 
cellularAutomata.setRule('23/3').iterate(5); // apply 5 times the S23/B3 rule (conway's life) 
cellularAutomata.setRule('135/17').iterate(3); // apply 3 times the S135/B17 rule 
cellularAutomata.setRule('234/12345678').iterate(5); // apply 5 times the S234/B12345768 rule 
 
console.log(cellularAutomata.array);






// create the network
const { Layer, Network } = synaptic;

let inputLayer = new Layer(2);
let hiddenLayer = new Layer(3);
let outputLayer = new Layer(1);

inputLayer.project(hiddenLayer);
hiddenLayer.project(outputLayer);

let myNetwork = new Network({
	input: inputLayer,
	hidden: [hiddenLayer],
	output: outputLayer
});

// train the network - learn XOR
const learningRate = .3;
for (let i = 0; i < 20000; i++)
{
	// 0,0 => 0
	myNetwork.activate([0,0]);
	myNetwork.propagate(learningRate, [0]);

	// 0,1 => 1
	myNetwork.activate([0,1]);
	myNetwork.propagate(learningRate, [1]);

	// 1,0 => 1
	myNetwork.activate([1,0]);
	myNetwork.propagate(learningRate, [1]);

	// 1,1 => 0
	myNetwork.activate([1,1]);
	myNetwork.propagate(learningRate, [0]);
}

// test the network
output.innerHTML = myNetwork.activate([0,0]),myNetwork.activate([0,1]), myNetwork.activate([1,0]), myNetwork.activate([1,1]);

