(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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


},{"cellular-automata":14,"synaptic":22}],2:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^R([1-9][0-9]*)\/T([0-9]+)\/C([1-9][0-9]*)\/(NM|NN)(\/GH|)$/i;

//actually not the same as in life and generations
var getNeighbourMethod = function (methodId) {
    if (methodId === 'NN' || methodId === 'nn' || methodId === 'von-neumann') {
        return 'von-neumann';
    } else {
        return 'moore';
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'cyclic',
        ruleString: ruleString,
        threshold: parseInt(extractedRule[2], 10),
        stateCount: parseInt(extractedRule[3], 10),
        greenbergHastingsModel: (!!extractedRule[5]),
        neighbourhoodType: getNeighbourMethod(extractedRule[4]),
        neighbourhoodRange: parseInt(extractedRule[1], 10) || 1
    } : null;
};

var cyclicFunction = function (currentValue, neighbours) {
    var nextValue = (currentValue + 1) % this.stateCount,
        index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + (neighbours[index] === nextValue ? 1 : 0);
    }

    if (sum >= this.threshold || (this.greenbergHastingsModel && currentValue !== 0)) {
        result = nextValue;
    } else {
        result = currentValue;
    }

    return result;
};

var cyclic = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = cyclicFunction;
    }

    return ruleDescription;
};

module.exports = cyclic;

},{"../utils/utils":13}],3:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^ES?([0-9,.]*)\/B?([0-9,.]*)\/C?([1-9][0-9]*)(M|V|von-neumann|moore|axis|corner|edge|face|)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    methodId = methodId.toLowerCase();

    if (methodId === 'v') {
        return 'von-neumann';
    } else if (methodId === 'm' || methodId === ''){
        return 'moore';
    } else {
        return methodId;
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'extended-generations',
        ruleString: ruleString,
        survival: utils.splitCommaSeparatedNumbersWithRanges(extractedRule[1]),
        birth: utils.splitCommaSeparatedNumbersWithRanges(extractedRule[2]),
        stateCount: parseInt(extractedRule[3], 10) || 1,
        neighbourhoodType: getNeighbourMethod(extractedRule[4]),
        neighbourhoodRange: parseInt(extractedRule[5], 10) || 1
    } : null;
};

var extendedGenerationsFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + (neighbours[index] === 1 ? 1 : 0);
    }

    if (currentValue === 0 && this.birth.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue === 1 && this.survival.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue > 0) {
        result = (currentValue + 1) % this.stateCount;
    } else {
        result = 0;
    }

    return result;
};

var extendedGenerations = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = extendedGenerationsFunction;
    }

    return ruleDescription;
};

module.exports = extendedGenerations;

},{"../utils/utils":13}],4:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^ES?([0-9,.]*)\/B?([0-9,.]*)(M|V|von-neumann|moore|axis|corner|edge|face|)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    methodId = methodId.toLowerCase();

    if (methodId === 'v') {
        return 'von-neumann';
    } else if (methodId === 'm' || methodId === ''){
        return 'moore';
    } else {
        return methodId;
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'extended-life',
        ruleString: ruleString,
        survival: utils.splitCommaSeparatedNumbersWithRanges(extractedRule[1]),
        birth: utils.splitCommaSeparatedNumbersWithRanges(extractedRule[2]),
        neighbourhoodType: getNeighbourMethod(extractedRule[3]),
        neighbourhoodRange: parseInt(extractedRule[4], 10) || 1
    } : null;
};

var extendedLifeFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + neighbours[index];
    }

    if (currentValue === 0 && this.birth.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue === 1 && this.survival.indexOf(sum) > -1) {
        result = 1;
    } else {
        result = 0;
    }

    return result;
};

var extendedLife = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = extendedLifeFunction;
    }

    return ruleDescription;
};

module.exports = extendedLife;

},{"../utils/utils":13}],5:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^ES?([0-9,.:]*)\/B?([0-9,.:]*)(M|V|von-neumann|moore|axis|corner|edge|face|)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    methodId = methodId.toLowerCase();

    if (methodId === 'v') {
        return 'von-neumann';
    } else if (methodId === 'm' || methodId === ''){
        return 'moore';
    } else {
        return methodId;
    }
};

var regexRange = /([0-9]+)\.\.([0-9]+)/,
    regexProbability = /([0-9.]+):([0-9.]+)/;

var parseStochasticArgs = function (string) {
    //TODO refactor to utils along with splitCommaSeparatedNumbersWithRanges

    var splitString = string.split(','),
        result = {},
        expression,
        rangeMatch,
        parsedValue,
        probabilityMatch,
        probability,
        i = 0;

    for (; i < splitString.length; i++) {
        expression = splitString[i];
        rangeMatch = regexRange.exec(expression);
        probabilityMatch = regexProbability.exec(expression);

        probability = probabilityMatch ? parseFloat(probabilityMatch[2]) : 1;
        probability = Math.max(0, Math.min(1, probability));

        if (probability > 0 || isNaN(probability)) {
            if (rangeMatch) {
                utils.appendRangeToObjectWithProbability(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10), probability, result);
            } else {
                parsedValue = parseInt(expression, 10);
                if (!isNaN(parsedValue)) {
                    result[parsedValue] = probability;
                }
            }
        }
    }

    return result;
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'extended-stochastic',
        ruleString: ruleString,
        survival: parseStochasticArgs(extractedRule[1]), //utils.splitCommaSeparatedNumbersWithRanges(extractedRule[1]),
        birth: parseStochasticArgs(extractedRule[2]), //utils.splitCommaSeparatedNumbersWithRanges(extractedRule[2]),
        neighbourhoodType: getNeighbourMethod(extractedRule[3]),
        neighbourhoodRange: parseInt(extractedRule[4], 10) || 1
    } : null;
};

var extendedStochasticFunction = function (currentValue, neighbours, rng) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    rng = rng || Math.random;

    for (; index < neighboursLength; index++) {
        sum = sum + neighbours[index];
    }

    if (currentValue === 0 && !!this.birth[sum]) {
        result = (this.birth[sum] === 1 || this.birth[sum] > rng()) ? 1 : 0;
    } else if (currentValue === 1 && !!this.survival[sum]) {
        result = (this.survival[sum] === 1 || this.survival[sum] > rng()) ? 1 : 0;
    } else {
        result = 0;
    }

    return result;
};

var extendedStochastic = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = extendedStochasticFunction;
    }

    return ruleDescription;
};

module.exports = extendedStochastic;

},{"../utils/utils":13}],6:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^S?([0-9]*)\/B?([0-9]*)\/C?([1-9][0-9]*)([MV]?)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    if (methodId === 'V' || methodId === 'v' || methodId === 'von-neumann') {
        return 'von-neumann';
    } else {
        return 'moore';
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'generations',
        ruleString: ruleString,
        survival: utils.splitStringInNumberArray(extractedRule[1]),
        birth: utils.splitStringInNumberArray(extractedRule[2]),
        stateCount: parseInt(extractedRule[3], 10) || 1,
        neighbourhoodType: getNeighbourMethod(extractedRule[4]),
        neighbourhoodRange: parseInt(extractedRule[5], 10) || 1
    } : null;
};

var generationsFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + (neighbours[index] === 1 ? 1 : 0);
    }

    if (currentValue === 0 && this.birth.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue === 1 && this.survival.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue > 0) {
        result = (currentValue + 1) % this.stateCount;
    } else {
        result = 0;
    }

    return result;
};

var generations = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = generationsFunction;
    }

    return ruleDescription;
};

module.exports = generations;

},{"../utils/utils":13}],7:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^S?([0-9]*)\/B?([0-9]*)([MV]?)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    if (methodId === 'V' || methodId === 'v' || methodId === 'von-neumann') {
        return 'von-neumann';
    } else {
        return 'moore';
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'life',
        ruleString: ruleString,
        survival: utils.splitStringInNumberArray(extractedRule[1]),
        birth: utils.splitStringInNumberArray(extractedRule[2]),
        neighbourhoodType: getNeighbourMethod(extractedRule[3]),
        neighbourhoodRange: parseInt(extractedRule[4], 10) || 1
    } : null;
};

var lifeFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + neighbours[index];
    }

    if (currentValue === 0 && this.birth.indexOf(sum) > -1) {
        result = 1;
    } else if (currentValue === 1 && this.survival.indexOf(sum) > -1) {
        result = 1;
    } else {
        result = 0;
    }

    return result;
};

var life = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = lifeFunction;
    }

    return ruleDescription;
};

module.exports = life;

},{"../utils/utils":13}],8:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^LUKY([0-9])([0-9])([0-9])([0-9])$/i;

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'luky',
        ruleString: ruleString,
        lowBirth: parseInt(extractedRule[1], 10),
        highBirth: parseInt(extractedRule[2], 10),
        lowSurvival: parseInt(extractedRule[3], 10),
        highSurvival: parseInt(extractedRule[4], 10),
        neighbourhoodType: 'moore',
        neighbourhoodRange: 1
    } : null;
};

var lukyFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + (neighbours[index] === 1 ? 1 : 0);
    }

    if (currentValue === 0 && sum >= this.lowBirth && sum <= this.highBirth) {
        result = 1;
    } else if (currentValue === 1 && sum >= this.lowSurvival && sum <= this.highSurvival) {
        result = 1;
    } else {
        result = 0;
    }

    return result;
};

var generations = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = lukyFunction;
    }

    return ruleDescription;
};

module.exports = generations;

},{"../utils/utils":13}],9:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^NLUKY([0-9])([0-9])([0-9])([0-9])([0-9])$/i;

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'nluky',
        ruleString: ruleString,
        stateCount: parseInt(extractedRule[1], 10),
        lowBirth: parseInt(extractedRule[2], 10),
        highBirth: parseInt(extractedRule[3], 10),
        lowSurvival: parseInt(extractedRule[4], 10),
        highSurvival: parseInt(extractedRule[5], 10),
        neighbourhoodType: 'moore',
        neighbourhoodRange: 1
    } : null;
};

var nlukyFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = 0,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + (neighbours[index] === 1 ? 1 : 0);
    }

    if (currentValue === 0 && sum >= this.lowBirth && sum <= this.highBirth) {
        result = 1;
    } else if (currentValue === 1 && sum >= this.lowSurvival && sum <= this.highSurvival) {
        result = 1;
    } else if (currentValue === 1) {
        result = 2 % (2 + this.stateCount * 2);
    } else if (currentValue >= 2) {
        result = (currentValue + 2) % (2 + this.stateCount * 2);
    } else {
        result = 0;
    }

    return result;
};

var generations = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = nlukyFunction;
    }

    return ruleDescription;
};

module.exports = generations;

},{"../utils/utils":13}],10:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^([0-9]+)([MV]?)([0-9]*)$/i;

var getNeighbourMethod = function (methodId) {
    if (methodId === 'V' || methodId === 'v' || methodId === 'von-neumann') {
        return 'von-neumann';
    } else {
        return 'moore';
    }
};

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString));

    return extractedRule ? {
        ruleFormat: 'vote',
        ruleString: ruleString,
        vote: utils.splitStringInNumberArray(extractedRule[1]),
        neighbourhoodType: getNeighbourMethod(extractedRule[2]),
        neighbourhoodRange: parseInt(extractedRule[3], 10) || 1
    } : null;
};

var voteFunction = function (currentValue, neighbours) {
    var index = 0,
        sum = currentValue,
        neighboursLength = neighbours.length,
        result;

    for (; index < neighboursLength; index++) {
        sum = sum + neighbours[index];
    }

    if (this.vote.indexOf(sum) > -1) {
        result = 1;
    } else {
        result = 0;
    }

    return result;
};

var vote = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = voteFunction;
    }

    return ruleDescription;
};

