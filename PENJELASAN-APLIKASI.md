# Judges — Penjelasan Aplikasi & Alur Pengguna

_Dibuat 22 Sep 2026, untuk membantu tim memahami produk ini dari nol._

---

## 1. Apa itu Judges?

Judges adalah **lapisan verifikasi identitas untuk Web3** yang privasi-preserving (tidak membocorkan identitas asli). Dibangun untuk hackathon Monad, kategori **Trust, Identity & AI Infrastructure**.

### Masalah yang diselesaikan

Di dunia Web3 (blockchain), siapa pun bisa membuat wallet baru dengan gratis dan tanpa batas. Ini bikin masalah "sybil attack": satu orang bisa berpura-pura jadi banyak orang dengan cara bikin banyak wallet.

Contoh kasus nyata:
- **Airdrop/faucet**: satu orang bisa klaim token berkali-kali pakai wallet berbeda-beda, padahal jatahnya cuma untuk 1 orang.
- **Voting DAO**: satu orang bisa vote berkali-kali dengan wallet berbeda, merusak hasil voting yang harusnya "1 orang 1 suara".
- **AI Agent registry**: siapa saja bisa daftarin agent AI palsu tanpa ada yang membatasi.

### Solusi Judges

Judges memakai **passkey** (Face ID, Touch ID, Windows Hello, atau PIN di HP) sebagai bukti bahwa ada manusia asli di balik sebuah wallet — tanpa perlu KYC, tanpa upload KTP, tanpa database biometrik di server.

Klaim yang dibuktikan Judges:

> **"Wallet ini didukung oleh passkey yang sudah lolos verifikasi pengguna (user verification)."**

Yang **tidak** dijamin Judges (harus jujur soal ini):
- Bukan jaminan "1 orang = 1 manusia unik" — satu orang tetap bisa punya beberapa passkey.
- Bukan KYC — tidak ada data identitas asli yang disimpan.

---

## 2. Konsep Inti (istilah penting)

| Istilah | Penjelasan sederhana |
|---|---|
| **Passkey** | Kunci digital yang tersimpan di device (HP/laptop), dibuka pakai biometrik/PIN. Private key-nya tidak pernah keluar dari device. |
| **WebAuthn** | Standar teknis untuk passkey — dipakai browser modern (Chrome, Safari, dll). |
| **Secret (rahasia identitas)** | Angka rahasia yang diturunkan dari tanda tangan wallet kamu sendiri. Sekarang (setelah "Redesign B") secret ini **dibuat di browser kamu sendiri**, server tidak pernah tahu. |
| **Commitment** | Hasil hash dari secret. Aman dikirim ke server karena tidak bisa dibalik jadi secret asli. |
| **Merkle Tree / Root** | Struktur data yang menggabungkan semua commitment terdaftar jadi satu "root" (angka ringkasan). Root ini yang dicatat on-chain. |
| **Nullifier** | Kode unik per (identitas + aplikasi). Dipakai buat cegah 1 orang klaim 2 kali di aplikasi yang sama, tanpa membocorkan siapa orangnya. |
| **Zero-Knowledge Proof (ZK Proof / Groth16)** | Bukti matematis: "saya tahu sebuah secret yang commitment-nya ada di dalam tree itu" — TANPA membuka secret aslinya ke siapa pun, termasuk ke blockchain. |
| **Monad** | Blockchain (mirip Ethereum tapi lebih cepat) tempat semua kontrak Judges di-deploy. Testnet dulu, baru nanti mainnet. |
| **JudgesVerifier** (smart contract) | Kontrak on-chain yang mengecek ZK proof + mengecek nullifier belum pernah dipakai. |

---

## 3. Alur Sistem, dari Awal sampai Akhir

Ini alur lengkap, dari user daftar sampai transaksi tercatat di blockchain.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TAHAP 1 — DAFTAR PASSKEY (sekali saja per device)                   │
└─────────────────────────────────────────────────────────────────────┘
  User buka /demo
        │
        ▼
  Klik "Register with passkey"
        │
        ▼
  Browser minta verifikasi (Face ID / Windows Hello / PIN)
        │
        ▼
  Device bikin passkey baru, kirim public key ke server Judges
        │
        ▼
  Server simpan public key di database (Neon Postgres)
  ⚠️ Private key TIDAK PERNAH dikirim — tetap di device user

┌─────────────────────────────────────────────────────────────────────┐
│  TAHAP 2 — DAFTAR IDENTITAS (Redesign B, sekali per wallet)          │
└─────────────────────────────────────────────────────────────────────┘
  User connect wallet (MetaMask dll) di /demo
        │
        ▼
  Browser minta user tanda tangan pesan tetap pakai wallet
        │
        ▼
  Dari tanda tangan itu, browser hitung "secret" (rahasia)
  ⚠️ Secret ini TIDAK PERNAH dikirim ke server — dihitung & dipakai
     langsung di browser
        │
        ▼
  Browser hitung "commitment" = hash(secret)
        │
        ▼
  Browser kirim commitment ke server + bukti passkey (assertion)
        │
        ▼
  Server cek passkey valid → simpan commitment di database
        │
        ▼
  Server hitung ulang "root" gabungan semua commitment terdaftar

┌─────────────────────────────────────────────────────────────────────┐
│  TAHAP 3 — POSTING ROOT KE BLOCKCHAIN (dilakukan operator/admin)     │
└─────────────────────────────────────────────────────────────────────┘
  Admin ambil root terbaru dari server (GET /api/commitments/root)
        │
        ▼
  Admin kirim transaksi: CommitmentTree.postRoot(root)
        │
        ▼
  Root tercatat permanen di blockchain Monad
  (proof baru akan valid HANYA kalau merujuk ke root yang sudah di-post)

