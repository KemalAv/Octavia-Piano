# Pianoplayer asli di ChatGPT Sites

Versi ini menjalankan Python pianoplayer asli melalui Pyodide 0.27.7 dalam Web
Worker browser. Runtime Python, NumPy WASM, sumber pianoplayer, dan dependensi
MIDI disertakan sebagai aset situs. Tidak membutuhkan server Python atau
instalasi di komputer pengguna. File asli diproses di filesystem virtual browser
dan dihapus setelah perhitungan. Batas unggahan 10 MiB dan waktu 180 detik.
Worker dihentikan setelah hasil atau error; tidak ada fallback algoritma TypeScript.

`public/pianoplayer-python.zip` menyimpan `backend/worker.py`, sumber pianoplayer
asli tanpa modifikasi, serta pretty_midi 0.2.11 dan dependensi pure-Python-nya.
Kode pemetaan MIDI/XML sama dengan versi Python lokal. Routing tangan, geometri,
penanganan chord, dan optimizer berasal dari pianoplayer. Keterbatasan algoritma
asli tetap berlaku, termasuk fallback serta routing MIDI satu instrument ke kanan.

Pengguna: buka situs privat, unggah MIDI/XML/MXL, lalu aktifkan label fingering.
Pemuatan pertama memerlukan unduhan runtime; tunggu hingga loading selesai.
Tidak perlu terminal atau API backend. Komponen backend/server.py dan run.py
merupakan referensi versi lokal sebelumnya dan tidak digunakan di hosting ini.

Pengujian: `npm run test:fingering` menjalankan runtime WASM yang sama serta
kode worker dengan transport yang diemulasikan di Node. MIDI, XML dua staff,
akor, tie dan MXL dibandingkan dengan output Python native yang disimpan dalam
fixture. Semua cocok. Uji browser UI langsung belum dijalankan karena preview
browser lingkungan ini tidak tersedia. Lagu screenshot pengguna belum tersedia.

Untuk rebuild: `npm ci`, `npm run build`. Semua aset publik disalin Vite ke dist.
Jangan mengganti bundle Python tanpa menjalankan ulang pengujian perbandingan.

Loading dibagi menjadi pemuatan mesin dan perhitungan fingering. Pemuatan mesin
dibatasi 45 detik, perhitungan 180 detik, dan preload audio 20 detik. Tombol
Batalkan menghentikan worker dan melepas status loading. Preload tidak lagi
menunggu AudioContext.resume (izin autoplay); suara diaktifkan pada tindakan
Play pengguna. Uji siklus loading: `npm run test:loading`.

## Koreksi geometri dan performa

`backend/octavia_fingering.py` kini menerapkan koreksi di atas kode sumber asli:
koordinat MIDI menggunakan posisi tuts putih/hitam yang konsisten dengan keypos,
bukan formula chromatic lama yang mundur saat batas oktaf. Search menggunakan
cache biaya transisi, pemangkasan biaya non-negatif, dan dominance memoization
untuk melodi. Urutan penjumlahan, urutan kandidat dan aturan penilaian tetap.
363 window feasible (melodi/akor, kedua tangan, ukuran S/M/L) cocok dengan
pencarian exhaustive menggunakan geometri yang sama. Kasus nada berulang depth7:
0,4529 detik exhaustive versus 0,000155 detik optimized pada lingkungan pengujian;
ini bukan jaminan kecepatan seluruh lagu atau semua perangkat.

Padding akhir lagu tidak lagi dianggap sebagai nada akor nyata. Carry finger
infeasible dicoba ulang tanpa carry; anchor yang mustahil dan akor >5 nada per
tangan menghasilkan error, bukan rangkaian jari fallback yang sama.

Pilihan UI: ukuran tangan XXS..XXL; MIDI otomatis, split pitch, kanan saja atau
kiri saja; batas split 0..127. Default M, otomatis, C4/60. Otomatis dua instrument
memilih register rendah/kiri dan tinggi/kanan; satu instrument memakai split.
Ini merupakan heuristik, bukan rekonstruksi staff; ubah sesuai lagu. MusicXML
mempertahankan routing part/staff asli. Unggah ulang sesudah mengubah pilihan.

