const { Stave } = require('vexflow');
const stave = new Stave(10, 50, 400);
console.log('getYForLine(0):', stave.getYForLine(0));
console.log('getYForLine(1):', stave.getYForLine(1));
console.log('getYForLine(2):', stave.getYForLine(2));
console.log('getYForLine(5):', stave.getYForLine(5));
