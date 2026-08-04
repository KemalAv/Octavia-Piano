const { StaveNote } = require('vexflow');

function getVexLine(keys, clef) {
  const note = new StaveNote({ keys, duration: 'q', clef });
  return note.getKeyProps()[0].line;
}

console.log('Percussion f/4 (Bass drum 2):', getVexLine(['f/4'], 'percussion')); 
console.log('Percussion c/5 (Snare):', getVexLine(['c/5'], 'percussion')); 
console.log('Percussion g/5 (Hi-hat):', getVexLine(['g/5'], 'percussion')); 