Uji runtime kini membandingkan WASM dengan Python versi terkoreksi, termasuk
12 kombinasi ukuran dan routing. Uji search: `python tests/search-corrections.py`.

## Progres, Settings, dan tangan 3D

Batas keseluruhan 180 detik diganti dengan watchdog 120 detik tanpa progres.
Python melaporkan jumlah nada per tangan; worker membatasi pesan menjadi sekitar
empat pesan per detik dan selalu mengirim status akhir. Proses tetap dapat
 dibatalkan. Error tampil menetap pada layar pemilihan lagu.

Pencarian kini menyimpan prefix yang setara juga untuk akor, dengan state berisi
jari terakhir dan semua penugasan dalam grup akor yang masih diperlukan di
masa depan. Biaya dan batas transisi tetap sama. Semua nada sungguhan dihitung
ulang sampai akhir, sehingga hasil tidak bergantung pada reuse buffer tail.

Ukuran tangan, routing MIDI, dan batas nada berada di Settings dan tersimpan di
localStorage. Perubahan berlaku pada pemuatan lagu berikutnya. Settings juga
memiliki pilihan untuk menampilkan model tangan 3D dan pratinjau gerakannya.

Model menggunakan mesh 3D telapak dan jari dengan proyeksi perspektif dan
pencahayaan permukaan, tanpa dependensi renderer tambahan. Dimensi telapak,
warna tangan, dan faktor ukuran mengikuti model geometris `vkeyboard.py`.
Posisi horizontal jari berasal dari `Hand.fingerseq`. Jari yang menahan akor
mengikuti tuts masing-masing. Untuk MusicXML, posisi disimpan pada elemen nada
sehingga parser Octavia menyelaraskannya dengan tempo, repeat, dan waktu lagu.
Model dapat diputar dengan drag, di-reset, diciutkan, atau dimatikan.

Uji regresi mencakup validitas bagian akhir lagu, MIDI 1.800 nada/dua tangan pada
Python native dan runtime WASM, progres akhir kedua tangan, watchdog yang
 diperbarui oleh progres, pemetaan waktu pose/seek, dan geometri mesh. Angka
benchmark adalah hasil fixture uji, bukan jaminan kecepatan semua file/perangkat.

## Pemulihan saat batas transisi menolak semua kandidat

Jika pencarian utama (termasuk retry tanpa carry) tidak menemukan kandidat,
pencarian sekunder memperlakukan heuristik transisi dan rentang sebagai penalti.
Urutan jari serta penggunaan jari berbeda pada pitch berbeda dalam satu akor
tetap wajib. Hasil mencatat warning yang terlihat pada pemilihan lagu; rentang
akor yang besar tetap dapat membutuhkan penyesuaian saat dimainkan. Ini bukan
klaim bahwa semua akor dapat dijangkau secara fisik. Akor lebih dari lima nada
per tangan tetap menghasilkan error yang jelas. Hasil pencarian utama yang
sebelumnya valid tetap memakai biaya dan kandidat yang sama.

`compute_json` mengirim envelope error Python tanpa traceback ke UI. Uji wide
MIDI memastikan proses lanjut, urutan/keunikan jari, dan warning, di Python
native maupun WASM. Partitur Canon yang sebelumnya terhenti kini juga selesai
dengan warning.

## Pemulihan startup worker browser

Script worker diunduh dengan credentials same-origin dan cache revalidation,
lalu diperiksa marker versinya sebelum digunakan. Respons HTML atau HTTP error
memiliki pesan khusus. Jalur utama membuat Blob worker dari script yang sudah
terverifikasi; semua asset runtime memakai origin Site yang diberikan secara
eksplisit. Jika worker belum mulai menghitung dan startup gagal, aplikasi mencoba
sekali lagi memakai URL worker biasa. Byte input tetap tersedia untuk retry;
pesan worker lama diabaikan. Error setelah perhitungan dimulai tidak diulang
secara otomatis. Pesan error sekarang menyertakan tahap dan detail browser.
ZIP Python juga diperiksa signature-nya sebelum dibuka. Watchdog startup dihitung
ulang saat tahap pemuatan berganti; watchdog komputasi tetap berbasis progres.