module.exports = vote;

},{"../utils/utils":13}],11:[function(require,module,exports){
"use strict";

var utils = require('../utils/utils'),
    ruleRegexp = /^(W|Rule)([0-9]{1,3})$/i;

var parseRuleString = function (ruleString) {
    var extractedRule = ruleRegexp.exec(utils.stripWhitespaces(ruleString)),
        ruleNumber = extractedRule ? parseInt(extractedRule[2], 10) : null;

    return extractedRule && ruleNumber >= 0 && ruleNumber <= 255 ? {
        ruleFormat: 'wolfram',
        ruleString: ruleString,
        ruleNumber: ruleNumber,
        neighbourhoodType: 'von-neumann',
        neighbourhoodRange: 1
    } : null;
};

var wolframFunction = function (currentValue, neighbours) {
    var binaryState = (neighbours[0] ? 4 : 0) + (currentValue ? 2 : 0) + (neighbours[1] ? 1 : 0);

    return (this.ruleNumber & Math.pow(2, binaryState) ? 1 : 0);
};

var wolfram = function (rule) {
    var ruleDescription = parseRuleString(rule);

    if (ruleDescription !== null) {
        ruleDescription.process = wolframFunction;
    }

    return ruleDescription;
};

module.exports = wolfram;

},{"../utils/utils":13}],12:[function(require,module,exports){
"use strict";

var formats = {
    life: require('./formats/life'),
    extendedLife: require('./formats/extendedLife'),
    extendedStochastic: require('./formats/extendedStochastic'),
    generations: require('./formats/generations'),
    extendedGenerations: require('./formats/extendedGenerations'),
    cyclic: require('./formats/cyclic'),
    vote: require('./formats/vote'),
    wolfram: require('./formats/wolfram'),
    luky: require('./formats/luky'),
    nluky: require('./formats/nluky')
};

var parser = function parser (ruleString, format) {
    var result = null;

    if (typeof ruleString === 'string') {
        if (!!format) {
            result = !!formats[format] ? formats[format](ruleString) : null;
        } else {
            for (format in formats) {
                if (formats.hasOwnProperty(format)) {
                    result = formats[format](ruleString);

                    if (result !== null) {
                        break;
                    }
                }
            }
        }
    }

    return result;
};

module.exports = parser;

},{"./formats/cyclic":2,"./formats/extendedGenerations":3,"./formats/extendedLife":4,"./formats/extendedStochastic":5,"./formats/generations":6,"./formats/life":7,"./formats/luky":8,"./formats/nluky":9,"./formats/vote":10,"./formats/wolfram":11}],13:[function(require,module,exports){
"use strict";

var utils = {};

utils.stripWhitespaces = function (string) {
    return string.replace(/\s/g, '');
};

utils.splitStringInNumberArray = function (string) {
    return string.split('').map(function (value) {
        return parseInt(value, 10);
    });
};

var regexRange = /([0-9]+)\.\.([0-9]+)/;

utils.splitCommaSeparatedNumbersWithRanges = function (string) {
    var splitString = string.split(','),
        result = [],
        expression,
        rangeMatch,
        i = 0;

    for (; i < splitString.length; i++) {
        expression = splitString[i];
        rangeMatch = regexRange.exec(expression);

        if (rangeMatch) {
            utils.appendRangeToArray(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10), result);
        } else {
            result.push(parseInt(expression, 10));
        }
    }

    return result.filter(function (v) {
        return !isNaN(v);
    });
};

utils.appendRangeToArray = function (min, max, array) {
    var tmp;

    if (min > max) {
        tmp = max;
        max = min;
        min = tmp;
    }

    for (; min <= max; min++) {
        array.push(min);
    }
};

utils.appendRangeToObjectWithProbability = function (min, max, probability, object) {
    var tmp;

    if (min > max) {
        tmp = max;
        max = min;
        min = tmp;
    }

    for (; min <= max; min++) {
        object[min] = probability;
    }
};

module.exports = utils;

},{}],14:[function(require,module,exports){
"use strict";

module.exports = require('./lib/cellular-automata');

},{"./lib/cellular-automata":15}],15:[function(require,module,exports){
"use strict";

var parser = require('cellular-automata-rule-parser'),
    neighbourhoodFunctions = require('./utils/neighbourhood-functions'),
    utils = require('./utils/utils');

/**
 * CellularAutomata constructor
 * @param {int[]} shape Shape of the grid
 * @param {int} [defaultValue=0] Default value of the cells
 * @constructor
 */
var CellularAutomata = function (shape, defaultValue) {
    this.shape = shape;
    this.dimension = shape.length;

    defaultValue = defaultValue || 0;

    this.array = utils.createArray(shape, defaultValue);
    this.workingArray = utils.createArray(shape, defaultValue);

    this.stride = this.array.stride;
    this.setRng();
};

CellularAutomata.prototype.shape = null;
CellularAutomata.prototype.stride = null;
CellularAutomata.prototype.dimension = null;

CellularAutomata.prototype.array = null;
CellularAutomata.prototype.workingArray = null;

CellularAutomata.prototype.rule = null;
CellularAutomata.prototype.rng = null;

CellularAutomata.prototype.neighbourhoodType = null;
CellularAutomata.prototype.neighbourhoodRange = null;
CellularAutomata.prototype.neighbourhood = null;
CellularAutomata.prototype.neighbourhoodNumber = null;
CellularAutomata.prototype.neighbourhoodValues = null;

CellularAutomata.prototype.outOfBoundValue = null;
CellularAutomata.prototype.outOfBoundWrapping = false;
CellularAutomata.prototype.outOfBoundClamping = false;

/**
 * Set the random number generation function used internally
 * @param {function} [rng=Math.random] Random number generation function, default to Math.random()
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.setRng = function (rng) {
    this.rng = rng || Math.random;

    return this;
};

/**
 * Fill the grid with a given distribution
 * @param {Array[]} distribution The distribution to fill the grid with (ie: [[0,90], [1,10]] for 90% of 0 and 10% of 1). Null values are ignored.
 * @param {function} [rng=null] Random number generation function, default to the internal RNG settable with setRng().
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.fillWithDistribution = function (distribution, rng) {
    var sum = 0,
        array = this.array.data,
        numberOfDistributions = distribution.length,
        selection,
        i,
        k;

    rng = rng || this.rng;

    for (i = 0; i < numberOfDistributions; i++) {
        sum += distribution[i][1];
    }

    for (k = 0; k < array.length; k++) {
        selection = rng() * sum;

        for (i = 0; i < numberOfDistributions; i++) {
            selection -= distribution[i][1];
            if (selection <= 0 && distribution[i][0] !== null) {
                array[k] = distribution[i][0];
                break;
            }
        }
    }

    return this;
};

/**
 * Sort the neighbourhood from left to right, top to bottom, ...
 * @param {Array} a First neighbour
 * @param {Array} b Second neighbour
 * @returns {number}
 */
var neighbourhoodSorter = function neighbourhoodSorter (a, b) {
    a = a.join(',');
    b = b.join(',');
    return a > b ? 1 : a < b ? -1 : 0;
};

/**
 * Define the neighbourhood type (moore, von-neumann, axis, corner, edge or face) and range, pre-calculate the relative positions of the neighbours
 * @param {string} [neighbourhoodType=null] moore, von-neumann, axis, corner, edge or face
 * @param {int} [neighbourhoodRange=1]
 * @protected
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.setNeighbourhood = function (neighbourhoodType, neighbourhoodRange) {
    this.neighbourhoodType = !!neighbourhoodFunctions[neighbourhoodType] ? neighbourhoodType : 'moore';
    this.neighbourhoodRange = neighbourhoodRange || 1;

    this.neighbourhood = neighbourhoodFunctions[this.neighbourhoodType](this.neighbourhoodRange, this.dimension);
    this.neighbourhood.sort(neighbourhoodSorter);
    this.neighbourhoodNumber = this.neighbourhood.length;
    this.neighbourhoodValues = new Uint8Array(this.neighbourhoodNumber);

    return this;
};

/**
 * Define the value used for the cells out of the array's bounds
 * @param {int|string} [outOfBoundValue=0] Any integer value, the string "wrap" to enable out of bound wrapping or the string "clamp" to enable bound clamping.
 * @public
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.setOutOfBoundValue = function (outOfBoundValue) {
    if (outOfBoundValue === 'clamp') {
        this.outOfBoundClamping = true;
        this.outOfBoundWrapping = false;
        this.outOfBoundValue = 0;
    } else if (outOfBoundValue === 'wrap') {
        this.outOfBoundClamping = false;
        this.outOfBoundWrapping = true;
        this.outOfBoundValue = 0;
    } else {
        this.outOfBoundClamping = false;
        this.outOfBoundWrapping = false;
        this.outOfBoundValue = outOfBoundValue | 0;
    }

    return this;
};

/**
 * Define the rule of the cellular automata and the neighbourhood to be used.
 * @param {string|function} rule Either a rule string in the S/B, S/B/C or R/T/C/N format or a function accepting the current value as the first argument and the neighbours as the second argument.
 * @param {string} [neighbourhoodType="moore"] Neighbourhood type (moore, von-neumann, axis, corner, edge or face), only used when the rule is a function.
 * @param {int} [neighbourhoodRange=1] Neighbourhood range, only used when the rule is a function.
 * @public
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.setRule = function (rule, neighbourhoodType, neighbourhoodRange) {
    var ruleType = typeof rule;

    if (ruleType === 'string') {
        this.rule = parser(rule);

        if (this.rule === null) {
            throw new Error('The rulestring could not be parsed.');
        }

        this.setNeighbourhood(this.rule.neighbourhoodType, this.rule.neighbourhoodRange);
    } else if(ruleType === 'function') {
        this.rule = {
            ruleType: 'custom',
            process: rule
        };

        this.setNeighbourhood(neighbourhoodType, neighbourhoodRange);
    } else {
        throw new Error('Invalid rule, neither a string nor a function.');
    }

    return this;
};

/**
 * Obtain all the neighbours for a given cell, the current neighbourhood type and range
 * @param {...number} cell - The coordinates of the cell
 * @protected
 * @returns {Array}
 */
CellularAutomata.prototype.getNeighbours = function (cell) {
    var stride = this.stride,
        neighbourValues = this.neighbourhoodValues,
        dimensionNumber = this.dimension,
        currentArgumentValue,
        isOutOfBound,
        internalArrayIndex,
        neighbourIndex, dimension;

    for (neighbourIndex = 0; neighbourIndex < this.neighbourhoodNumber; neighbourIndex++) {
        isOutOfBound = false;
        internalArrayIndex = 0;

        for (dimension = 0; dimension < dimensionNumber && !isOutOfBound; dimension++) {
            currentArgumentValue = arguments[dimension] + this.neighbourhood[neighbourIndex][dimension];

            if (currentArgumentValue < 0 || currentArgumentValue >= this.shape[dimension]) {
                if (this.outOfBoundClamping) {
                    // clamp to the bound
                    currentArgumentValue = Math.max(0, Math.min(currentArgumentValue, this.shape[dimension] - 1));
                } else if (this.outOfBoundWrapping) {
                    // euclidean modulo
                    currentArgumentValue = currentArgumentValue % this.shape[dimension];
                    currentArgumentValue = currentArgumentValue < 0 ? currentArgumentValue + Math.abs(this.shape[dimension]) : currentArgumentValue;
                } else {
                    isOutOfBound = true;
                }
            }

            internalArrayIndex += currentArgumentValue * stride[dimension];
        }

        neighbourValues[neighbourIndex] = isOutOfBound ? this.outOfBoundValue : this.array.data[internalArrayIndex];
    }

    return neighbourValues;
};

/**
 * Switch the current and the working array in a given cellular automata
 * @param {CellularAutomata} ca Instance of CellularAutomata
 */
var switchArrays = function switchArrays (ca) {
    var temp = ca.array;
    ca.array = ca.workingArray;
    ca.workingArray = temp;
};

/**
 * Apply the previously defined CA rule multiple times.
 * @param {int} [iterationNumber=1] Number of iterations
 * @public
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.iterate = function (iterationNumber) {
    var arrayLength = this.array.data.length,
        dimensionNumber = this.dimension,
        stride = this.stride,
        shape = this.shape,
        neighboursArguments = new Array(dimensionNumber),
        index, currentIteration, currentDimension;

    iterationNumber = iterationNumber || 1;

    for (currentIteration = 0; currentIteration < iterationNumber; currentIteration++) {

        for (index = 0; index < arrayLength; index++) {
            for (currentDimension = 0; currentDimension < dimensionNumber; currentDimension++) {
                neighboursArguments[currentDimension] = ((index / stride[currentDimension]) | 0) % shape[currentDimension];
            }

            this.workingArray.data[index] = this.rule.process(this.array.data[index], this.getNeighbours.apply(this, neighboursArguments), this.rng);
        }

        switchArrays(this);
    }

    return this;
};

/**
 * Apply a given rule for a given number of iterations, shortcut method for setRule and iterate
 * @param {string|function} rule Either a rule string in a format supported by the rule parser or a function accepting the current value as the first argument and the neighbours as the second argument.
 * @param {int} [iteration=1] Number of iterations
 * @param {string} [neighbourhoodType="moore"] Neighbourhood type (moore, von-neumann, axis, corner, edge or face), only used when the rule is a function.
 * @param {int} [neighbourhoodRange=1] Neighbourhood range, only used when the rule is a function.
 * @public
 * @returns {CellularAutomata} CellularAutomata instance for method chaining.
 */
CellularAutomata.prototype.apply = function (rule, iteration, neighbourhoodType, neighbourhoodRange) {
    return this.setRule(rule, neighbourhoodType, neighbourhoodRange).iterate(iteration);
};

module.exports = CellularAutomata;

},{"./utils/neighbourhood-functions":16,"./utils/utils":17,"cellular-automata-rule-parser":12}],16:[function(require,module,exports){
"use strict";

var moore = require('moore'),
    vonNeumann = require('von-neumann'),
    unconventionalNeighbours = require('unconventional-neighbours');

module.exports = {
    'moore': moore,
    'von-neumann': vonNeumann,
    'axis': unconventionalNeighbours.axis,
    'corner': unconventionalNeighbours.corner,
    'edge': unconventionalNeighbours.edge,
    'face': unconventionalNeighbours.face
};

},{"moore":20,"unconventional-neighbours":27,"von-neumann":28}],17:[function(require,module,exports){
"use strict";

var ndarray = require('ndarray');

var utils = {};

utils.createArray = function (shape, defaultValue) {
    var length = shape.reduce(function (p, v) { return p * v; }, 1),
        dataArray = new Uint8Array(length),
        i;

    for (i = 0; i < length; i++) {
        dataArray[i] = defaultValue;
    }

    return ndarray(dataArray, shape);
};

module.exports = utils;

},{"ndarray":21}],18:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],19:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],20:[function(require,module,exports){
module.exports = moore

function moore(range, dims) {
  dims = dims || 2
  range = range || 1
  return recurse([], [], 0)

  function recurse(array, temp, d) {
    if (d === dims-1) {
      for (var i = -range; i <= range; i += 1) {
        if (i || temp.some(function(n) {
          return n
        })) array.push(temp.concat(i))
      }
    } else {
      for (var i = -range; i <= range; i += 1) {
        recurse(array, temp.concat(i), d+1)
      }
    }
    return array
  }
}

},{}],21:[function(require,module,exports){
var iota = require("iota-array")
var isBuffer = require("is-buffer")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]

  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+")
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",")
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",")
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})")

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push("function "+className+"_order(){")
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){")
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}")
  } else {
    code.push("return this.data["+index_str+"]=v}")
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}")
  } else {
    code.push("return this.data["+index_str+"]}")
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}")

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}")

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}")

  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]"
    tStride[i] = "b[i"+i+"]"
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}")

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor

},{"iota-array":18,"is-buffer":19}],22:[function(require,module,exports){
/*!
 * The MIT License (MIT)
 * 
 * Copyright (c) 2017 Juan Cazala - https://caza.la
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE
 * 
 * 
 * 
 * ********************************************************************************************
 *                                   SYNAPTIC (v1.1.4)
 * ********************************************************************************************
 * 
 * Synaptic is a javascript neural network library for node.js and the browser, its generalized
 * algorithm is architecture-free, so you can build and train basically any type of first order
 * or even second order neural network architectures.
 * 
 * http://en.wikipedia.org/wiki/Recurrent_neural_network#Second_Order_Recurrent_Neural_Network
 * 
 * The library includes a few built-in architectures like multilayer perceptrons, multilayer
 * long-short term memory networks (LSTM) or liquid state machines, and a trainer capable of
 * training any given network, and includes built-in training tasks/tests like solving an XOR,
 * passing a Distracted Sequence Recall test or an Embeded Reber Grammar test.
 * 
 * The algorithm implemented by this library has been taken from Derek D. Monner's paper:
 * 
 * 
 * A generalized LSTM-like training algorithm for second-order recurrent neural networks
 * http://www.overcomplete.net/papers/nn2012.pdf
 * 
 * There are references to the equations in that paper commented through the source code.
 * 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["synaptic"] = factory();
	else
		root["synaptic"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _LayerConnection = __webpack_require__(6);

var _LayerConnection2 = _interopRequireDefault(_LayerConnection);

var _Neuron = __webpack_require__(2);

var _Neuron2 = _interopRequireDefault(_Neuron);

var _Network = __webpack_require__(1);

var _Network2 = _interopRequireDefault(_Network);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// types of connections
var connectionType = {
  ALL_TO_ALL: "ALL TO ALL",
  ONE_TO_ONE: "ONE TO ONE",
  ALL_TO_ELSE: "ALL TO ELSE"
};

// types of gates
var gateType = {
  INPUT: "INPUT",
  OUTPUT: "OUTPUT",
  ONE_TO_ONE: "ONE TO ONE"
};

var Layer = function () {
  function Layer(size) {
    _classCallCheck(this, Layer);

    this.size = size | 0;
    this.list = [];

    this.connectedTo = [];

    while (size--) {
      var neuron = new _Neuron2.default();
      this.list.push(neuron);
    }
  }

  // activates all the neurons in the layer


  _createClass(Layer, [{
    key: 'activate',
    value: function activate(input) {

      var activations = [];

      if (typeof input != 'undefined') {
        if (input.length != this.size) throw new Error('INPUT size and LAYER size must be the same to activate!');

        for (var id in this.list) {
          var neuron = this.list[id];
          var activation = neuron.activate(input[id]);
          activations.push(activation);
        }
      } else {
        for (var id in this.list) {
          var neuron = this.list[id];
          var activation = neuron.activate();
          activations.push(activation);
        }
      }
      return activations;
    }

    // propagates the error on all the neurons of the layer

  }, {
    key: 'propagate',
    value: function propagate(rate, target) {

      if (typeof target != 'undefined') {
        if (target.length != this.size) throw new Error('TARGET size and LAYER size must be the same to propagate!');

        for (var id = this.list.length - 1; id >= 0; id--) {
          var neuron = this.list[id];
          neuron.propagate(rate, target[id]);
        }
      } else {
        for (var id = this.list.length - 1; id >= 0; id--) {
          var neuron = this.list[id];
          neuron.propagate(rate);
        }
      }
    }

    // projects a connection from this layer to another one

  }, {
    key: 'project',
    value: function project(layer, type, weights) {

      if (layer instanceof _Network2.default) layer = layer.layers.input;

      if (layer instanceof Layer) {
        if (!this.connected(layer)) return new _LayerConnection2.default(this, layer, type, weights);
      } else throw new Error('Invalid argument, you can only project connections to LAYERS and NETWORKS!');
    }

    // gates a connection betwenn two layers

  }, {
    key: 'gate',
    value: function gate(connection, type) {

      if (type == Layer.gateType.INPUT) {
        if (connection.to.size != this.size) throw new Error('GATER layer and CONNECTION.TO layer must be the same size in order to gate!');

        for (var id in connection.to.list) {
          var neuron = connection.to.list[id];
          var gater = this.list[id];
          for (var input in neuron.connections.inputs) {
            var gated = neuron.connections.inputs[input];
            if (gated.ID in connection.connections) gater.gate(gated);
          }
        }
      } else if (type == Layer.gateType.OUTPUT) {
        if (connection.from.size != this.size) throw new Error('GATER layer and CONNECTION.FROM layer must be the same size in order to gate!');

        for (var id in connection.from.list) {
          var neuron = connection.from.list[id];
          var gater = this.list[id];
          for (var projected in neuron.connections.projected) {
            var gated = neuron.connections.projected[projected];
            if (gated.ID in connection.connections) gater.gate(gated);
          }
        }
      } else if (type == Layer.gateType.ONE_TO_ONE) {
        if (connection.size != this.size) throw new Error('The number of GATER UNITS must be the same as the number of CONNECTIONS to gate!');

        for (var id in connection.list) {
          var gater = this.list[id];
          var gated = connection.list[id];
          gater.gate(gated);
        }
      }
      connection.gatedfrom.push({ layer: this, type: type });
    }

    // true or false whether the whole layer is self-connected or not

  }, {
    key: 'selfconnected',
    value: function selfconnected() {

      for (var id in this.list) {
        var neuron = this.list[id];
        if (!neuron.selfconnected()) return false;
      }
      return true;
    }

    // true of false whether the layer is connected to another layer (parameter) or not

  }, {
    key: 'connected',
    value: function connected(layer) {
      // Check if ALL to ALL connection
      var connections = 0;
      for (var here in this.list) {
        for (var there in layer.list) {
          var from = this.list[here];
          var to = layer.list[there];
          var connected = from.connected(to);
          if (connected.type == 'projected') connections++;
        }
      }
      if (connections == this.size * layer.size) return Layer.connectionType.ALL_TO_ALL;

      // Check if ONE to ONE connection
      connections = 0;
      for (var neuron in this.list) {
        var from = this.list[neuron];
        var to = layer.list[neuron];
        var connected = from.connected(to);
        if (connected.type == 'projected') connections++;
      }
      if (connections == this.size) return Layer.connectionType.ONE_TO_ONE;
    }

    // clears all the neuorns in the layer

  }, {
    key: 'clear',
    value: function clear() {
      for (var id in this.list) {
        var neuron = this.list[id];
        neuron.clear();
      }
    }

    // resets all the neurons in the layer

  }, {
    key: 'reset',
    value: function reset() {
      for (var id in this.list) {
        var neuron = this.list[id];
        neuron.reset();
      }
    }

    // returns all the neurons in the layer (array)

  }, {
    key: 'neurons',
    value: function neurons() {
      return this.list;
    }

    // adds a neuron to the layer

  }, {
    key: 'add',
    value: function add(neuron) {
      neuron = neuron || new _Neuron2.default();
      this.list.push(neuron);
      this.size++;
    }
  }, {
    key: 'set',
    value: function set(options) {
      options = options || {};

      for (var i in this.list) {
        var neuron = this.list[i];
        if (options.label) neuron.label = options.label + '_' + neuron.ID;
        if (options.squash) neuron.squash = options.squash;
        if (options.bias) neuron.bias = options.bias;
      }
      return this;
    }
  }]);

  return Layer;
}();

Layer.connectionType = connectionType;
Layer.gateType = gateType;
exports.default = Layer;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Neuron = __webpack_require__(2);

var _Neuron2 = _interopRequireDefault(_Neuron);

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

var _Trainer = __webpack_require__(3);

var _Trainer2 = _interopRequireDefault(_Trainer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Network = function () {
  function Network(layers) {
    _classCallCheck(this, Network);

    if (typeof layers != 'undefined') {
      this.layers = {
        input: layers.input || null,
        hidden: layers.hidden || [],
        output: layers.output || null
      };
      this.optimized = null;
    }
  }

  // feed-forward activation of all the layers to produce an ouput


  _createClass(Network, [{
    key: 'activate',
    value: function activate(input) {
      if (this.optimized === false) {
        this.layers.input.activate(input);
        for (var i = 0; i < this.layers.hidden.length; i++) {
          this.layers.hidden[i].activate();
        }return this.layers.output.activate();
      } else {
        if (this.optimized == null) this.optimize();
        return this.optimized.activate(input);
      }
    }

    // back-propagate the error thru the network

  }, {
    key: 'propagate',
    value: function propagate(rate, target) {
      if (this.optimized === false) {
        this.layers.output.propagate(rate, target);
        for (var i = this.layers.hidden.length - 1; i >= 0; i--) {
          this.layers.hidden[i].propagate(rate);
        }
      } else {
        if (this.optimized == null) this.optimize();
        this.optimized.propagate(rate, target);
      }
    }

    // project a connection to another unit (either a network or a layer)

  }, {
    key: 'project',
    value: function project(unit, type, weights) {
      if (this.optimized) this.optimized.reset();

      if (unit instanceof Network) return this.layers.output.project(unit.layers.input, type, weights);

      if (unit instanceof _Layer2.default) return this.layers.output.project(unit, type, weights);

      throw new Error('Invalid argument, you can only project connections to LAYERS and NETWORKS!');
    }

    // let this network gate a connection

  }, {
    key: 'gate',
    value: function gate(connection, type) {
      if (this.optimized) this.optimized.reset();
      this.layers.output.gate(connection, type);
    }

    // clear all elegibility traces and extended elegibility traces (the network forgets its context, but not what was trained)

  }, {
    key: 'clear',
    value: function clear() {
      this.restore();

      var inputLayer = this.layers.input,
          outputLayer = this.layers.output;

      inputLayer.clear();
      for (var i = 0; i < this.layers.hidden.length; i++) {
        this.layers.hidden[i].clear();
      }
      outputLayer.clear();

      if (this.optimized) this.optimized.reset();
    }

    // reset all weights and clear all traces (ends up like a new network)

  }, {
    key: 'reset',
    value: function reset() {
      this.restore();

      var inputLayer = this.layers.input,
          outputLayer = this.layers.output;

      inputLayer.reset();
      for (var i = 0; i < this.layers.hidden.length; i++) {
        this.layers.hidden[i].reset();
      }
      outputLayer.reset();

      if (this.optimized) this.optimized.reset();
    }

    // hardcodes the behaviour of the whole network into a single optimized function

  }, {
    key: 'optimize',
    value: function optimize() {
      var that = this;
      var optimized = {};
      var neurons = this.neurons();

      for (var i = 0; i < neurons.length; i++) {
        var neuron = neurons[i].neuron;
        var layer = neurons[i].layer;
        while (neuron.neuron) {
          neuron = neuron.neuron;
        }optimized = neuron.optimize(optimized, layer);
      }

      for (var i = 0; i < optimized.propagation_sentences.length; i++) {
        optimized.propagation_sentences[i].reverse();
      }optimized.propagation_sentences.reverse();

      var hardcode = '';
      hardcode += 'var F = Float64Array ? new Float64Array(' + optimized.memory + ') : []; ';
      for (var i in optimized.variables) {
        hardcode += 'F[' + optimized.variables[i].id + '] = ' + (optimized.variables[i].value || 0) + '; ';
      }hardcode += 'var activate = function(input){\n';
      for (var i = 0; i < optimized.inputs.length; i++) {
        hardcode += 'F[' + optimized.inputs[i] + '] = input[' + i + ']; ';
      }for (var i = 0; i < optimized.activation_sentences.length; i++) {
        if (optimized.activation_sentences[i].length > 0) {
          for (var j = 0; j < optimized.activation_sentences[i].length; j++) {
            hardcode += optimized.activation_sentences[i][j].join(' ');
            hardcode += optimized.trace_sentences[i][j].join(' ');
          }
        }
      }
      hardcode += ' var output = []; ';
      for (var i = 0; i < optimized.outputs.length; i++) {
        hardcode += 'output[' + i + '] = F[' + optimized.outputs[i] + ']; ';
      }hardcode += 'return output; }; ';
      hardcode += 'var propagate = function(rate, target){\n';
      hardcode += 'F[' + optimized.variables.rate.id + '] = rate; ';
      for (var i = 0; i < optimized.targets.length; i++) {
        hardcode += 'F[' + optimized.targets[i] + '] = target[' + i + ']; ';
      }for (var i = 0; i < optimized.propagation_sentences.length; i++) {
        for (var j = 0; j < optimized.propagation_sentences[i].length; j++) {
          hardcode += optimized.propagation_sentences[i][j].join(' ') + ' ';
        }
      }hardcode += ' };\n';
      hardcode += 'var ownership = function(memoryBuffer){\nF = memoryBuffer;\nthis.memory = F;\n};\n';
      hardcode += 'return {\nmemory: F,\nactivate: activate,\npropagate: propagate,\nownership: ownership\n};';
      hardcode = hardcode.split(';').join(';\n');

      var constructor = new Function(hardcode);

      var network = constructor();
      network.data = {
        variables: optimized.variables,
        activate: optimized.activation_sentences,
        propagate: optimized.propagation_sentences,
        trace: optimized.trace_sentences,
        inputs: optimized.inputs,
        outputs: optimized.outputs,
        check_activation: this.activate,
        check_propagation: this.propagate
      };

      network.reset = function () {
        if (that.optimized) {
          that.optimized = null;
          that.activate = network.data.check_activation;
          that.propagate = network.data.check_propagation;
        }
      };

      this.optimized = network;
      this.activate = network.activate;
      this.propagate = network.propagate;
    }

    // restores all the values from the optimized network the their respective objects in order to manipulate the network

  }, {
    key: 'restore',
    value: function restore() {
      if (!this.optimized) return;

      var optimized = this.optimized;

      var getValue = function getValue() {
        var args = Array.prototype.slice.call(arguments);

        var unit = args.shift();
        var prop = args.pop();

        var id = prop + '_';
        for (var property in args) {
          id += args[property] + '_';
        }id += unit.ID;

        var memory = optimized.memory;
        var variables = optimized.data.variables;

        if (id in variables) return memory[variables[id].id];
        return 0;
      };

      var list = this.neurons();

      // link id's to positions in the array
      for (var i = 0; i < list.length; i++) {
        var neuron = list[i].neuron;
        while (neuron.neuron) {
          neuron = neuron.neuron;
        }neuron.state = getValue(neuron, 'state');
        neuron.old = getValue(neuron, 'old');
        neuron.activation = getValue(neuron, 'activation');
        neuron.bias = getValue(neuron, 'bias');

        for (var input in neuron.trace.elegibility) {
          neuron.trace.elegibility[input] = getValue(neuron, 'trace', 'elegibility', input);
        }for (var gated in neuron.trace.extended) {
          for (var input in neuron.trace.extended[gated]) {
            neuron.trace.extended[gated][input] = getValue(neuron, 'trace', 'extended', gated, input);
          }
        } // get connections
        for (var j in neuron.connections.projected) {
          var connection = neuron.connections.projected[j];
          connection.weight = getValue(connection, 'weight');
          connection.gain = getValue(connection, 'gain');
        }
      }
    }

    // returns all the neurons in the network

  }, {
    key: 'neurons',
    value: function neurons() {
      var neurons = [];

      var inputLayer = this.layers.input.neurons(),
          outputLayer = this.layers.output.neurons();

      for (var i = 0; i < inputLayer.length; i++) {
        neurons.push({
          neuron: inputLayer[i],
          layer: 'input'
        });
      }

      for (var i = 0; i < this.layers.hidden.length; i++) {
        var hiddenLayer = this.layers.hidden[i].neurons();
        for (var j = 0; j < hiddenLayer.length; j++) {
          neurons.push({
            neuron: hiddenLayer[j],
            layer: i
          });
        }
      }

      for (var i = 0; i < outputLayer.length; i++) {
        neurons.push({
          neuron: outputLayer[i],
          layer: 'output'
        });
      }

      return neurons;
    }

    // returns number of inputs of the network

  }, {
    key: 'inputs',
    value: function inputs() {
      return this.layers.input.size;
    }

    // returns number of outputs of hte network

  }, {
    key: 'outputs',
    value: function outputs() {
      return this.layers.output.size;
    }

    // sets the layers of the network

  }, {
    key: 'set',
    value: function set(layers) {
      this.layers = {
        input: layers.input || null,
        hidden: layers.hidden || [],
        output: layers.output || null
      };
      if (this.optimized) this.optimized.reset();
    }
  }, {
    key: 'setOptimize',
    value: function setOptimize(bool) {
      this.restore();
      if (this.optimized) this.optimized.reset();
      this.optimized = bool ? null : false;
    }

    // returns a json that represents all the neurons and connections of the network

  }, {
    key: 'toJSON',
    value: function toJSON(ignoreTraces) {
      this.restore();

      var list = this.neurons();
      var neurons = [];
      var connections = [];

      // link id's to positions in the array
      var ids = {};
      for (var i = 0; i < list.length; i++) {
        var neuron = list[i].neuron;
        while (neuron.neuron) {
          neuron = neuron.neuron;
        }ids[neuron.ID] = i;

        var copy = {
          trace: {
            elegibility: {},
            extended: {}
          },
          state: neuron.state,
          old: neuron.old,
          activation: neuron.activation,
          bias: neuron.bias,
          layer: list[i].layer
        };

        copy.squash = neuron.squash == _Neuron2.default.squash.LOGISTIC ? 'LOGISTIC' : neuron.squash == _Neuron2.default.squash.TANH ? 'TANH' : neuron.squash == _Neuron2.default.squash.IDENTITY ? 'IDENTITY' : neuron.squash == _Neuron2.default.squash.HLIM ? 'HLIM' : neuron.squash == _Neuron2.default.squash.RELU ? 'RELU' : null;

        neurons.push(copy);
      }

      for (var i = 0; i < list.length; i++) {
        var neuron = list[i].neuron;
        while (neuron.neuron) {
          neuron = neuron.neuron;
        }for (var j in neuron.connections.projected) {
          var connection = neuron.connections.projected[j];
          connections.push({
            from: ids[connection.from.ID],
            to: ids[connection.to.ID],
            weight: connection.weight,
            gater: connection.gater ? ids[connection.gater.ID] : null
          });
        }
        if (neuron.selfconnected()) {
          connections.push({
            from: ids[neuron.ID],
            to: ids[neuron.ID],
            weight: neuron.selfconnection.weight,
            gater: neuron.selfconnection.gater ? ids[neuron.selfconnection.gater.ID] : null
          });
        }
      }

      return {
        neurons: neurons,
        connections: connections
      };
    }

    // export the topology into dot language which can be visualized as graphs using dot
    /* example: ... console.log(net.toDotLang());
                $ node example.js > example.dot
                $ dot example.dot -Tpng > out.png
    */

  }, {
    key: 'toDot',
    value: function toDot(edgeConnection) {
      if (!(typeof edgeConnection === 'undefined' ? 'undefined' : _typeof(edgeConnection))) edgeConnection = false;
      var code = 'digraph nn {\n    rankdir = BT\n';
      var layers = [this.layers.input].concat(this.layers.hidden, this.layers.output);
      for (var i = 0; i < layers.length; i++) {
        for (var j = 0; j < layers[i].connectedTo.length; j++) {
          // projections
          var connection = layers[i].connectedTo[j];
          var layerTo = connection.to;
          var size = connection.size;
          var layerID = layers.indexOf(layers[i]);
          var layerToID = layers.indexOf(layerTo);
          /* http://stackoverflow.com/questions/26845540/connect-edges-with-graph-dot
           * DOT does not support edge-to-edge connections
           * This workaround produces somewhat weird graphs ...
          */
          if (edgeConnection) {
            if (connection.gatedfrom.length) {
              var fakeNode = 'fake' + layerID + '_' + layerToID;
              code += '    ' + fakeNode + ' [label = "", shape = point, width = 0.01, height = 0.01]\n';
              code += '    ' + layerID + ' -> ' + fakeNode + ' [label = ' + size + ', arrowhead = none]\n';
              code += '    ' + fakeNode + ' -> ' + layerToID + '\n';
            } else code += '    ' + layerID + ' -> ' + layerToID + ' [label = ' + size + ']\n';
            for (var from in connection.gatedfrom) {
              // gatings
              var layerfrom = connection.gatedfrom[from].layer;
              var layerfromID = layers.indexOf(layerfrom);
              code += '    ' + layerfromID + ' -> ' + fakeNode + ' [color = blue]\n';
            }
          } else {
            code += '    ' + layerID + ' -> ' + layerToID + ' [label = ' + size + ']\n';
            for (var from in connection.gatedfrom) {
              // gatings
              var layerfrom = connection.gatedfrom[from].layer;
              var layerfromID = layers.indexOf(layerfrom);
              code += '    ' + layerfromID + ' -> ' + layerToID + ' [color = blue]\n';
            }
          }
        }
      }
      code += '}\n';
      return {
        code: code,
        link: 'https://chart.googleapis.com/chart?chl=' + escape(code.replace('/ /g', '+')) + '&cht=gv'
      };
    }

    // returns a function that works as the activation of the network and can be used without depending on the library

  }, {
    key: 'standalone',
    value: function standalone() {
      if (!this.optimized) this.optimize();

      var data = this.optimized.data;

      // build activation function
      var activation = 'function (input) {\n';

      // build inputs
      for (var i = 0; i < data.inputs.length; i++) {
        activation += 'F[' + data.inputs[i] + '] = input[' + i + '];\n';
      } // build network activation
      for (var i = 0; i < data.activate.length; i++) {
        // shouldn't this be layer?
        for (var j = 0; j < data.activate[i].length; j++) {
          activation += data.activate[i][j].join('') + '\n';
        }
      }

      // build outputs
      activation += 'var output = [];\n';
      for (var i = 0; i < data.outputs.length; i++) {
        activation += 'output[' + i + '] = F[' + data.outputs[i] + '];\n';
      }activation += 'return output;\n}';

      // reference all the positions in memory
      var memory = activation.match(/F\[(\d+)\]/g);
      var dimension = 0;
      var ids = {};

      for (var i = 0; i < memory.length; i++) {
        var tmp = memory[i].match(/\d+/)[0];
        if (!(tmp in ids)) {
          ids[tmp] = dimension++;
        }
      }
      var hardcode = 'F = {\n';

      for (var i in ids) {
        hardcode += ids[i] + ': ' + this.optimized.memory[i] + ',\n';
      }hardcode = hardcode.substring(0, hardcode.length - 2) + '\n};\n';
      hardcode = 'var run = ' + activation.replace(/F\[(\d+)]/g, function (index) {
        return 'F[' + ids[index.match(/\d+/)[0]] + ']';
      }).replace('{\n', '{\n' + hardcode + '') + ';\n';
      hardcode += 'return run';

      // return standalone function
      return new Function(hardcode)();
    }

    // Return a HTML5 WebWorker specialized on training the network stored in `memory`.
    // Train based on the given dataSet and options.
    // The worker returns the updated `memory` when done.

  }, {
    key: 'worker',
    value: function worker(memory, set, options) {
      // Copy the options and set defaults (options might be different for each worker)
      var workerOptions = {};
      if (options) workerOptions = options;
      workerOptions.rate = workerOptions.rate || .2;
      workerOptions.iterations = workerOptions.iterations || 100000;
      workerOptions.error = workerOptions.error || .005;
      workerOptions.cost = workerOptions.cost || null;
      workerOptions.crossValidate = workerOptions.crossValidate || null;

      // Cost function might be different for each worker
      var costFunction = '// REPLACED BY WORKER\nvar cost = ' + (options && options.cost || this.cost || _Trainer2.default.cost.MSE) + ';\n';
      var workerFunction = Network.getWorkerSharedFunctions();
      workerFunction = workerFunction.replace(/var cost = options && options\.cost \|\| this\.cost \|\| Trainer\.cost\.MSE;/g, costFunction);

      // Set what we do when training is finished
      workerFunction = workerFunction.replace('return results;', 'postMessage({action: "done", message: results, memoryBuffer: F}, [F.buffer]);');

      // Replace log with postmessage
      workerFunction = workerFunction.replace('console.log(\'iterations\', iterations, \'error\', error, \'rate\', currentRate)', 'postMessage({action: \'log\', message: {\n' + 'iterations: iterations,\n' + 'error: error,\n' + 'rate: currentRate\n' + '}\n' + '})');

      // Replace schedule with postmessage
      workerFunction = workerFunction.replace('abort = this.schedule.do({ error: error, iterations: iterations, rate: currentRate })', 'postMessage({action: \'schedule\', message: {\n' + 'iterations: iterations,\n' + 'error: error,\n' + 'rate: currentRate\n' + '}\n' + '})');

      if (!this.optimized) this.optimize();

      var hardcode = 'var inputs = ' + this.optimized.data.inputs.length + ';\n';
      hardcode += 'var outputs = ' + this.optimized.data.outputs.length + ';\n';
      hardcode += 'var F =  new Float64Array([' + this.optimized.memory.toString() + ']);\n';
      hardcode += 'var activate = ' + this.optimized.activate.toString() + ';\n';
      hardcode += 'var propagate = ' + this.optimized.propagate.toString() + ';\n';
      hardcode += 'onmessage = function(e) {\n' + 'if (e.data.action == \'startTraining\') {\n' + 'train(' + JSON.stringify(set) + ',' + JSON.stringify(workerOptions) + ');\n' + '}\n' + '}';

      var workerSourceCode = workerFunction + '\n' + hardcode;
      var blob = new Blob([workerSourceCode]);
      var blobURL = window.URL.createObjectURL(blob);

      return new Worker(blobURL);
    }

    // returns a copy of the network

  }, {
    key: 'clone',
    value: function clone() {
      return Network.fromJSON(this.toJSON());
    }

    /**
     * Creates a static String to store the source code of the functions
     *  that are identical for all the workers (train, _trainSet, test)
     *
     * @return {String} Source code that can train a network inside a worker.
     * @static
     */

  }], [{
    key: 'getWorkerSharedFunctions',
    value: function getWorkerSharedFunctions() {
      // If we already computed the source code for the shared functions
      if (typeof Network._SHARED_WORKER_FUNCTIONS !== 'undefined') return Network._SHARED_WORKER_FUNCTIONS;

      // Otherwise compute and return the source code
      // We compute them by simply copying the source code of the train, _trainSet and test functions
      //  using the .toString() method

      // Load and name the train function
      var train_f = _Trainer2.default.prototype.train.toString();
      train_f = train_f.replace(/this._trainSet/g, '_trainSet');
      train_f = train_f.replace(/this.test/g, 'test');
      train_f = train_f.replace(/this.crossValidate/g, 'crossValidate');
      train_f = train_f.replace('crossValidate = true', '// REMOVED BY WORKER');

      // Load and name the _trainSet function
      var _trainSet_f = _Trainer2.default.prototype._trainSet.toString().replace(/this.network./g, '');

      // Load and name the test function
      var test_f = _Trainer2.default.prototype.test.toString().replace(/this.network./g, '');

      return Network._SHARED_WORKER_FUNCTIONS = train_f + '\n' + _trainSet_f + '\n' + test_f;
    }
  }, {
    key: 'fromJSON',
    value: function fromJSON(json) {
      var neurons = [];

      var layers = {
        input: new _Layer2.default(),
        hidden: [],
        output: new _Layer2.default()
      };

      for (var i = 0; i < json.neurons.length; i++) {
        var config = json.neurons[i];

        var neuron = new _Neuron2.default();
        neuron.trace.elegibility = {};
        neuron.trace.extended = {};
        neuron.state = config.state;
        neuron.old = config.old;
        neuron.activation = config.activation;
        neuron.bias = config.bias;
        neuron.squash = config.squash in _Neuron2.default.squash ? _Neuron2.default.squash[config.squash] : _Neuron2.default.squash.LOGISTIC;
        neurons.push(neuron);

        if (config.layer == 'input') layers.input.add(neuron);else if (config.layer == 'output') layers.output.add(neuron);else {
          if (typeof layers.hidden[config.layer] == 'undefined') layers.hidden[config.layer] = new _Layer2.default();
          layers.hidden[config.layer].add(neuron);
        }
      }

      for (var i = 0; i < json.connections.length; i++) {
        var config = json.connections[i];
        var from = neurons[config.from];
        var to = neurons[config.to];
        var weight = config.weight;
        var gater = neurons[config.gater];

        var connection = from.project(to, weight);
        if (gater) gater.gate(connection);
      }

      return new Network(layers);
    }
  }]);

  return Network;
}();

