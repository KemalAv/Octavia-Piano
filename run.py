"""Launch Octavia and the native pianoplayer API together."""
import os, pathlib, shutil, subprocess, sys
root=pathlib.Path(__file__).resolve().parent
npm=shutil.which('npm.cmd' if os.name=='nt' else 'npm')
if not npm: sys.exit('Install Node.js with npm first.')
processes=[]
try:
    processes.append(subprocess.Popen([sys.executable,str(root/'backend/server.py')],cwd=root))
    processes.append(subprocess.Popen([npm,'run','dev','--','--host','127.0.0.1'],cwd=root))
    print('Open http://127.0.0.1:3000 — press Ctrl+C to stop both services.',flush=True)
    while True:
        for p in processes:
            if p.poll() is not None: sys.exit(p.returncode or 1)
        import time;time.sleep(.5)
except KeyboardInterrupt: pass
finally:
    for p in processes:
        if p.poll() is None: p.terminate()
    for p in processes:
        try: p.wait(timeout=5)
        except subprocess.TimeoutExpired: p.kill()
