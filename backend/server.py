"""Local API. Each expensive solve runs in a separate, time-limited process."""
import json, os, pathlib, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
ROOT=pathlib.Path(__file__).parent
LIMIT=10*1024*1024
SLOTS=threading.BoundedSemaphore(2)
class Handler(BaseHTTPRequestHandler):
    def reply(self,status,payload):
        data=json.dumps(payload).encode();self.send_response(status)
        self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)))
        self.end_headers();self.wfile.write(data)
    def do_GET(self):
        self.reply(200 if self.path=='/api/health' else 404,{'engine':'pianoplayer-python'} if self.path=='/api/health' else {'error':'Not found'})
    def do_POST(self):
        url=urlparse(self.path)
        if url.path!='/api/fingering': return self.reply(404,{'error':'Not found'})
        name=parse_qs(url.query).get('filename',[''])[0]
        suffix=pathlib.Path(name).suffix.lower()
        if suffix not in {'.mid','.midi','.xml','.musicxml','.mxl'}: return self.reply(400,{'error':'Use MIDI or MusicXML'})
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: return self.reply(400,{'error':'Invalid upload size'})
        if not 0<length<=LIMIT: return self.reply(413,{'error':'Maximum upload: 10 MiB'})
        if not SLOTS.acquire(blocking=False): return self.reply(503,{'error':'Solver busy; try again'})
        try:
            with tempfile.TemporaryDirectory() as folder:
                path=pathlib.Path(folder)/('input'+suffix);path.write_bytes(self.rfile.read(length))
                run=subprocess.run([sys.executable,str(ROOT/'worker.py'),str(path)],capture_output=True,text=True,timeout=120)
                if run.returncode: return self.reply(422,{'error':'Pianoplayer could not process this file. '+run.stderr[-1500:]})
                self.reply(200,json.loads(run.stdout))
        except subprocess.TimeoutExpired: self.reply(504,{'error':'Pianoplayer exceeded 120 seconds; try a shorter score'})
        except Exception: self.reply(500,{'error':'Fingering service failed'})
        finally: SLOTS.release()
if __name__=='__main__':
    print('Pianoplayer API: http://127.0.0.1:8001',flush=True)
    ThreadingHTTPServer(('127.0.0.1',int(os.getenv('PORT','8001'))),Handler).serve_forever()
