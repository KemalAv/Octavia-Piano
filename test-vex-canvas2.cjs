const { Renderer, Stave, CanvasContext } = require('vexflow');

class MockContext extends CanvasContext {
  constructor() {
    super(null);
  }
  beginPath() { console.log('beginPath'); }
  moveTo(x, y) { console.log('moveTo', x, y); }
  lineTo(x, y) { console.log('lineTo', x, y); }
  stroke() { console.log('stroke'); }
  fillRect(x, y, w, h) { console.log('fillRect', x, y, w, h); }
  rect(x, y, w, h) { console.log('rect', x, y, w, h); }
  fill() { console.log('fill'); }
  set fillStyle(v) { console.log('fillStyle =', v); }
  set strokeStyle(v) { console.log('strokeStyle =', v); }
  set lineWidth(v) { console.log('lineWidth =', v); }
}

const context = new MockContext();
const stave = new Stave(10, 50, 400);
stave.setContext(context).draw();
