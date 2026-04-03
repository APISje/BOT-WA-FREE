const offlineAutoReplyCount = {};
const pendingOrders = {};
const pendingLaporan = {};
const acceptSessions = {};

export function getAutoReplyCount(userId) {
    return offlineAutoReplyCount[userId] || 0;
}

export function incrementAutoReply(userId) {
    offlineAutoReplyCount[userId] = (offlineAutoReplyCount[userId] || 0) + 1;
}

export function resetAutoReply(userId) {
    offlineAutoReplyCount[userId] = 0;
}

export function setPendingOrder(userId, data) {
    pendingOrders[userId] = data;
}

export function getPendingOrder(userId) {
    return pendingOrders[userId] || null;
}

export function clearPendingOrder(userId) {
    delete pendingOrders[userId];
}

export function setPendingLaporan(userId, data) {
    pendingLaporan[userId] = data;
}

export function getPendingLaporan(userId) {
    return pendingLaporan[userId] || null;
}

export function clearPendingLaporan(userId) {
    delete pendingLaporan[userId];
}

export function setAcceptSession(userId, data) {
    acceptSessions[userId] = data;
}

export function getAcceptSession(userId) {
    return acceptSessions[userId] || null;
}

export function clearAcceptSession(userId) {
    delete acceptSessions[userId];
}