exports.default = Network;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Connection = __webpack_require__(5);

var _Connection2 = _interopRequireDefault(_Connection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var neurons = 0;

// squashing functions
var squash = {
  // eq. 5 & 5'
  LOGISTIC: function LOGISTIC(x, derivate) {
    var fx = 1 / (1 + Math.exp(-x));
    if (!derivate) return fx;
    return fx * (1 - fx);
  },
  TANH: function TANH(x, derivate) {
    if (derivate) return 1 - Math.pow(Math.tanh(x), 2);
    return Math.tanh(x);
  },
  IDENTITY: function IDENTITY(x, derivate) {
    return derivate ? 1 : x;
  },
  HLIM: function HLIM(x, derivate) {
    return derivate ? 1 : x > 0 ? 1 : 0;
  },
  RELU: function RELU(x, derivate) {
    if (derivate) return x > 0 ? 1 : 0;
    return x > 0 ? x : 0;
  }
};

var Neuron = function () {
  function Neuron() {
    _classCallCheck(this, Neuron);

    this.ID = Neuron.uid();

    this.connections = {
      inputs: {},
      projected: {},
      gated: {}
    };
    this.error = {
      responsibility: 0,
      projected: 0,
      gated: 0
    };
    this.trace = {
      elegibility: {},
      extended: {},
      influences: {}
    };
    this.state = 0;
    this.old = 0;
    this.activation = 0;
    this.selfconnection = new _Connection2.default(this, this, 0); // weight = 0 -> not connected
    this.squash = Neuron.squash.LOGISTIC;
    this.neighboors = {};
    this.bias = Math.random() * .2 - .1;
  }

  // activate the neuron


  _createClass(Neuron, [{
    key: 'activate',
    value: function activate(input) {
      // activation from enviroment (for input neurons)
      if (typeof input != 'undefined') {
        this.activation = input;
        this.derivative = 0;
        this.bias = 0;
        return this.activation;
      }

      // old state
      this.old = this.state;

      // eq. 15
      this.state = this.selfconnection.gain * this.selfconnection.weight * this.state + this.bias;

      for (var i in this.connections.inputs) {
        var input = this.connections.inputs[i];
        this.state += input.from.activation * input.weight * input.gain;
      }

      // eq. 16
      this.activation = this.squash(this.state);

      // f'(s)
      this.derivative = this.squash(this.state, true);

      // update traces
      var influences = [];
      for (var id in this.trace.extended) {
        // extended elegibility trace
        var neuron = this.neighboors[id];

        // if gated neuron's selfconnection is gated by this unit, the influence keeps track of the neuron's old state
        var influence = neuron.selfconnection.gater == this ? neuron.old : 0;

        // index runs over all the incoming connections to the gated neuron that are gated by this unit
        for (var incoming in this.trace.influences[neuron.ID]) {
          // captures the effect that has an input connection to this unit, on a neuron that is gated by this unit
          influence += this.trace.influences[neuron.ID][incoming].weight * this.trace.influences[neuron.ID][incoming].from.activation;
        }
        influences[neuron.ID] = influence;
      }

      for (var i in this.connections.inputs) {
        var input = this.connections.inputs[i];

        // elegibility trace - Eq. 17
        this.trace.elegibility[input.ID] = this.selfconnection.gain * this.selfconnection.weight * this.trace.elegibility[input.ID] + input.gain * input.from.activation;

        for (var id in this.trace.extended) {
          // extended elegibility trace
          var xtrace = this.trace.extended[id];
          var neuron = this.neighboors[id];
          var influence = influences[neuron.ID];

          // eq. 18
          xtrace[input.ID] = neuron.selfconnection.gain * neuron.selfconnection.weight * xtrace[input.ID] + this.derivative * this.trace.elegibility[input.ID] * influence;
        }
      }

      //  update gated connection's gains
      for (var connection in this.connections.gated) {
        this.connections.gated[connection].gain = this.activation;
      }

      return this.activation;
    }

    // back-propagate the error

  }, {
    key: 'propagate',
    value: function propagate(rate, target) {
      // error accumulator
      var error = 0;

      // whether or not this neuron is in the output layer
      var isOutput = typeof target != 'undefined';

      // output neurons get their error from the enviroment
      if (isOutput) this.error.responsibility = this.error.projected = target - this.activation; // Eq. 10

      else // the rest of the neuron compute their error responsibilities by backpropagation
        {
          // error responsibilities from all the connections projected from this neuron
          for (var id in this.connections.projected) {
            var connection = this.connections.projected[id];
            var neuron = connection.to;
            // Eq. 21
            error += neuron.error.responsibility * connection.gain * connection.weight;
          }

          // projected error responsibility
          this.error.projected = this.derivative * error;

          error = 0;
          // error responsibilities from all the connections gated by this neuron
          for (var id in this.trace.extended) {
            var neuron = this.neighboors[id]; // gated neuron
            var influence = neuron.selfconnection.gater == this ? neuron.old : 0; // if gated neuron's selfconnection is gated by this neuron

            // index runs over all the connections to the gated neuron that are gated by this neuron
            for (var input in this.trace.influences[id]) {
              // captures the effect that the input connection of this neuron have, on a neuron which its input/s is/are gated by this neuron
              influence += this.trace.influences[id][input].weight * this.trace.influences[neuron.ID][input].from.activation;
            }
            // eq. 22
            error += neuron.error.responsibility * influence;
          }

          // gated error responsibility
          this.error.gated = this.derivative * error;

          // error responsibility - Eq. 23
          this.error.responsibility = this.error.projected + this.error.gated;
        }

      // learning rate
      rate = rate || .1;

      // adjust all the neuron's incoming connections
      for (var id in this.connections.inputs) {
        var input = this.connections.inputs[id];

        // Eq. 24
        var gradient = this.error.projected * this.trace.elegibility[input.ID];
        for (var id in this.trace.extended) {
          var neuron = this.neighboors[id];
          gradient += neuron.error.responsibility * this.trace.extended[neuron.ID][input.ID];
        }
        input.weight += rate * gradient; // adjust weights - aka learn
      }

      // adjust bias
      this.bias += rate * this.error.responsibility;
    }
  }, {
    key: 'project',
    value: function project(neuron, weight) {
      // self-connection
      if (neuron == this) {
        this.selfconnection.weight = 1;
        return this.selfconnection;
      }

      // check if connection already exists
      var connected = this.connected(neuron);
      if (connected && connected.type == 'projected') {
        // update connection
        if (typeof weight != 'undefined') connected.connection.weight = weight;
        // return existing connection
        return connected.connection;
      } else {
        // create a new connection
        var connection = new _Connection2.default(this, neuron, weight);
      }

      // reference all the connections and traces
      this.connections.projected[connection.ID] = connection;
      this.neighboors[neuron.ID] = neuron;
      neuron.connections.inputs[connection.ID] = connection;
      neuron.trace.elegibility[connection.ID] = 0;

      for (var id in neuron.trace.extended) {
        var trace = neuron.trace.extended[id];
        trace[connection.ID] = 0;
      }

      return connection;
    }
  }, {
    key: 'gate',
    value: function gate(connection) {
      // add connection to gated list
      this.connections.gated[connection.ID] = connection;

      var neuron = connection.to;
      if (!(neuron.ID in this.trace.extended)) {
        // extended trace
        this.neighboors[neuron.ID] = neuron;
        var xtrace = this.trace.extended[neuron.ID] = {};
        for (var id in this.connections.inputs) {
          var input = this.connections.inputs[id];
          xtrace[input.ID] = 0;
        }
      }

      // keep track
      if (neuron.ID in this.trace.influences) this.trace.influences[neuron.ID].push(connection);else this.trace.influences[neuron.ID] = [connection];

      // set gater
      connection.gater = this;
    }

    // returns true or false whether the neuron is self-connected or not

  }, {
    key: 'selfconnected',
    value: function selfconnected() {
      return this.selfconnection.weight !== 0;
    }

    // returns true or false whether the neuron is connected to another neuron (parameter)

  }, {
    key: 'connected',
    value: function connected(neuron) {
      var result = {
        type: null,
        connection: false
      };

      if (this == neuron) {
        if (this.selfconnected()) {
          result.type = 'selfconnection';
          result.connection = this.selfconnection;
          return result;
        } else return false;
      }

      for (var type in this.connections) {
        for (var connection in this.connections[type]) {
          var connection = this.connections[type][connection];
          if (connection.to == neuron) {
            result.type = type;
            result.connection = connection;
            return result;
          } else if (connection.from == neuron) {
            result.type = type;
            result.connection = connection;
            return result;
          }
        }
      }

      return false;
    }

    // clears all the traces (the neuron forgets it's context, but the connections remain intact)

  }, {
    key: 'clear',
    value: function clear() {
      for (var trace in this.trace.elegibility) {
        this.trace.elegibility[trace] = 0;
      }

      for (var trace in this.trace.extended) {
        for (var extended in this.trace.extended[trace]) {
          this.trace.extended[trace][extended] = 0;
        }
      }

      this.error.responsibility = this.error.projected = this.error.gated = 0;
    }

    // all the connections are randomized and the traces are cleared

  }, {
    key: 'reset',
    value: function reset() {
      this.clear();

      for (var type in this.connections) {
        for (var connection in this.connections[type]) {
          this.connections[type][connection].weight = Math.random() * .2 - .1;
        }
      }

      this.bias = Math.random() * .2 - .1;
      this.old = this.state = this.activation = 0;
    }

    // hardcodes the behaviour of the neuron into an optimized function

  }, {
    key: 'optimize',
    value: function optimize(optimized, layer) {

      optimized = optimized || {};
      var store_activation = [];
      var store_trace = [];
      var store_propagation = [];
      var varID = optimized.memory || 0;
      var neurons = optimized.neurons || 1;
      var inputs = optimized.inputs || [];
      var targets = optimized.targets || [];
      var outputs = optimized.outputs || [];
      var variables = optimized.variables || {};
      var activation_sentences = optimized.activation_sentences || [];
      var trace_sentences = optimized.trace_sentences || [];
      var propagation_sentences = optimized.propagation_sentences || [];
      var layers = optimized.layers || { __count: 0, __neuron: 0 };

      // allocate sentences
      var allocate = function allocate(store) {
        var allocated = layer in layers && store[layers.__count];
        if (!allocated) {
          layers.__count = store.push([]) - 1;
          layers[layer] = layers.__count;
        }
      };
      allocate(activation_sentences);
      allocate(trace_sentences);
      allocate(propagation_sentences);
      var currentLayer = layers.__count;

      // get/reserve space in memory by creating a unique ID for a variablel
      var getVar = function getVar() {
        var args = Array.prototype.slice.call(arguments);

        if (args.length == 1) {
          if (args[0] == 'target') {
            var id = 'target_' + targets.length;
            targets.push(varID);
          } else var id = args[0];
          if (id in variables) return variables[id];
          return variables[id] = {
            value: 0,
            id: varID++
          };
        } else {
          var extended = args.length > 2;
          if (extended) var value = args.pop();

          var unit = args.shift();
          var prop = args.pop();

          if (!extended) var value = unit[prop];

          var id = prop + '_';
          for (var i = 0; i < args.length; i++) {
            id += args[i] + '_';
          }id += unit.ID;
          if (id in variables) return variables[id];

          return variables[id] = {
            value: value,
            id: varID++
          };
        }
      };

      // build sentence
      var buildSentence = function buildSentence() {
        var args = Array.prototype.slice.call(arguments);
        var store = args.pop();
        var sentence = '';
        for (var i = 0; i < args.length; i++) {
          if (typeof args[i] == 'string') sentence += args[i];else sentence += 'F[' + args[i].id + ']';
        }store.push(sentence + ';');
      };

      // helper to check if an object is empty
      var isEmpty = function isEmpty(obj) {
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) return false;
        }
        return true;
      };

      // characteristics of the neuron
      var noProjections = isEmpty(this.connections.projected);
      var noGates = isEmpty(this.connections.gated);
      var isInput = layer == 'input' ? true : isEmpty(this.connections.inputs);
      var isOutput = layer == 'output' ? true : noProjections && noGates;

      // optimize neuron's behaviour
      var rate = getVar('rate');
      var activation = getVar(this, 'activation');
      if (isInput) inputs.push(activation.id);else {
        activation_sentences[currentLayer].push(store_activation);
        trace_sentences[currentLayer].push(store_trace);
        propagation_sentences[currentLayer].push(store_propagation);
        var old = getVar(this, 'old');
        var state = getVar(this, 'state');
        var bias = getVar(this, 'bias');
        if (this.selfconnection.gater) var self_gain = getVar(this.selfconnection, 'gain');
        if (this.selfconnected()) var self_weight = getVar(this.selfconnection, 'weight');
        buildSentence(old, ' = ', state, store_activation);
        if (this.selfconnected()) {
          if (this.selfconnection.gater) buildSentence(state, ' = ', self_gain, ' * ', self_weight, ' * ', state, ' + ', bias, store_activation);else buildSentence(state, ' = ', self_weight, ' * ', state, ' + ', bias, store_activation);
        } else buildSentence(state, ' = ', bias, store_activation);
        for (var i in this.connections.inputs) {
          var input = this.connections.inputs[i];
          var input_activation = getVar(input.from, 'activation');
          var input_weight = getVar(input, 'weight');
          if (input.gater) var input_gain = getVar(input, 'gain');
          if (this.connections.inputs[i].gater) buildSentence(state, ' += ', input_activation, ' * ', input_weight, ' * ', input_gain, store_activation);else buildSentence(state, ' += ', input_activation, ' * ', input_weight, store_activation);
        }
        var derivative = getVar(this, 'derivative');
        switch (this.squash) {
          case Neuron.squash.LOGISTIC:
            buildSentence(activation, ' = (1 / (1 + Math.exp(-', state, ')))', store_activation);
            buildSentence(derivative, ' = ', activation, ' * (1 - ', activation, ')', store_activation);
            break;
          case Neuron.squash.TANH:
            var eP = getVar('aux');
            var eN = getVar('aux_2');
            buildSentence(eP, ' = Math.exp(', state, ')', store_activation);
            buildSentence(eN, ' = 1 / ', eP, store_activation);
            buildSentence(activation, ' = (', eP, ' - ', eN, ') / (', eP, ' + ', eN, ')', store_activation);
            buildSentence(derivative, ' = 1 - (', activation, ' * ', activation, ')', store_activation);
            break;
          case Neuron.squash.IDENTITY:
            buildSentence(activation, ' = ', state, store_activation);
            buildSentence(derivative, ' = 1', store_activation);
            break;
          case Neuron.squash.HLIM:
            buildSentence(activation, ' = +(', state, ' > 0)', store_activation);
            buildSentence(derivative, ' = 1', store_activation);
            break;
          case Neuron.squash.RELU:
            buildSentence(activation, ' = ', state, ' > 0 ? ', state, ' : 0', store_activation);
            buildSentence(derivative, ' = ', state, ' > 0 ? 1 : 0', store_activation);
            break;
        }

        for (var id in this.trace.extended) {
          // calculate extended elegibility traces in advance
          var neuron = this.neighboors[id];
          var influence = getVar('influences[' + neuron.ID + ']');
          var neuron_old = getVar(neuron, 'old');
          var initialized = false;
          if (neuron.selfconnection.gater == this) {
            buildSentence(influence, ' = ', neuron_old, store_trace);
            initialized = true;
          }
          for (var incoming in this.trace.influences[neuron.ID]) {
            var incoming_weight = getVar(this.trace.influences[neuron.ID][incoming], 'weight');
            var incoming_activation = getVar(this.trace.influences[neuron.ID][incoming].from, 'activation');

            if (initialized) buildSentence(influence, ' += ', incoming_weight, ' * ', incoming_activation, store_trace);else {
              buildSentence(influence, ' = ', incoming_weight, ' * ', incoming_activation, store_trace);
              initialized = true;
            }
          }
        }

        for (var i in this.connections.inputs) {
          var input = this.connections.inputs[i];
          if (input.gater) var input_gain = getVar(input, 'gain');
          var input_activation = getVar(input.from, 'activation');
          var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace.elegibility[input.ID]);
          if (this.selfconnected()) {
            if (this.selfconnection.gater) {
              if (input.gater) buildSentence(trace, ' = ', self_gain, ' * ', self_weight, ' * ', trace, ' + ', input_gain, ' * ', input_activation, store_trace);else buildSentence(trace, ' = ', self_gain, ' * ', self_weight, ' * ', trace, ' + ', input_activation, store_trace);
            } else {
              if (input.gater) buildSentence(trace, ' = ', self_weight, ' * ', trace, ' + ', input_gain, ' * ', input_activation, store_trace);else buildSentence(trace, ' = ', self_weight, ' * ', trace, ' + ', input_activation, store_trace);
            }
          } else {
            if (input.gater) buildSentence(trace, ' = ', input_gain, ' * ', input_activation, store_trace);else buildSentence(trace, ' = ', input_activation, store_trace);
          }
          for (var id in this.trace.extended) {
            // extended elegibility trace
            var neuron = this.neighboors[id];
            var influence = getVar('influences[' + neuron.ID + ']');

            var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace.elegibility[input.ID]);
            var xtrace = getVar(this, 'trace', 'extended', neuron.ID, input.ID, this.trace.extended[neuron.ID][input.ID]);
            if (neuron.selfconnected()) var neuron_self_weight = getVar(neuron.selfconnection, 'weight');
            if (neuron.selfconnection.gater) var neuron_self_gain = getVar(neuron.selfconnection, 'gain');
            if (neuron.selfconnected()) {
              if (neuron.selfconnection.gater) buildSentence(xtrace, ' = ', neuron_self_gain, ' * ', neuron_self_weight, ' * ', xtrace, ' + ', derivative, ' * ', trace, ' * ', influence, store_trace);else buildSentence(xtrace, ' = ', neuron_self_weight, ' * ', xtrace, ' + ', derivative, ' * ', trace, ' * ', influence, store_trace);
            } else buildSentence(xtrace, ' = ', derivative, ' * ', trace, ' * ', influence, store_trace);
          }
        }
        for (var connection in this.connections.gated) {
          var gated_gain = getVar(this.connections.gated[connection], 'gain');
          buildSentence(gated_gain, ' = ', activation, store_activation);
        }
      }
      if (!isInput) {
        var responsibility = getVar(this, 'error', 'responsibility', this.error.responsibility);
        if (isOutput) {
          var target = getVar('target');
          buildSentence(responsibility, ' = ', target, ' - ', activation, store_propagation);
          for (var id in this.connections.inputs) {
            var input = this.connections.inputs[id];
            var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace.elegibility[input.ID]);
            var input_weight = getVar(input, 'weight');
            buildSentence(input_weight, ' += ', rate, ' * (', responsibility, ' * ', trace, ')', store_propagation);
          }
          outputs.push(activation.id);
        } else {
          if (!noProjections && !noGates) {
            var error = getVar('aux');
            for (var id in this.connections.projected) {
              var connection = this.connections.projected[id];
              var neuron = connection.to;
              var connection_weight = getVar(connection, 'weight');
              var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
              if (connection.gater) {
                var connection_gain = getVar(connection, 'gain');
                buildSentence(error, ' += ', neuron_responsibility, ' * ', connection_gain, ' * ', connection_weight, store_propagation);
              } else buildSentence(error, ' += ', neuron_responsibility, ' * ', connection_weight, store_propagation);
            }
            var projected = getVar(this, 'error', 'projected', this.error.projected);
            buildSentence(projected, ' = ', derivative, ' * ', error, store_propagation);
            buildSentence(error, ' = 0', store_propagation);
            for (var id in this.trace.extended) {
              var neuron = this.neighboors[id];
              var influence = getVar('aux_2');
              var neuron_old = getVar(neuron, 'old');
              if (neuron.selfconnection.gater == this) buildSentence(influence, ' = ', neuron_old, store_propagation);else buildSentence(influence, ' = 0', store_propagation);
              for (var input in this.trace.influences[neuron.ID]) {
                var connection = this.trace.influences[neuron.ID][input];
                var connection_weight = getVar(connection, 'weight');
                var neuron_activation = getVar(connection.from, 'activation');
                buildSentence(influence, ' += ', connection_weight, ' * ', neuron_activation, store_propagation);
              }
              var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
              buildSentence(error, ' += ', neuron_responsibility, ' * ', influence, store_propagation);
            }
            var gated = getVar(this, 'error', 'gated', this.error.gated);
            buildSentence(gated, ' = ', derivative, ' * ', error, store_propagation);
            buildSentence(responsibility, ' = ', projected, ' + ', gated, store_propagation);
            for (var id in this.connections.inputs) {
              var input = this.connections.inputs[id];
              var gradient = getVar('aux');
              var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace.elegibility[input.ID]);
              buildSentence(gradient, ' = ', projected, ' * ', trace, store_propagation);
              for (var id in this.trace.extended) {
                var neuron = this.neighboors[id];
                var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
                var xtrace = getVar(this, 'trace', 'extended', neuron.ID, input.ID, this.trace.extended[neuron.ID][input.ID]);
                buildSentence(gradient, ' += ', neuron_responsibility, ' * ', xtrace, store_propagation);
              }
              var input_weight = getVar(input, 'weight');
              buildSentence(input_weight, ' += ', rate, ' * ', gradient, store_propagation);
            }
          } else if (noGates) {
            buildSentence(responsibility, ' = 0', store_propagation);
            for (var id in this.connections.projected) {
              var connection = this.connections.projected[id];
              var neuron = connection.to;
              var connection_weight = getVar(connection, 'weight');
              var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
              if (connection.gater) {
                var connection_gain = getVar(connection, 'gain');
                buildSentence(responsibility, ' += ', neuron_responsibility, ' * ', connection_gain, ' * ', connection_weight, store_propagation);
              } else buildSentence(responsibility, ' += ', neuron_responsibility, ' * ', connection_weight, store_propagation);
            }
            buildSentence(responsibility, ' *= ', derivative, store_propagation);
            for (var id in this.connections.inputs) {
              var input = this.connections.inputs[id];
              var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace.elegibility[input.ID]);
              var input_weight = getVar(input, 'weight');
              buildSentence(input_weight, ' += ', rate, ' * (', responsibility, ' * ', trace, ')', store_propagation);
            }
          } else if (noProjections) {
            buildSentence(responsibility, ' = 0', store_propagation);
            for (var id in this.trace.extended) {
              var neuron = this.neighboors[id];
              var influence = getVar('aux');
              var neuron_old = getVar(neuron, 'old');
              if (neuron.selfconnection.gater == this) buildSentence(influence, ' = ', neuron_old, store_propagation);else buildSentence(influence, ' = 0', store_propagation);
              for (var input in this.trace.influences[neuron.ID]) {
                var connection = this.trace.influences[neuron.ID][input];
                var connection_weight = getVar(connection, 'weight');
                var neuron_activation = getVar(connection.from, 'activation');
                buildSentence(influence, ' += ', connection_weight, ' * ', neuron_activation, store_propagation);
              }
              var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
              buildSentence(responsibility, ' += ', neuron_responsibility, ' * ', influence, store_propagation);
            }
            buildSentence(responsibility, ' *= ', derivative, store_propagation);
            for (var id in this.connections.inputs) {
              var input = this.connections.inputs[id];
              var gradient = getVar('aux');
              buildSentence(gradient, ' = 0', store_propagation);
              for (var id in this.trace.extended) {
                var neuron = this.neighboors[id];
                var neuron_responsibility = getVar(neuron, 'error', 'responsibility', neuron.error.responsibility);
                var xtrace = getVar(this, 'trace', 'extended', neuron.ID, input.ID, this.trace.extended[neuron.ID][input.ID]);
                buildSentence(gradient, ' += ', neuron_responsibility, ' * ', xtrace, store_propagation);
              }
              var input_weight = getVar(input, 'weight');
              buildSentence(input_weight, ' += ', rate, ' * ', gradient, store_propagation);
            }
          }
        }
        buildSentence(bias, ' += ', rate, ' * ', responsibility, store_propagation);
      }
      return {
        memory: varID,
        neurons: neurons + 1,
        inputs: inputs,
        outputs: outputs,
        targets: targets,
        variables: variables,
        activation_sentences: activation_sentences,
        trace_sentences: trace_sentences,
        propagation_sentences: propagation_sentences,
        layers: layers
      };
    }
  }], [{
    key: 'uid',
    value: function uid() {
      return neurons++;
    }
  }, {
    key: 'quantity',
    value: function quantity() {
      return {
        neurons: neurons,
        connections: _Connection.connections
      };
    }
  }]);

  return Neuron;
}();

