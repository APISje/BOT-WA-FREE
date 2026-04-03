import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import * as states from './states.js';
import { sendLaporanToDiscord, sendOrderToDiscord } from './discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QRIS_PATH = join(__dirname, '..', 'qris.png');

function formatRupiah(amount) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export async function handleMenu(sock, jid) {
    const text = `╔══════════════════════╗
║  *MENU CDID BY Vireon Interactive*  ║
╚══════════════════════╝

*🎮 LAYANAN JOKI GAME*

📌 *Cara Order:*
1️⃣ Ketik *.m [jumlah M]*
   _Contoh: .m 74_

2️⃣ Bot akan hitung harga otomatis
   (Rp 2.000 per M)

3️⃣ Ketik *.confirm* untuk lanjut bayar

4️⃣ Scan QRIS, lalu hubungi admin

━━━━━━━━━━━━━━━━━━━━━━

📋 *Perintah Tersedia:*
• *.menu* — Tampilkan menu ini
• *.m [jumlah]* — Hitung harga joki
• *.confirm* — Konfirmasi & lihat QRIS
• *.accept* — Input data order
• *.lapor* — Laporkan masalah ke admin

━━━━━━━━━━━━━━━━━━━━━━
💬 _Butuh bantuan? Hubungi founder/Apip_`;
    await sock.sendMessage(jid, { text });
}

export async function handleHargaCalc(sock, jid, jumlahM) {
    const m = parseFloat(jumlahM);
    if (isNaN(m) || m <= 0) {
        await sock.sendMessage(jid, { text: '❌ Format salah! Contoh penggunaan:\n\n*.m 74*\n\n_(angka harus lebih dari 0)_' });
        return;
    }
    const harga = m * config.HARGA_PER_M;
    states.setPendingOrder(jid, { jumlahM: m, harga });

    const text = `╔══════════════════════╗
║  *💰 KALKULASI HARGA JOKI*  ║
╚══════════════════════╝

🎮 Jumlah Gold : *${m}M*
💵 Harga per M : *${formatRupiah(config.HARGA_PER_M)}*
━━━━━━━━━━━━━━━━━━━━━━
💳 *Total Harga : ${formatRupiah(harga)}*
━━━━━━━━━━━━━━━━━━━━━━

Ketik *.confirm* untuk melanjutkan pembayaran 🔥`;
    await sock.sendMessage(jid, { text });
}

export async function handleConfirm(sock, jid) {
    const order = states.getPendingOrder(jid);

    if (!order) {
        await sock.sendMessage(jid, { text: '⚠️ Kamu belum menghitung harga!\nGunakan *.m [jumlah]* terlebih dahulu.\n\nContoh: *.m 50*' });
        return;
    }

    const text = `╔══════════════════════╗
║  *✅ KONFIRMASI ORDER*  ║
╚══════════════════════╝

🎮 Gold   : *${order.jumlahM}M*
💳 Total  : *${formatRupiah(order.harga)}*

━━━━━━━━━━━━━━━━━━━━━━
📸 *Scan QRIS di bawah untuk bayar!*
━━━━━━━━━━━━━━━━━━━━━━

_Setelah bayar, screenshot bukti transfer & hubungi admin_`;

    await sock.sendMessage(jid, { text });

    if (existsSync(QRIS_PATH)) {
        await sock.sendMessage(jid, {
            image: { url: QRIS_PATH },
            caption: `💳 QRIS Pembayaran - ${formatRupiah(order.harga)}\n\n_Scan untuk bayar, lalu hubungi admin dengan bukti transfer_`
        });
    } else {
        await sock.sendMessage(jid, { text: '⚠️ File QRIS belum ada. Hubungi admin langsung untuk info pembayaran.' });
    }
}

export async function handleAcceptStart(sock, jid) {
    states.setAcceptSession(jid, { step: 'nama' });
    await sock.sendMessage(jid, { text: `╔══════════════════════╗
║  *📋 INPUT DATA ORDER*  ║
╚══════════════════════╝

Silakan isi data order step by step.

*Step 1/4*
👤 Ketik *nama akun game* kamu:` });
}

