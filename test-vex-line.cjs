const { StaveNote } = require('vexflow');

function getVexLine(keys, clef) {
  const note = new StaveNote({ keys, duration: 'q', clef });
  return note.getKeyProps()[0].line;
}

console.log('Treble C4 (Middle C):', getVexLine(['c/4'], 'treble')); // Should be 5
console.log('Treble E4 (Bottom line):', getVexLine(['e/4'], 'treble')); // Should be 4
console.log('Treble F5 (Top line):', getVexLine(['f/5'], 'treble')); // Should be 0
console.log('Bass C4 (Middle C):', getVexLine(['c/4'], 'bass')); // Should be -1
console.log('Bass G2 (Bottom line):', getVexLine(['g/2'], 'bass')); // Should be 4
console.log('Bass A3 (Top line):', getVexLine(['a/3'], 'bass')); // Should be 0