Neuron.squash = squash;
exports.default = Neuron;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffleInplace(o) {
  //v1.0
  for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x) {}
  return o;
};

// Built-in cost functions
var cost = {
  // Eq. 9
  CROSS_ENTROPY: function CROSS_ENTROPY(target, output) {
    var crossentropy = 0;
    for (var i in output) {
      crossentropy -= target[i] * Math.log(output[i] + 1e-15) + (1 - target[i]) * Math.log(1 + 1e-15 - output[i]);
    } // +1e-15 is a tiny push away to avoid Math.log(0)
    return crossentropy;
  },
  MSE: function MSE(target, output) {
    var mse = 0;
    for (var i = 0; i < output.length; i++) {
      mse += Math.pow(target[i] - output[i], 2);
    }return mse / output.length;
  },
  BINARY: function BINARY(target, output) {
    var misses = 0;
    for (var i = 0; i < output.length; i++) {
      misses += Math.round(target[i] * 2) != Math.round(output[i] * 2);
    }return misses;
  }
};

var Trainer = function () {
  function Trainer(network, options) {
    _classCallCheck(this, Trainer);

    options = options || {};
    this.network = network;
    this.rate = options.rate || .2;
    this.iterations = options.iterations || 100000;
    this.error = options.error || .005;
    this.cost = options.cost || null;
    this.crossValidate = options.crossValidate || null;
  }

  // trains any given set to a network


  _createClass(Trainer, [{
    key: 'train',
    value: function train(set, options) {
      var error = 1;
      var iterations = bucketSize = 0;
      var abort = false;
      var currentRate;
      var cost = options && options.cost || this.cost || Trainer.cost.MSE;
      var crossValidate = false,
          testSet,
          trainSet;

      var start = Date.now();

      if (options) {
        if (options.iterations) this.iterations = options.iterations;
        if (options.error) this.error = options.error;
        if (options.rate) this.rate = options.rate;
        if (options.cost) this.cost = options.cost;
        if (options.schedule) this.schedule = options.schedule;
        if (options.customLog) {
          // for backward compatibility with code that used customLog
          console.log('Deprecated: use schedule instead of customLog');
          this.schedule = options.customLog;
        }
        if (this.crossValidate || options.crossValidate) {
          if (!this.crossValidate) this.crossValidate = {};
          crossValidate = true;
          if (options.crossValidate.testSize) this.crossValidate.testSize = options.crossValidate.testSize;
          if (options.crossValidate.testError) this.crossValidate.testError = options.crossValidate.testError;
        }
      }

      currentRate = this.rate;
      if (Array.isArray(this.rate)) {
        var bucketSize = Math.floor(this.iterations / this.rate.length);
      }

      if (crossValidate) {
        var numTrain = Math.ceil((1 - this.crossValidate.testSize) * set.length);
        trainSet = set.slice(0, numTrain);
        testSet = set.slice(numTrain);
      }

      var lastError = 0;
      while (!abort && iterations < this.iterations && error > this.error) {
        if (crossValidate && error <= this.crossValidate.testError) {
          break;
        }

        var currentSetSize = set.length;
        error = 0;
        iterations++;

        if (bucketSize > 0) {
          var currentBucket = Math.floor(iterations / bucketSize);
          currentRate = this.rate[currentBucket] || currentRate;
        }

        if (typeof this.rate === 'function') {
          currentRate = this.rate(iterations, lastError);
        }

        if (crossValidate) {
          this._trainSet(trainSet, currentRate, cost);
          error += this.test(testSet).error;
          currentSetSize = 1;
        } else {
          error += this._trainSet(set, currentRate, cost);
          currentSetSize = set.length;
        }

        // check error
        error /= currentSetSize;
        lastError = error;

        if (options) {
          if (this.schedule && this.schedule.every && iterations % this.schedule.every == 0) abort = this.schedule.do({ error: error, iterations: iterations, rate: currentRate });else if (options.log && iterations % options.log == 0) {
            console.log('iterations', iterations, 'error', error, 'rate', currentRate);
          }
          ;
          if (options.shuffle) shuffleInplace(set);
        }
      }

      var results = {
        error: error,
        iterations: iterations,
        time: Date.now() - start
      };

      return results;
    }

    // trains any given set to a network, using a WebWorker (only for the browser). Returns a Promise of the results.

  }, {
    key: 'trainAsync',
    value: function trainAsync(set, options) {
      var train = this.workerTrain.bind(this);
      return new Promise(function (resolve, reject) {
        try {
          train(set, resolve, options, true);
        } catch (e) {
          reject(e);
        }
      });
    }

    // preforms one training epoch and returns the error (private function used in this.train)

  }, {
    key: '_trainSet',
    value: function _trainSet(set, currentRate, costFunction) {
      var errorSum = 0;
      for (var i = 0; i < set.length; i++) {
        var input = set[i].input;
        var target = set[i].output;

        var output = this.network.activate(input);
        this.network.propagate(currentRate, target);

        errorSum += costFunction(target, output);
      }
      return errorSum;
    }

    // tests a set and returns the error and elapsed time

  }, {
    key: 'test',
    value: function test(set, options) {
      var error = 0;
      var input, output, target;
      var cost = options && options.cost || this.cost || Trainer.cost.MSE;

      var start = Date.now();

      for (var i = 0; i < set.length; i++) {
        input = set[i].input;
        target = set[i].output;
        output = this.network.activate(input);
        error += cost(target, output);
      }

      error /= set.length;

      var results = {
        error: error,
        time: Date.now() - start
      };

      return results;
    }

    // trains any given set to a network using a WebWorker [deprecated: use trainAsync instead]

  }, {
    key: 'workerTrain',
    value: function workerTrain(set, callback, options, suppressWarning) {
      if (!suppressWarning) {
        console.warn('Deprecated: do not use `workerTrain`, use `trainAsync` instead.');
      }
      var that = this;

      if (!this.network.optimized) this.network.optimize();

      // Create a new worker
      var worker = this.network.worker(this.network.optimized.memory, set, options);

      // train the worker
      worker.onmessage = function (e) {
        switch (e.data.action) {
          case 'done':
            var iterations = e.data.message.iterations;
            var error = e.data.message.error;
            var time = e.data.message.time;

            that.network.optimized.ownership(e.data.memoryBuffer);

            // Done callback
            callback({
              error: error,
              iterations: iterations,
              time: time
            });

            // Delete the worker and all its associated memory
            worker.terminate();
            break;

          case 'log':
            console.log(e.data.message);

          case 'schedule':
            if (options && options.schedule && typeof options.schedule.do === 'function') {
              var scheduled = options.schedule.do;
              scheduled(e.data.message);
            }
            break;
        }
      };

      // Start the worker
      worker.postMessage({ action: 'startTraining' });
    }

    // trains an XOR to the network

  }, {
    key: 'XOR',
    value: function XOR(options) {
      if (this.network.inputs() != 2 || this.network.outputs() != 1) throw new Error('Incompatible network (2 inputs, 1 output)');

      var defaults = {
        iterations: 100000,
        log: false,
        shuffle: true,
        cost: Trainer.cost.MSE
      };

      if (options) for (var i in options) {
        defaults[i] = options[i];
      }return this.train([{
        input: [0, 0],
        output: [0]
      }, {
        input: [1, 0],
        output: [1]
      }, {
        input: [0, 1],
        output: [1]
      }, {
        input: [1, 1],
        output: [0]
      }], defaults);
    }

    // trains the network to pass a Distracted Sequence Recall test

  }, {
    key: 'DSR',
    value: function DSR(options) {
      options = options || {};

      var targets = options.targets || [2, 4, 7, 8];
      var distractors = options.distractors || [3, 5, 6, 9];
      var prompts = options.prompts || [0, 1];
      var length = options.length || 24;
      var criterion = options.success || 0.95;
      var iterations = options.iterations || 100000;
      var rate = options.rate || .1;
      var log = options.log || 0;
      var schedule = options.schedule || {};
      var cost = options.cost || this.cost || Trainer.cost.CROSS_ENTROPY;

      var trial, correct, i, j, success;
      trial = correct = i = j = success = 0;
      var error = 1,
          symbols = targets.length + distractors.length + prompts.length;

      var noRepeat = function noRepeat(range, avoid) {
        var number = Math.random() * range | 0;
        var used = false;
        for (var i in avoid) {
          if (number == avoid[i]) used = true;
        }return used ? noRepeat(range, avoid) : number;
      };

      var equal = function equal(prediction, output) {
        for (var i in prediction) {
          if (Math.round(prediction[i]) != output[i]) return false;
        }return true;
      };

      var start = Date.now();

      while (trial < iterations && (success < criterion || trial % 1000 != 0)) {
        // generate sequence
        var sequence = [],
            sequenceLength = length - prompts.length;
        for (i = 0; i < sequenceLength; i++) {
          var any = Math.random() * distractors.length | 0;
          sequence.push(distractors[any]);
        }
        var indexes = [],
            positions = [];
        for (i = 0; i < prompts.length; i++) {
          indexes.push(Math.random() * targets.length | 0);
          positions.push(noRepeat(sequenceLength, positions));
        }
        positions = positions.sort();
        for (i = 0; i < prompts.length; i++) {
          sequence[positions[i]] = targets[indexes[i]];
          sequence.push(prompts[i]);
        }

        //train sequence
        var distractorsCorrect;
        var targetsCorrect = distractorsCorrect = 0;
        error = 0;
        for (i = 0; i < length; i++) {
          // generate input from sequence
          var input = [];
          for (j = 0; j < symbols; j++) {
            input[j] = 0;
          }input[sequence[i]] = 1;

          // generate target output
          var output = [];
          for (j = 0; j < targets.length; j++) {
            output[j] = 0;
          }if (i >= sequenceLength) {
            var index = i - sequenceLength;
            output[indexes[index]] = 1;
          }

          // check result
          var prediction = this.network.activate(input);

          if (equal(prediction, output)) {
            if (i < sequenceLength) distractorsCorrect++;else targetsCorrect++;
          } else {
            this.network.propagate(rate, output);
          }

          error += cost(output, prediction);

          if (distractorsCorrect + targetsCorrect == length) correct++;
        }

        // calculate error
        if (trial % 1000 == 0) correct = 0;
        trial++;
        var divideError = trial % 1000;
        divideError = divideError == 0 ? 1000 : divideError;
        success = correct / divideError;
        error /= length;

        // log
        if (log && trial % log == 0) console.log('iterations:', trial, ' success:', success, ' correct:', correct, ' time:', Date.now() - start, ' error:', error);
        if (schedule.do && schedule.every && trial % schedule.every == 0) schedule.do({
          iterations: trial,
          success: success,
          error: error,
          time: Date.now() - start,
          correct: correct
        });
      }

      return {
        iterations: trial,
        success: success,
        error: error,
        time: Date.now() - start
      };
    }

    // train the network to learn an Embeded Reber Grammar

  }, {
    key: 'ERG',
    value: function ERG(options) {

      options = options || {};
      var iterations = options.iterations || 150000;
      var criterion = options.error || .05;
      var rate = options.rate || .1;
      var log = options.log || 500;
      var cost = options.cost || this.cost || Trainer.cost.CROSS_ENTROPY;

      // gramar node
      var Node = function Node() {
        this.paths = [];
      };
      Node.prototype = {
        connect: function connect(node, value) {
          this.paths.push({
            node: node,
            value: value
          });
          return this;
        },
        any: function any() {
          if (this.paths.length == 0) return false;
          var index = Math.random() * this.paths.length | 0;
          return this.paths[index];
        },
        test: function test(value) {
          for (var i in this.paths) {
            if (this.paths[i].value == value) return this.paths[i];
          }return false;
        }
      };

      var reberGrammar = function reberGrammar() {

        // build a reber grammar
        var output = new Node();
        var n1 = new Node().connect(output, 'E');
        var n2 = new Node().connect(n1, 'S');
        var n3 = new Node().connect(n1, 'V').connect(n2, 'P');
        var n4 = new Node().connect(n2, 'X');
        n4.connect(n4, 'S');
        var n5 = new Node().connect(n3, 'V');
        n5.connect(n5, 'T');
        n2.connect(n5, 'X');
        var n6 = new Node().connect(n4, 'T').connect(n5, 'P');
        var input = new Node().connect(n6, 'B');

        return {
          input: input,
          output: output
        };
      };

      // build an embeded reber grammar
      var embededReberGrammar = function embededReberGrammar() {
        var reber1 = reberGrammar();
        var reber2 = reberGrammar();

        var output = new Node();
        var n1 = new Node().connect(output, 'E');
        reber1.output.connect(n1, 'T');
        reber2.output.connect(n1, 'P');
        var n2 = new Node().connect(reber1.input, 'P').connect(reber2.input, 'T');
        var input = new Node().connect(n2, 'B');

        return {
          input: input,
          output: output
        };
      };

      // generate an ERG sequence
      var generate = function generate() {
        var node = embededReberGrammar().input;
        var next = node.any();
        var str = '';
        while (next) {
          str += next.value;
          next = next.node.any();
        }
        return str;
      };

      // test if a string matches an embeded reber grammar
      var test = function test(str) {
        var node = embededReberGrammar().input;
        var i = 0;
        var ch = str.charAt(i);
        while (i < str.length) {
          var next = node.test(ch);
          if (!next) return false;
          node = next.node;
          ch = str.charAt(++i);
        }
        return true;
      };

      // helper to check if the output and the target vectors match
      var different = function different(array1, array2) {
        var max1 = 0;
        var i1 = -1;
        var max2 = 0;
        var i2 = -1;
        for (var i in array1) {
          if (array1[i] > max1) {
            max1 = array1[i];
            i1 = i;
          }
          if (array2[i] > max2) {
            max2 = array2[i];
            i2 = i;
          }
        }

        return i1 != i2;
      };

      var iteration = 0;
      var error = 1;
      var table = {
        'B': 0,
        'P': 1,
        'T': 2,
        'X': 3,
        'S': 4,
        'E': 5
      };

      var start = Date.now();
      while (iteration < iterations && error > criterion) {
        var i = 0;
        error = 0;

        // ERG sequence to learn
        var sequence = generate();

        // input
        var read = sequence.charAt(i);
        // target
        var predict = sequence.charAt(i + 1);

        // train
        while (i < sequence.length - 1) {
          var input = [];
          var target = [];
          for (var j = 0; j < 6; j++) {
            input[j] = 0;
            target[j] = 0;
          }
          input[table[read]] = 1;
          target[table[predict]] = 1;

          var output = this.network.activate(input);

          if (different(output, target)) this.network.propagate(rate, target);

          read = sequence.charAt(++i);
          predict = sequence.charAt(i + 1);

          error += cost(target, output);
        }
        error /= sequence.length;
        iteration++;
        if (iteration % log == 0) {
          console.log('iterations:', iteration, ' time:', Date.now() - start, ' error:', error);
        }
      }

      return {
        iterations: iteration,
        error: error,
        time: Date.now() - start,
        test: test,
        generate: generate
      };
    }
  }, {
    key: 'timingTask',
    value: function timingTask(options) {

      if (this.network.inputs() != 2 || this.network.outputs() != 1) throw new Error('Invalid Network: must have 2 inputs and one output');

      if (typeof options == 'undefined') options = {};

      // helper
      function getSamples(trainingSize, testSize) {

        // sample size
        var size = trainingSize + testSize;

        // generate samples
        var t = 0;
        var set = [];
        for (var i = 0; i < size; i++) {
          set.push({ input: [0, 0], output: [0] });
        }
        while (t < size - 20) {
          var n = Math.round(Math.random() * 20);
          set[t].input[0] = 1;
          for (var j = t; j <= t + n; j++) {
            set[j].input[1] = n / 20;
            set[j].output[0] = 0.5;
          }
          t += n;
          n = Math.round(Math.random() * 20);
          for (var k = t + 1; k <= t + n && k < size; k++) {
            set[k].input[1] = set[t].input[1];
          }t += n;
        }

        // separate samples between train and test sets
        var trainingSet = [];
        var testSet = [];
        for (var l = 0; l < size; l++) {
          (l < trainingSize ? trainingSet : testSet).push(set[l]);
        } // return samples
        return {
          train: trainingSet,
          test: testSet
        };
      }

      var iterations = options.iterations || 200;
      var error = options.error || .005;
      var rate = options.rate || [.03, .02];
      var log = options.log === false ? false : options.log || 10;
      var cost = options.cost || this.cost || Trainer.cost.MSE;
      var trainingSamples = options.trainSamples || 7000;
      var testSamples = options.trainSamples || 1000;

      // samples for training and testing
      var samples = getSamples(trainingSamples, testSamples);

      // train
      var result = this.train(samples.train, {
        rate: rate,
        log: log,
        iterations: iterations,
        error: error,
        cost: cost
      });

      return {
        train: result,
        test: this.test(samples.test)
      };
    }
  }]);

  return Trainer;
}();