Preview MIDI Settings memakai AbortController terpisah dan dihentikan saat keluar
menu, sehingga hasil yang terlambat tidak mengganti lagu dan proses tidak terus
berjalan bersamaan dengan pemuatan berikutnya. Uji mencakup pemulihan startup,
batas satu retry, byte input, cancellation, HTTP/HTML validation, stale events,
diagnostik error, dan pemetaan URL asset ketika origin worker berupa Blob.
Penyebab khusus pada browser pengguna belum terverifikasi; perubahan ini memberi
pemulihan terukur serta informasi diagnostik jika kegagalan tetap terjadi.

## Model tangan pada keyboard bawah

Panel 3D terpisah diganti dengan canvas transparan tepat di atas keyboard bawah.
Canvas memakai lebar dan tinggi keyboard yang sama, dan koordinat cm jari
 dipetakan ke pusat tuts yang ditampilkan (termasuk tuts hitam) menggunakan
interpolasi koordinat aktual `keyPositionsArray`. Rentang piano, lebar tuts,
scroll, dan resize mengikuti layout keyboard yang sama. Piano tambahan tidak
 digambar pada overlay. Pointer events dinonaktifkan agar sentuhan/klik tetap
 diterima keyboard. Pengaturan tampil/sembunyi tetap tersedia di Settings;
pratinjau 3D terpisah di Settings juga dihapus. Uji geometri memastikan pusat
jari tepat pada pusat tuts untuk beberapa lebar layout.

## Pemilihan label dan sinkronisasi tempo

Python fingering hanya dipanggil untuk instrumen piano dengan label `fingering`.
Label lain memakai parser playback TypeScript untuk MIDI, XML, dan MXL. Ketika
label fingering dipilih setelah file dimuat, anotasi dihitung tanpa memuat ulang
metadata lagu atau mengganti MP3. Job anotasi dibatalkan jika label diganti atau
file baru dipilih. Hasil yang sudah dihitung dapat dipakai ulang untuk file sama.
Tangan 3D mengikuti pemilihan label fingering.

`playbackSync.ts` memisahkan offset file/lagu (waktu sumber) dari User MP3 Offset
serta Note Offset (milidetik nyata). Semua jalur play/seek/start/drift/tempo memakai
rumus sumber = waktu lagu - preroll + offset file + rate × offset fisik.
Perubahan rate mengunci ulang clock musik pada waktu saat ini dan memperbarui
playhead MP3. Perhitungan drift membandingkan selisih waktu nyata agar ambang
koreksi sama pada 25–200%. Koreksi rate tidak lagi ditimpa pada tiap frame.

MP3 lokal/blob/same-origin dapat dilewatkan melalui AudioContext yang sama dengan
suara piano. Delay output diperkirakan dari getOutputTimestamp atau outputLatency,
dengan baseLatency sebagai fallback; nilai latensi tidak dijumlahkan ganda.
Kalibrasi manual nonzero mengungguli estimasi otomatis untuk mempertahankan
kalibrasi pengguna. Media lintas origin tanpa CORS tetap memakai jalur HTML audio,
agar tidak menjadi senyap akibat pembatasan MediaElementAudioSourceNode.
Bluetooth/perangkat fisik belum diuji langsung dan estimasi tergantung dukungan
browser; koreksi residual perangkat tetap dapat diperlukan.

Sheet music kini menggambar ulang saat jenis label berubah; ketika background
kustom transparan digunakan, setiap sistem mendapat alas kertas terang agar
notasi gelap tetap terbaca. Uji mencakup parsing biasa tanpa Python, offset nyata
pada enam tempo, drift/seek, timestamp output, dan routing MP3 tanpa koneksi ganda.
