const OCTAVIA_WORKER_VERSION = 'bootstrap-8';
let computing = false;
const assetBase = self.OCTAVIA_ASSET_BASE || new URL('/',self.location.href).href;
const asset = path => new URL(path, assetBase).href;
self.addEventListener?.('error', event => {
  event.preventDefault();
  self.postMessage({error:event.message || 'The worker stopped without providing error details.',retryable:!computing});
});
/* Run the original Python engine away from Octavia's UI thread. */
self.onmessage = async ({ data }) => {
  try {
    const suffix = String(data.name).split('.').pop().toLowerCase();
    if (!['mid', 'midi', 'xml', 'musicxml', 'mxl'].includes(suffix)) throw new Error('Use a MIDI or MusicXML file.');
    if (!data.bytes?.byteLength || data.bytes.byteLength > 10 * 1024 * 1024) throw new Error('The file size must be between 1 byte and 10 MiB.');
    self.postMessage({stage: 'Loading fingering engine...'});
    importScripts(asset('python-runtime/pyodide.js'));
    const py = await loadPyodide({ indexURL: asset('python-runtime/') });
    self.postMessage({stage: 'Preparing fingering engine...'});
    await py.loadPackage('numpy');
    const response = await fetch(asset('pianoplayer-python.zip?v=bootstrap-8'),{credentials:'same-origin',cache:'no-cache'});
    if (!response.ok) throw new Error('Failed to load the fingering engine.');
    const archive=await response.arrayBuffer();
    const signature=new Uint8Array(archive,0,Math.min(4,archive.byteLength));
    if(signature[0]!==80||signature[1]!==75)throw new Error('The server did not return a valid Python ZIP package.');
    py.unpackArchive(archive, 'zip', {extractDir: '/app'});
    await py.runPythonAsync('import sys, json\nsys.path.insert(0, "/app")\nfrom worker import compute_json');
    computing = true;
    self.postMessage({stage: 'Calculating fingering...', computing: true});
    const prefs = data.preferences || {};
    const handSize = ['XXS','XS','S','M','L','XL','XXL'].includes(prefs.handSize) ? prefs.handSize : 'M';
    const routing = ['auto','split','right','left'].includes(prefs.routing) ? prefs.routing : 'auto';
    const splitMidi = Number.isInteger(prefs.splitMidi) && prefs.splitMidi >= 0 && prefs.splitMidi <= 127 ? prefs.splitMidi : 60;
    const path = '/input.' + suffix;
    py.FS.writeFile(path, new Uint8Array(data.bytes));
    let lastProgress = 0;
    py.globals.set('octavia_progress', (side, done, total) => {
      const now = Date.now();
      if (done !== total && done !== 0 && now - lastProgress < 250) return;
      lastProgress = now;
      self.postMessage({stage: `Calculating ${side === 'left' ? 'left' : 'right'} hand: ${done}/${total} notes (${total ? Math.round(done*100/total) : 100}%)`, computing: true, progress: true});
    });
    try {
      const json = await py.runPythonAsync(`compute_json(${JSON.stringify(path)}, hand_size=${JSON.stringify(handSize)}, routing=${JSON.stringify(routing)}, split_midi=${splitMidi}, progress=octavia_progress)`);
      self.postMessage(JSON.parse(json));
    } finally { py.FS.unlink(path); py.globals.delete('octavia_progress'); }
  } catch (error) {
    self.postMessage({error: String(error?.message || error), retryable: !computing});
  }
};