Trainer.cost = cost;
exports.default = Trainer;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Architect = exports.Network = exports.Trainer = exports.Layer = exports.Neuron = undefined;

var _Neuron = __webpack_require__(2);

Object.defineProperty(exports, 'Neuron', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Neuron).default;
  }
});

var _Layer = __webpack_require__(0);

Object.defineProperty(exports, 'Layer', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Layer).default;
  }
});

var _Trainer = __webpack_require__(3);

Object.defineProperty(exports, 'Trainer', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Trainer).default;
  }
});

var _Network = __webpack_require__(1);

Object.defineProperty(exports, 'Network', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Network).default;
  }
});

var _architect = __webpack_require__(7);

var Architect = _interopRequireWildcard(_architect);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Architect = Architect;

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var connections = exports.connections = 0;

var Connection = function () {
  function Connection(from, to, weight) {
    _classCallCheck(this, Connection);

    if (!from || !to) throw new Error("Connection Error: Invalid neurons");

    this.ID = Connection.uid();
    this.from = from;
    this.to = to;
    this.weight = typeof weight == 'undefined' ? Math.random() * .2 - .1 : weight;
    this.gain = 1;
    this.gater = null;
  }

  _createClass(Connection, null, [{
    key: "uid",
    value: function uid() {
      return exports.connections = connections += 1, connections - 1;
    }
  }]);

  return Connection;
}();

