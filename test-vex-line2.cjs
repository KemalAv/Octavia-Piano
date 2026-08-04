const { Stave } = require('vexflow');
const stave = new Stave(0, 50, 200);

console.log('getYForLine(0):', stave.getYForLine(0)); // C4?
console.log('getYForLine(1):', stave.getYForLine(1)); // E4?
console.log('getYForLine(5):', stave.getYForLine(5)); // F5?

