const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="boo"></div></body></html>');
const { Stave } = require('vexflow');
const stave = new Stave(0, 50, 200);
console.log(stave.getYForLine(0));
console.log(stave.getYForLine(1));
console.log(stave.getYForLine(4));