exports.default = Connection;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.connections = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// represents a connection from one layer to another, and keeps track of its weight and gain
var connections = exports.connections = 0;

var LayerConnection = function () {
  function LayerConnection(fromLayer, toLayer, type, weights) {
    _classCallCheck(this, LayerConnection);

    this.ID = LayerConnection.uid();
    this.from = fromLayer;
    this.to = toLayer;
    this.selfconnection = toLayer == fromLayer;
    this.type = type;
    this.connections = {};
    this.list = [];
    this.size = 0;
    this.gatedfrom = [];

    if (typeof this.type == 'undefined') {
      if (fromLayer == toLayer) this.type = _Layer2.default.connectionType.ONE_TO_ONE;else this.type = _Layer2.default.connectionType.ALL_TO_ALL;
    }

    if (this.type == _Layer2.default.connectionType.ALL_TO_ALL || this.type == _Layer2.default.connectionType.ALL_TO_ELSE) {
      for (var here in this.from.list) {
        for (var there in this.to.list) {
          var from = this.from.list[here];
          var to = this.to.list[there];
          if (this.type == _Layer2.default.connectionType.ALL_TO_ELSE && from == to) continue;
          var connection = from.project(to, weights);

          this.connections[connection.ID] = connection;
          this.size = this.list.push(connection);
        }
      }
    } else if (this.type == _Layer2.default.connectionType.ONE_TO_ONE) {

      for (var neuron in this.from.list) {
        var from = this.from.list[neuron];
        var to = this.to.list[neuron];
        var connection = from.project(to, weights);

        this.connections[connection.ID] = connection;
        this.size = this.list.push(connection);
      }
    }

    fromLayer.connectedTo.push(this);
  }

  _createClass(LayerConnection, null, [{
    key: 'uid',
    value: function uid() {
      return exports.connections = connections += 1, connections - 1;
    }
  }]);

  return LayerConnection;
}();