export async function handleAcceptFlow(sock, jid, body) {
    const session = states.getAcceptSession(jid);
    if (!session) return false;

    if (session.step === 'nama') {
        session.nama = body;
        session.step = 'pw';
        states.setAcceptSession(jid, session);
        await sock.sendMessage(jid, { text: `✅ Nama: *${body}*\n\n*Step 2/4*\n🔑 Ketik *password akun game* kamu:` });
        return true;
    }

    if (session.step === 'pw') {
        session.pw = body;
        session.step = 'nominal';
        states.setAcceptSession(jid, session);
        await sock.sendMessage(jid, { text: `✅ Password disimpan.\n\n*Step 3/4*\n🎮 Ketik *nominal gold* yang mau dijoki (contoh: 74):` });
        return true;
    }

    if (session.step === 'nominal') {
        const nominal = parseFloat(body);
        if (isNaN(nominal) || nominal <= 0) {
            await sock.sendMessage(jid, { text: '❌ Nominal tidak valid. Masukkan angka yang benar.\n\nContoh: *74*' });
            return true;
        }
        session.nominal = nominal;
        session.harga = nominal * config.HARGA_PER_M;
        session.step = 'status';
        states.setAcceptSession(jid, session);
        await sock.sendMessage(jid, { text: `✅ Nominal: *${nominal}M*\n💰 Harga: *${formatRupiah(session.harga)}*\n\n*Step 4/4*\n📊 Ketik *status* order (proses/done):` });
        return true;
    }

    if (session.step === 'status') {
        const status = body.toLowerCase();
        if (status !== 'proses' && status !== 'done') {
            await sock.sendMessage(jid, { text: '❌ Status tidak valid. Masukkan *proses* atau *done*' });
            return true;
        }
        session.status = status.charAt(0).toUpperCase() + status.slice(1);
        states.clearAcceptSession(jid);

        const ringkasan = `╔══════════════════════╗
║  *📋 DATA ORDER TERSIMPAN*  ║
╚══════════════════════╝

👤 Nama      : ${session.nama}
🔑 Password  : ${session.pw}
🎮 Gold      : ${session.nominal}M
💰 Harga     : ${formatRupiah(session.harga)}
📊 Status    : ${session.status}

━━━━━━━━━━━━━━━━━━━━━━
✅ Data order berhasil disimpan & dikirim ke admin!`;

        await sock.sendMessage(jid, { text: ringkasan });

        await sendOrderToDiscord({
            namaUser: session.nama,
            pw: session.pw,
            nominalGold: session.nominal,
            harga: session.harga,
            status: session.status,
        });
        return true;
    }

    return false;
}

export async function handleLaporStart(sock, jid) {
    states.setPendingLaporan(jid, { step: 'nama' });
    await sock.sendMessage(jid, { text: `╔══════════════════════╗
║  *📢 LAPOR MASALAH*  ║
╚══════════════════════╝

Kami akan memproses laporan kamu segera.

*Step 1/3*
👤 Ketik *nama kamu*:` });
}

export async function handleLaporFlow(sock, jid, body) {
    const laporan = states.getPendingLaporan(jid);
    if (!laporan) return false;

    if (laporan.step === 'nama') {
        laporan.nama = body;
        laporan.step = 'alasan';
        states.setPendingLaporan(jid, laporan);
        await sock.sendMessage(jid, { text: `✅ Nama: *${body}*\n\n*Step 2/3*\n📝 Ketik *alasan laporan* kamu:` });
        return true;
    }

    if (laporan.step === 'alasan') {
        laporan.alasan = body;
        laporan.step = 'admin';
        states.setPendingLaporan(jid, laporan);
        await sock.sendMessage(jid, { text: `✅ Alasan tercatat.\n\n*Step 3/3*\n👮 Ketik *nama admin* yang ingin dilaporkan:` });
        return true;
    }

    if (laporan.step === 'admin') {
        laporan.namaAdmin = body;
        states.clearPendingLaporan(jid);

        await sock.sendMessage(jid, { text: `╔══════════════════════╗
║  *✅ LAPORAN TERKIRIM*  ║
╚══════════════════════╝

Terima kasih laporannya, kami siap menangani! 🙏

📋 *Ringkasan Laporan:*
• Nama    : ${laporan.nama}
• Alasan  : ${laporan.alasan}
• Admin   : ${laporan.namaAdmin}

_Tim kami akan segera menindaklanjuti laporan ini._` });

        await sendLaporanToDiscord({
            nama: laporan.nama,
            alasan: laporan.alasan,
            namaAdmin: laporan.namaAdmin,
        });
        return true;
    }

    return false;
}
