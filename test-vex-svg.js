const { JSDOM } = require('jsdom');
const { Renderer, Stave } = require('vexflow');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="boo"></div></body></html>');
global.document = dom.window.document;

const div = document.getElementById("boo");
const renderer = new Renderer(div, Renderer.Backends.SVG);
renderer.resize(500, 500);
const context = renderer.getContext();
const stave = new Stave(10, 40, 400);
stave.setContext(context).draw();

console.log(div.innerHTML);