exports.default = LayerConnection;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Perceptron = __webpack_require__(8);

Object.defineProperty(exports, 'Perceptron', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Perceptron).default;
  }
});

var _LSTM = __webpack_require__(9);

Object.defineProperty(exports, 'LSTM', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_LSTM).default;
  }
});

var _Liquid = __webpack_require__(10);

Object.defineProperty(exports, 'Liquid', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Liquid).default;
  }
});

var _Hopfield = __webpack_require__(11);

Object.defineProperty(exports, 'Hopfield', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Hopfield).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Network2 = __webpack_require__(1);

var _Network3 = _interopRequireDefault(_Network2);

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Perceptron = function (_Network) {
  _inherits(Perceptron, _Network);

  function Perceptron() {
    _classCallCheck(this, Perceptron);

    var _this = _possibleConstructorReturn(this, (Perceptron.__proto__ || Object.getPrototypeOf(Perceptron)).call(this));

    var args = Array.prototype.slice.call(arguments); // convert arguments to Array
    if (args.length < 3) throw new Error('not enough layers (minimum 3) !!');

    var inputs = args.shift(); // first argument
    var outputs = args.pop(); // last argument
    var layers = args; // all the arguments in the middle

    var input = new _Layer2.default(inputs);
    var hidden = [];
    var output = new _Layer2.default(outputs);

    var previous = input;

    // generate hidden layers
    for (var i = 0; i < layers.length; i++) {
      var size = layers[i];
      var layer = new _Layer2.default(size);
      hidden.push(layer);
      previous.project(layer);
      previous = layer;
    }
    previous.project(output);

    // set layers of the neural network
    _this.set({
      input: input,
      hidden: hidden,
      output: output
    });
    return _this;
  }

  return Perceptron;
}(_Network3.default);

