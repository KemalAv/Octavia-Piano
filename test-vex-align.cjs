const { Stave } = require('vexflow');
const stave = new Stave(0, 50, 200);
console.log('Stave y:', stave.y);
console.log('getYForLine(0):', stave.getYForLine(0));
console.log('Options:', stave.options);
