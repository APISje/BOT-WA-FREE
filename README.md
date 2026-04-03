# Bot WhatsApp Vireon Interactive

Bot WhatsApp untuk bisnis joki game CDID by Vireon Interactive.

## Cara Jalankan

### 1. Install Dependencies
```bash
cd artifacts/wa-bot
npm install
```

### 2. Siapkan QRIS
Taruh file `qris.png` kamu di folder `artifacts/wa-bot/`

### 3. Jalankan Bot
```bash
npm start
```

### 4. Scan QR Code
- Buka WhatsApp di HP kamu
- Masuk ke **Pengaturan > Perangkat Tertaut > Tautkan Perangkat**
- Scan QR Code yang muncul di terminal

## Fitur Bot

| Perintah | Keterangan |
|----------|------------|
| `.menu` | Tampilkan menu layanan |
| `.m [jumlah]` | Hitung harga joki (contoh: `.m 74`) |
| `.confirm` | Konfirmasi & kirim QRIS bayar |
| `.accept` | Input data order (step by step) |
| `.lapor` | Laporan masalah → dikirim ke Discord |

## Auto Reply Offline
- Bot otomatis balas pesan saat offline
- Maksimal 3x per pengguna
- Setelah 3x, tidak balas lagi

## Laporan ke Discord
Setiap `.lapor` dan `.accept` akan dikirim ke Discord webhook secara otomatis.

## Catatan
- Bot hanya merespons pesan personal (bukan grup)
- Pesan dari diri sendiri tidak diproses
- Sesi login tersimpan di folder `.wwebjs_auth` (tidak perlu scan ulang)
