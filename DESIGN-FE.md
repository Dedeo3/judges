# TUGAS: Desain & bangun front-end web Judges Protocol (fokus visual saja)

## 0. Batasan
- Kerjakan HANYA lapisan visual di `apps/web/src/app` (halaman, komponen, gaya).
- JANGAN ubah: `src/app/api/**`, `packages/**`, `contracts/**`, `prover/**`, skema DB, logika SDK.
- Halaman `/demo/*` yang sudah ada tetap berfungsi; hanya boleh di-restyle di Fase 3.
- Sebelum menulis kode, baca: `IMPLEMENTATION.md`, `docs/integration.md`, `apps/web/package.json`, config Tailwind/global CSS, dan file config alamat/chain di `src/lib`. Sesuaikan dengan versi Tailwind yang benar-benar dipakai (v3 vs v4).
- Jangan bertanya. Ambil keputusan sendiri dan catat asumsi di akhir.

## 1. Konsep
Situs ini adalah **dokumen putusan pengadilan (slip opinion)**, bukan landing page SaaS.
Alasan: nama proyek "Judges", output produk adalah *verdict* (accepted/rejected), dan isi dokumen proyek (klaim, pembuktian, batasan yang diakui) secara struktural mirip putusan. Metafora harus terasa lewat tata letak dan tipografi, bukan dekorasi.
Satu kalimat uji: "situs ini adalah dokumen putusan".

## 2. Design tokens (satu file: `src/styles/tokens.css` atau `@theme`)
- `--paper: #F1EDE4` (latar)
- `--ink: #15130F` (teks)
- `--ink-muted: #5C574D` (teks sekunder, cek kontras >= 4.5:1 di atas paper)
- `--rule: rgba(21,19,15,.22)` (garis tipis 1px)
- `--stamp: #B3261E` (HANYA untuk status REJECTED dan error)
- Tidak ada warna aksen lain. Tidak ada hijau untuk "verified": ACCEPTED ditulis dengan tinta biasa + glyph ✓ + label mono huruf besar.
- Radius 0 atau 2px. Tanpa box-shadow. Tanpa gradien. Tanpa blur/glass.
- Font (pakai `next/font/google`, self-hosted saat build):
  - Serif teks & heading: **Newsreader** (opsz aktif, bobot 400/500/600)
  - Mono data, kode, hash, label: **IBM Plex Mono** (400/500)
  - DILARANG: Inter, Geist, Fraunces, Instrument Serif, system-ui sebagai font utama.
- Skala tipe: body 18-19px/1.6 serif; label mono 12-13px, uppercase, letter-spacing .06em; H1 clamp(2.75rem, 6vw, 5rem), tracking rapat.
- Spasi: kelipatan 4px; ritme vertikal antar seksi besar dan konsisten.

## 3. Tata letak
- Kolom teks utama max ~68ch. Di >= 1024px: grid dua kolom, kolom kiri sempit (~9rem) untuk nomor § dan marginalia (catatan pinggir mono kecil), kolom kanan untuk isi. Di mobile: marginalia pindah inline di atas paragraf.
- Pemisah antar seksi = garis tipis (`border-top: 1px solid var(--rule)`), bukan blok warna.
- Header: baris "caption perkara" mono: `JUDGES PROTOCOL · SLIP OPINION · MONAD TESTNET · CHAIN 10143` dan navigasi teks polos (Opinion, Evidence, Dissent, Developers, Demos). Tanpa logo ikon, tanpa hamburger dekoratif; di mobile cukup baris nav yang bisa wrap.
- Footer: tautan repo, alamat kontrak (dari config), tautan explorer, dalam gaya catatan kaki.

## 4. Fase & halaman

### Fase 1: `/` (landing)
Urutan seksi, semua bernomor § dengan gaya dokumen hukum:

**Hero**
- H1: `Judges`. Di bawahnya satu klaim (serif besar): "A wallet, backed by a passkey that passed user verification. Nothing else disclosed."
- Di bawah klaim: dua kolom. Kiri: snippet kode (mono, tanpa syntax-highlight warna-warni; cukup bobot/opacity):
  `const proof = await judges.prove({ assurance: "user_verified", wallet });`
  `const result = await judges.verify(proof, { walletClient, verifierAddress, chain });`
  Kanan: panel "Verdict" berisi hasil nyata: `valid`, `txHash` (tautan explorer), `domain`, `nullifier` (hash dipotong `0x3f…a9`, klik untuk salin).
- Nilai panel Verdict HARUS dari transaksi testnet sungguhan. Cari di config/log/deployment doc. Jika tidak ada, render keadaan kosong yang jujur ("No transaction recorded yet") dan tandai TODO. DILARANG membuat hash palsu.
- Ledger dua baris di bawah hero: (1) percobaan pertama: `✓ ACCEPTED`; (2) percobaan kedua dengan kredensial yang sama: `REJECTED · nullifier already used`. Stempel merah pada baris 2 (lihat §5).

**§1 Holding (apa yang dibuktikan)**
Tabel HTML sungguhan: `possession`, `user_verified`, `unique`, dengan arti masing-masing. Baris `unique` diberi catatan pinggir: "Policy label. Not derived from WebAuthn alone." Kalimat penutup seksi: yang TIDAK dibuktikan passkey ("1 credential = 1 human").

