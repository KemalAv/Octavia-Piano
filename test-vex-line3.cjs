const { Stave } = require('vexflow');
const stave = new Stave(0, 50, 200);

console.log('getYForNote(0):', stave.getYForNote(0)); // C4
console.log('getYForNote(1):', stave.getYForNote(1)); // E4
console.log('getYForNote(5):', stave.getYForNote(5)); // F5

