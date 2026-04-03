import axios from 'axios';
import config from './config.js';

async function sendToDiscord(embed) {
    try {
        await axios.post(config.DISCORD_WEBHOOK, {
            username: "Vireon Interactive Bot",
            embeds: [embed]
        });
        return true;
    } catch (err) {
        console.error('[Discord] Gagal kirim webhook:', err.message);
        return false;
    }
}

export async function sendLaporanToDiscord({ nama, alasan, namaAdmin }) {
    const embed = {
        title: "📋 Laporan Masuk",
        color: 0xFF0000,
        fields: [
            { name: "Nama Pelapor", value: nama, inline: true },
            { name: "Admin yang Dilaporkan", value: namaAdmin, inline: true },
            { name: "Alasan", value: alasan, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Vireon Interactive - Laporan Sistem" }
    };
    return await sendToDiscord(embed);
}

export async function sendOrderToDiscord({ namaUser, pw, nominalGold, harga, status }) {
    const embed = {
        title: "🎮 Order Joki Baru",
        color: 0x00FF00,
        fields: [
            { name: "User", value: namaUser, inline: true },
            { name: "Password", value: pw, inline: true },
            { name: "Nominal Gold", value: `${nominalGold}M`, inline: true },
            { name: "Harga", value: `Rp ${harga.toLocaleString('id-ID')}`, inline: true },
            { name: "Status", value: status, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Vireon Interactive - Order System" }
    };
    return await sendToDiscord(embed);
}