exports.default = Perceptron;

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Network2 = __webpack_require__(1);

var _Network3 = _interopRequireDefault(_Network2);

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LSTM = function (_Network) {
  _inherits(LSTM, _Network);

  function LSTM() {
    _classCallCheck(this, LSTM);

    var _this = _possibleConstructorReturn(this, (LSTM.__proto__ || Object.getPrototypeOf(LSTM)).call(this));

    var args = Array.prototype.slice.call(arguments); // convert arguments to array
    if (args.length < 3) throw new Error("not enough layers (minimum 3) !!");

    var last = args.pop();
    var option = {
      peepholes: _Layer2.default.connectionType.ALL_TO_ALL,
      hiddenToHidden: false,
      outputToHidden: false,
      outputToGates: false,
      inputToOutput: true
    };
    if (typeof last != 'number') {
      var outputs = args.pop();
      if (last.hasOwnProperty('peepholes')) option.peepholes = last.peepholes;
      if (last.hasOwnProperty('hiddenToHidden')) option.hiddenToHidden = last.hiddenToHidden;
      if (last.hasOwnProperty('outputToHidden')) option.outputToHidden = last.outputToHidden;
      if (last.hasOwnProperty('outputToGates')) option.outputToGates = last.outputToGates;
      if (last.hasOwnProperty('inputToOutput')) option.inputToOutput = last.inputToOutput;
    } else {
      var outputs = last;
    }

    var inputs = args.shift();
    var layers = args;

    var inputLayer = new _Layer2.default(inputs);
    var hiddenLayers = [];
    var outputLayer = new _Layer2.default(outputs);

    var previous = null;

    // generate layers
    for (var i = 0; i < layers.length; i++) {
      // generate memory blocks (memory cell and respective gates)
      var size = layers[i];

      var inputGate = new _Layer2.default(size).set({
        bias: 1
      });
      var forgetGate = new _Layer2.default(size).set({
        bias: 1
      });
      var memoryCell = new _Layer2.default(size);
      var outputGate = new _Layer2.default(size).set({
        bias: 1
      });

      hiddenLayers.push(inputGate);
      hiddenLayers.push(forgetGate);
      hiddenLayers.push(memoryCell);
      hiddenLayers.push(outputGate);

      // connections from input layer
      var input = inputLayer.project(memoryCell);
      inputLayer.project(inputGate);
      inputLayer.project(forgetGate);
      inputLayer.project(outputGate);

      // connections from previous memory-block layer to this one
      if (previous != null) {
        var cell = previous.project(memoryCell);
        previous.project(inputGate);
        previous.project(forgetGate);
        previous.project(outputGate);
      }

      // connections from memory cell
      var output = memoryCell.project(outputLayer);

      // self-connection
      var self = memoryCell.project(memoryCell);

      // hidden to hidden recurrent connection
      if (option.hiddenToHidden) memoryCell.project(memoryCell, _Layer2.default.connectionType.ALL_TO_ELSE);

      // out to hidden recurrent connection
      if (option.outputToHidden) outputLayer.project(memoryCell);

      // out to gates recurrent connection
      if (option.outputToGates) {
        outputLayer.project(inputGate);
        outputLayer.project(outputGate);
        outputLayer.project(forgetGate);
      }

      // peepholes
      memoryCell.project(inputGate, option.peepholes);
      memoryCell.project(forgetGate, option.peepholes);
      memoryCell.project(outputGate, option.peepholes);

      // gates
      inputGate.gate(input, _Layer2.default.gateType.INPUT);
      forgetGate.gate(self, _Layer2.default.gateType.ONE_TO_ONE);
      outputGate.gate(output, _Layer2.default.gateType.OUTPUT);
      if (previous != null) inputGate.gate(cell, _Layer2.default.gateType.INPUT);

      previous = memoryCell;
    }

    // input to output direct connection
    if (option.inputToOutput) inputLayer.project(outputLayer);

    // set the layers of the neural network
    _this.set({
      input: inputLayer,
      hidden: hiddenLayers,
      output: outputLayer
    });
    return _this;
  }

  return LSTM;
}(_Network3.default);

exports.default = LSTM;

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Network2 = __webpack_require__(1);

var _Network3 = _interopRequireDefault(_Network2);

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Liquid = function (_Network) {
  _inherits(Liquid, _Network);

  function Liquid(inputs, hidden, outputs, connections, gates) {
    _classCallCheck(this, Liquid);

    // create layers
    var _this = _possibleConstructorReturn(this, (Liquid.__proto__ || Object.getPrototypeOf(Liquid)).call(this));

    var inputLayer = new _Layer2.default(inputs);
    var hiddenLayer = new _Layer2.default(hidden);
    var outputLayer = new _Layer2.default(outputs);

    // make connections and gates randomly among the neurons
    var neurons = hiddenLayer.neurons();
    var connectionList = [];

    for (var i = 0; i < connections; i++) {
      // connect two random neurons
      var from = Math.random() * neurons.length | 0;
      var to = Math.random() * neurons.length | 0;
      var connection = neurons[from].project(neurons[to]);
      connectionList.push(connection);
    }

    for (var j = 0; j < gates; j++) {
      // pick a random gater neuron
      var gater = Math.random() * neurons.length | 0;
      // pick a random connection to gate
      var connection = Math.random() * connectionList.length | 0;
      // let the gater gate the connection
      neurons[gater].gate(connectionList[connection]);
    }

    // connect the layers
    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    // set the layers of the network
    _this.set({
      input: inputLayer,
      hidden: [hiddenLayer],
      output: outputLayer
    });
    return _this;
  }

  return Liquid;
}(_Network3.default);

exports.default = Liquid;

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Network2 = __webpack_require__(1);

var _Network3 = _interopRequireDefault(_Network2);

var _Trainer = __webpack_require__(3);

var _Trainer2 = _interopRequireDefault(_Trainer);

var _Layer = __webpack_require__(0);

var _Layer2 = _interopRequireDefault(_Layer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Hopfield = function (_Network) {
  _inherits(Hopfield, _Network);

  function Hopfield(size) {
    _classCallCheck(this, Hopfield);

    var _this = _possibleConstructorReturn(this, (Hopfield.__proto__ || Object.getPrototypeOf(Hopfield)).call(this));

    var inputLayer = new _Layer2.default(size);
    var outputLayer = new _Layer2.default(size);

    inputLayer.project(outputLayer, _Layer2.default.connectionType.ALL_TO_ALL);

    _this.set({
      input: inputLayer,
      hidden: [],
      output: outputLayer
    });

    _this.trainer = new _Trainer2.default(_this);
    return _this;
  }

  _createClass(Hopfield, [{
    key: 'learn',
    value: function learn(patterns) {
      var set = [];
      for (var p in patterns) {
        set.push({
          input: patterns[p],
          output: patterns[p]
        });
      }return this.trainer.train(set, {
        iterations: 500000,
        error: .00005,
        rate: 1
      });
    }
  }, {
    key: 'feed',
    value: function feed(pattern) {
      var output = this.activate(pattern);

      var pattern = [];
      for (var i in output) {
        pattern[i] = output[i] > .5 ? 1 : 0;
      }return pattern;
    }
  }]);

  return Hopfield;
}(_Network3.default);

exports.default = Hopfield;

/***/ })
/******/ ]);
});
},{}],23:[function(require,module,exports){
module.exports = function axis (range, dims) {
    "use strict";

    dims = dims || 2;
    range = range || 1;

    return recurse([], [], 0);

    function recurse (array, temp, d) {
        var i,
            k,
            match;

        if (d === dims-1) {
            for (i = -range; i <= range; i += 1) {
                match = (i === 0 ? 1 : 0);
                for (k = 0; k < dims; k++) {
                    match+= (temp[k] === 0 ? 1 : 0);
                }

                if (match === dims-1) {
                    array.push(temp.concat(i));
                }
            }
        } else {
            for (i = -range; i <= range; i += 1) {
                recurse(array, temp.concat(i), d + 1);
            }
        }

        return array;
    }
};

},{}],24:[function(require,module,exports){
module.exports = function corner (range, dims) {
    "use strict";

    dims = dims || 2;
    range = range || 1;

    return recurse([], [], 0);

    function recurse (array, temp, d) {
        var i,
            k,
            match;

        if (d === dims-1) {
            for (i = -range; i <= range; i += 1) {
                match = (Math.abs(i) === range ? 1 : 0);
                for (k = 0; k < dims; k++) {
                    match += (Math.abs(temp[k]) === range ? 1 : 0);
                }

                if (match === dims) {
                    array.push(temp.concat(i));
                }
            }
        } else {
            for (i = -range; i <= range; i += 1) {
                recurse(array, temp.concat(i), d + 1);
            }
        }

        return array;
    }
};

},{}],25:[function(require,module,exports){
module.exports = function edge (range, dims) {
    "use strict";

    dims = dims || 2;
    range = range || 1;

    return recurse([], [], 0);

    function recurse (array, temp, d) {
        var i,
            k,
            match;

        if (d === dims-1) {
            for (i = -range; i <= range; i += 1) {
                match = (Math.abs(i) === range ? 1 : 0);
                for (k = 0; k < dims; k++) {
                    match += (Math.abs(temp[k]) === range ? 1 : 0);
                }

                if (match >= dims - 1) {
                    array.push(temp.concat(i));
                }
            }
        } else {
            for (i = -range; i <= range; i += 1) {
                recurse(array, temp.concat(i), d + 1);
            }
        }

        return array;
    }
};

},{}],26:[function(require,module,exports){
module.exports = function face (range, dims) {
    "use strict";

    dims = dims || 2;
    range = range || 1;

    return recurse([], [], 0);

    function recurse (array, temp, d) {
        var i,
            k,
            match;

        if (d === dims-1) {
            for (i = -range; i <= range; i += 1) {
                match = (Math.abs(i) === range);
                for (k = 0; !match && k < dims; k++) {
                    match = (Math.abs(temp[k]) === range);
                }

                if (match) {
                    array.push(temp.concat(i));
                }
            }
        } else {
            for (i = -range; i <= range; i += 1) {
                recurse(array, temp.concat(i), d + 1);
            }
        }

        return array;
    }
};

},{}],27:[function(require,module,exports){
module.exports = {
    axis: require('./functions/axis'),
    corner: require('./functions/corner'),
    edge: require('./functions/edge'),
    face: require('./functions/face')
};

},{"./functions/axis":23,"./functions/corner":24,"./functions/edge":25,"./functions/face":26}],28:[function(require,module,exports){
module.exports = function vonNeumann (range, dimensions) {
    "use strict";

    range = range || 1;
    dimensions = dimensions || 2;

    var size = range * 2 + 1,
        iterations = Math.pow(size, dimensions),
        center = (iterations - 1) / 2,
        neighbors = [];

    for (var i = 0; i < iterations; i++) {
        if (i !== center) {
            var neighbor = new Array(dimensions),
                distance = 0,
                remaining = i;

            for (var d = 0; d < dimensions; d++) {
                var remainder = remaining % Math.pow(size, d + 1),
                    value = remainder / Math.pow(size, d) - range;

                neighbor[d] = value;
                distance += Math.abs(value);
                remaining -= remainder;
            }

            if (distance <= range) {
                neighbors.push(neighbor);
            }
        }
    }

    return neighbors;
};

},{}]},{},[1]);