┌─────────────────────────────────────────────────────────────────────┐
│  TAHAP 4 — MEMBUKTIKAN & PAKAI APLIKASI (tiap kali user beraksi)     │
└─────────────────────────────────────────────────────────────────────┘
  User buka salah satu demo: DAO vote / Agent Registry / Faucet
        │
        ▼
  Klik tombol aksi (misal "Vote Yes" atau "Claim")
        │
        ▼
  Browser generate ZK Proof (butuh beberapa detik):
    "Saya tahu secret yang commitment-nya ada di root X,
     dan saya mau lakukan aksi Y dengan wallet Z"
  ⚠️ Proof dibuat LANGSUNG DI BROWSER (bukan di server) —
     ini bagian penting dari Redesign B
        │
        ▼
  Browser kirim proof ke smart contract JudgesVerifier di Monad
        │
        ▼
  JudgesVerifier cek 3 hal:
    1. Root yang dipakai proof ini beneran sudah di-post on-chain?
    2. Proof-nya matematis valid (ZK check)?
    3. Nullifier-nya belum pernah dipakai di aplikasi ini?
        │
        ▼
  Kalau semua valid → transaksi sukses, nullifier ditandai "sudah pakai"
  Kalau user coba klaim/vote lagi dengan identitas sama →
     DITOLAK otomatis ("NullifierAlreadyUsed")
```

---

## 4. Kenapa Ada 2 Server, Bukan Cuma Blockchain?

Ini sering bikin bingung. Judges pakai kombinasi **on-chain** (blockchain) + **off-chain** (server biasa):

| Yang di server (Neon Postgres) | Yang di blockchain (Monad) |
|---|---|
| Public key passkey | Root Merkle Tree (angka ringkasan) |
| Commitment (hash dari secret) | Hasil verifikasi (valid/tidak) |
| Root history | Nullifier yang sudah dipakai |
| **Secret asli TIDAK PERNAH disimpan** | Alamat wallet yang beraksi |

Alasannya: menyimpan/menghitung Merkle Tree di server jauh lebih murah dan cepat daripada di blockchain (yang biayanya dalam bentuk gas fee). Blockchain hanya menyimpan "kesimpulan akhir" (root + hasil verifikasi), bukan semua data mentah.

---

## 5. Sejarah Singkat: Kenapa Ada "Redesign B"?

Versi awal (v1) punya kelemahan serius yang ditemukan lewat audit:

> **Ditemukan bug kritis**: sirkuit ZK versi lama menerima secret APAPUN tanpa mengecek apakah secret itu benar-benar terdaftar. Artinya siapa saja bisa membuat proof palsu tanpa pernah punya passkey sama sekali — sistem anti-sybil-nya bisa dibobol total.

**Perbaikan (Redesign B)**:
1. Secret sekarang **wajib** merupakan bagian dari Merkle Tree yang sudah terdaftar (dicek via `CommitmentTree` on-chain).
2. Secret dihitung di **browser user sendiri** (dari tanda tangan wallet), bukan di server — jadi server tidak bisa lagi tahu/hitung secret siapa pun.
3. Proses generate proof dipindah dari server ke browser (browser proving).

---

## 6. Ringkasan Alur Pengguna (versi singkat, buat non-teknis)

```
1. Buka aplikasi Judges
      ↓
2. Daftar pakai Face ID/sidik jari/PIN (sekali saja)
      ↓
3. Hubungkan wallet crypto, tanda tangan sekali
      ↓
4. (Admin memproses pendaftaran di background — sekali per batch user baru)
      ↓
5. Sekarang bisa pakai aplikasi: vote DAO / daftar AI agent / klaim faucet
      ↓
6. Tiap aksi: klik tombol → tunggu beberapa detik (proses bukti privasi) → selesai
      ↓
7. Coba lakukan aksi sama 2x dengan akun sama → ditolak otomatis
```

---

## 7. Batasan Jujur (Harus Diketahui, Bukan Disembunyikan)

- Judges membuktikan **"ada pemegang passkey terverifikasi"**, BUKAN **"1 manusia unik"**. Satu orang tetap bisa bikin beberapa passkey.
- Server masih bisa menolak/menahan pendaftaran commitment baru (belum sepenuhnya tanpa kepercayaan/trustless).
- Trusted setup (ceremony kriptografi) yang dipakai masih versi single-contributor — cukup untuk hackathon, belum untuk produksi sungguhan.
- Butuh device dengan Face ID/Touch ID/Windows Hello — tidak semua device browser otomatis mendukung.

---

## 8. Struktur Halaman Web

| Halaman | Isi |
|---|---|
| `/` | Landing page — penjelasan produk, gaya "putusan pengadilan" (paper & ink, formal) |
| `/developers` | Panduan untuk developer lain yang mau integrasi pakai SDK |
| `/demo` | Tempat daftar passkey + connect wallet + daftar identitas |
| `/demo/dao` | Contoh: voting DAO anti-sybil |
| `/demo/agent` | Contoh: pendaftaran AI agent anti-sybil |
| `/demo/faucet` | Contoh: klaim token gratis anti-sybil |
| `/connect` | Halaman popup buat situs pihak ketiga yang mau pakai Judges |

---

_Referensi lebih detail: `Judges_README.md` (produk & model keamanan), `IMPLEMENTATION.md` (log pembangunan), `docs/security.md` (temuan audit & Redesign B), `STATUS.md` (status proyek terkini)._
