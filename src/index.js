import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidGroup,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import config from './config.js';
import * as states from './states.js';
import {
    handleMenu,
    handleHargaCalc,
    handleConfirm,
    handleAcceptStart,
    handleAcceptFlow,
    handleLaporStart,
    handleLaporFlow,
} from './handlers.js';

const AUTH_FOLDER = './auth_info';
if (!existsSync(AUTH_FOLDER)) mkdirSync(AUTH_FOLDER, { recursive: true });

const logger = pino({ level: 'silent' });

const PHONE_NUMBER = '6281330032894';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    console.log('\n========================================');
    console.log('  🤖 Bot WhatsApp Vireon Interactive');
    console.log('  Nomor:', PHONE_NUMBER);
    console.log('========================================\n');

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
    });

    let pairingRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true;
            try {
                const code = await sock.requestPairingCode(PHONE_NUMBER);
                const formatted = code.match(/.{1,4}/g).join('-');
                console.log('\n╔══════════════════════════════════╗');
                console.log('║   🔑 KODE PAIRING WHATSAPP       ║');
                console.log('╠══════════════════════════════════╣');
                console.log(`║   Kode: ${formatted.padEnd(26)}║`);
                console.log('╚══════════════════════════════════╝');
                console.log('\n📱 Cara pairing:');
                console.log('   1. Buka WhatsApp di HP kamu');
                console.log('   2. Pengaturan → Perangkat Tertaut');
                console.log('   3. Tautkan Perangkat → Tautkan dengan nomor telepon');
                console.log('   4. Masukkan kode di atas\n');
            } catch (err) {
                console.error('❌ Gagal minta pairing code:', err.message);
            }
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`\n⚠️ Koneksi terputus. Alasan: ${reason}`);
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Mencoba koneksi ulang dalam 5 detik...');
                pairingRequested = false;
                setTimeout(startBot, 5000);
            } else {
                console.log('❌ Akun logout. Hapus folder auth_info dan restart bot.');
                process.exit(1);
            }
        }

        if (connection === 'open') {
            console.log('\n✅ Bot WhatsApp Vireon Interactive AKTIF!');
            console.log(`📱 Nomor: +${PHONE_NUMBER}`);
            console.log('🤖 Bot siap menerima pesan...\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            if (!msg.message) continue;

            const jid = msg.key.remoteJid;
            if (!jid) continue;
            if (isJidGroup(jid)) continue;

            const body = (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                ''
            ).trim();

            if (!body) continue;

            const bodyLower = body.toLowerCase();
            console.log(`[MSG] ${jid}: ${body}`);

            const inAccept = await handleAcceptFlow(sock, jid, body);
            if (inAccept) continue;

            const inLapor = await handleLaporFlow(sock, jid, body);
            if (inLapor) continue;

            if (bodyLower === '.menu') {
                states.resetAutoReply(jid);
                await handleMenu(sock, jid);
                continue;
            }

            if (bodyLower.startsWith('.m ')) {
                states.resetAutoReply(jid);
                const parts = body.split(' ');
                const jumlah = parts[1];
                await handleHargaCalc(sock, jid, jumlah);
                continue;
            }

            if (bodyLower === '.confirm') {
                states.resetAutoReply(jid);
                await handleConfirm(sock, jid);
                continue;
            }

            if (bodyLower === '.accept') {
                states.resetAutoReply(jid);
                await handleAcceptStart(sock, jid);
                continue;
            }

            if (bodyLower === '.lapor') {
                states.resetAutoReply(jid);
                await handleLaporStart(sock, jid);
                continue;
            }

            const count = states.getAutoReplyCount(jid);
            if (count < config.AUTO_REPLY_MAX) {
                states.incrementAutoReply(jid);
                await sock.sendMessage(jid, { text: config.AUTO_REPLY_MSG });
            }
        }
    });

    process.on('SIGINT', async () => {
        console.log('\n🛑 Mematikan bot...');
        await sock.logout();
        process.exit(0);
    });
}

startBot().catch(err => {
    console.error('❌ Error bot:', err);
    process.exit(1);
});