**§2 Evidence (data gas)**
Tabel + batang horizontal CSS monokrom (lebar proporsional, tinta solid, tanpa library chart):
- `JudgesVerifier.verify()` (ZK, tanda tangan dicek off-chain): ~1,130,000 gas
- Ditambah WebAuthn on-chain + P256VERIFY: ~1,166,000 gas (+3.5%)
- Tanpa ZK, passkey diverifikasi on-chain saja: ~88,000 gas
Sertakan dua kalimat penjelasan: harga ecPairing/ecMul di Monad 5x Ethereum; biaya sebenarnya adalah privasi (public key passkey jadi identifier permanen di calldata). Ambil teks dari `docs/` atau README; jangan menulis ulang dengan angka baru.

**§3 Procedure**
Diagram alur vertikal 5 langkah (Passkey → User verification → Proof → JudgesVerifier on Monad → Application) sebagai SVG inline garis 1px, label mono. Catatan pinggir: "P-256 checked off-chain during ceremony; MonadP256Adapter deployed separately."

**§4 Docket (tiga aplikasi)**
Daftar bernomor gaya docket, BUKAN kartu/grid: `Docket 1 - DAO vote`, `Docket 2 - Agent registry`, `Docket 3 - Faucet`. Tiap entri: satu kalimat + tautan teks ke `/demo/dao|agent|faucet`.

**§5 Dissent (batasan)**
Batasan 6-10 dari bagian "Limitations" dokumen proyek, ditampilkan penuh sebagai catatan kaki bernomor. Ini seksi paling penting; beri ruang dan tipografi yang sama dengan seksi lain, jangan disembunyikan di accordion.

### Fase 2: `/developers`
Quickstart satu halaman: install, `new Judges({...})`, `prove`, `verify`, binding via `contextHashFor`, alamat kontrak. Sumber isi: `docs/integration.md` (jangan menyalin ulang secara berbeda). Blok kode = kertas sedikit lebih gelap (`#E8E2D5`) dengan garis tipis, tombol salin teks polos.

### Fase 3: restyle `/demo`, `/demo/dao`, `/demo/agent`, `/demo/faucet`
Terapkan token dan komponen yang sama. Jangan ubah logika/hook/SDK call.

## 5. Komponen & interaksi
- `<Verdict status="accepted|rejected" reason?>`: label mono besar + garis. Untuk `rejected`: stempel merah (`--stamp`), teks REJECTED, border 2px, sedikit rotasi (-4deg), animasi masuk sekali (scale 1.35→1, opacity 0→1, ~220ms, easing cepat lalu berhenti). Dipicu saat elemen masuk viewport (IntersectionObserver) dan saat demo benar-benar menerima penolakan.
- `prefers-reduced-motion`: tanpa animasi, stempel langsung tampil.
- `<Hash value>`: memotong tengah, `title` berisi nilai penuh, klik = salin + umpan balik teks "copied" 1.5 detik.
- `<Marginalia>` dan `<Footnote>` sebagai komponen; nomor § otomatis dari satu array konfigurasi.
- Tombol: satu gaya saja, persegi, border 1px tinta, hover = balik warna (ink/paper). Tautan = garis bawah tipis.
- Selain stempel, tidak ada animasi lain (tanpa parallax, tanpa fade-in per seksi, tanpa marquee).

## 6. DILARANG (pola "AI flop")
- Tema gelap hitam + ungu/neon, gradien pada teks/tombol/latar, glassmorphism, glow.
- Grid 3 kolom "fitur" dengan ikon, kartu berbayang, pil rounded-full, badge "New/Beta".
- Hero tengah dengan headline bergradien + dua tombol CTA.
- Ikon lucide/emoji dekoratif, ilustrasi 3D, mockup dashboard, blob/abstract shapes.
- Ikon/citra sidik jari, wajah, atau mata (menyiratkan pengumpulan biometrik).
- Palu hakim, timbangan keadilan, pilar pengadilan.
- Statistik, logo klien, testimoni, atau angka apa pun yang dikarang. Semua angka/hash/alamat berasal dari repo atau deployment nyata.
- Copy: "revolutionizing", "seamless", "next-gen", "unlock", "empower", "one human = one wallet", "proof of humanity".
- Class Tailwind default tanpa dikustomisasi (mis. `text-gray-500`, `rounded-xl`, `shadow-lg`); semua lewat token.

## 7. Kualitas
- HTML semantik (`header/main/section/table/footnote`), satu `h1`, hierarki heading benar, `lang="en"`.
- Fokus keyboard terlihat (outline 2px tinta, offset 2px). Kontras >= 4.5:1.
- Responsif dan diperiksa di 390px, 768px, 1280px. Tidak ada scroll horizontal (kode di-wrap atau scroll di dalam blok).
- Performa: tanpa library animasi/chart; font via `next/font`; tanpa gambar raster.
- `pnpm build` dan `pnpm lint` harus lolos.

## 8. Verifikasi & serah terima
1. Jalankan dev server, ambil screenshot `/` di tiga lebar; periksa sendiri terhadap larangan §6 dan perbaiki sampai lolos.
2. Kerjakan berurutan Fase 1 → 2 → 3; commit terpisah per fase.
3. Laporan akhir (ringkas): file yang dibuat/diubah, nilai Verdict yang dipakai dan sumbernya, TODO yang tersisa (mis. data transaksi belum ada), asumsi yang diambil.