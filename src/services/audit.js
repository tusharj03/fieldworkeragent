import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebase'; // Ensure firebase.js exports app

// Initialize Firestore
const db = getFirestore(app);

export const AuditService = {
    /**
     * Logs an access event to satisfy HIPAA auditing requirements.
     * Crucially, this NEVER logs clinical PHI (transcripts, vitals, etc.)
     * It only logs metadata: Who, What (Access Type), When.
     * 
     * @param {string} userId - The authenticated user's ID
     * @param {string} action - e.g., "EMS_SESSION_STARTED", "EMS_SESSION_WIPED"
     * @param {string} deviceId - Optional device mapping
     */
    async logAccessEvent(userId, action, deviceId = "web-client") {
        if (!userId) return;

        try {
            await addDoc(collection(db, 'audit_logs'), {
                userId,
                action,
                deviceId,
                timestamp: serverTimestamp(),
                systemMode: 'EMS'
            });
            console.log(`[HIPAA Audit] Event logged: ${action}`);
        } catch (error) {
            console.error('[HIPAA Audit] Failed to log access event:', error);
            // In a production HIPAA environment, failure to audit should arguably
            // halt access, but for this context we log the failure.
        }
    }
};
