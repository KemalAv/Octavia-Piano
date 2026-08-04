const { createCanvas } = require('canvas');
const { Renderer, Stave } = require('vexflow');

const canvas = createCanvas(500, 500);
const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
const context = renderer.getContext();

const stave = new Stave(10, 50, 400);
stave.setContext(context).draw();

// Let's just check what methods were called on context if we mock it
