
/**
 * Service for handling WebAuthn (Passkeys) logic.
 * Note: Real-world implementation requires server-side verification.
 * This is a client-side implementation designed for high-end demo purposes.
 */
export const PasskeyService = {
    // Check if the device supports biometrics
    async isSupported() {
        return window.PublicKeyCredential &&
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    },

    // Helper to convert base64 to Uint8Array
    _base64ToUint8Array(base64) {
        const binary = window.atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    },

    // Helper to convert ArrayBuffer to base64
    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    /**
     * Registers a new passkey for the current user.
     * @param {string} email - User's email
     * @param {string} displayName - User's name
     */
    async register(email, displayName) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        const createCredentialOptions = {
            publicKey: {
                challenge,
                rp: {
                    name: "Beacon AI",
                    id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
                },
                user: {
                    id: userId,
                    name: email,
                    displayName: displayName || email,
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" }, // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    residentKey: "required",
                    requireResidentKey: true,
                },
                timeout: 60000,
                attestation: "none",
            },
        };

        const credential = await navigator.credentials.create(createCredentialOptions);

        // In a real app, you'd send `credential` to your server to save the public key.
        // For this demo, we'll store it in localStorage mapped to the email.
        const passkeyData = {
            id: credential.id,
            rawId: this._arrayBufferToBase64(credential.rawId),
            type: credential.type,
        };

        const savedPasskeys = JSON.parse(localStorage.getItem('beacon_passkeys') || '{}');
        savedPasskeys[email] = passkeyData;
        localStorage.setItem('beacon_passkeys', JSON.stringify(savedPasskeys));

        return passkeyData;
    },

    /**
     * Authenticates a user with a passkey.
     * @param {string} email - Optional email to hint which passkey to use
     */
    async authenticate(email) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const savedPasskeys = JSON.parse(localStorage.getItem('beacon_passkeys') || '{}');

        // If an email is provided but no passkey exists for it, we can't proceed
        if (email && !savedPasskeys[email]) {
            throw new Error("No passkey found for this email.");
        }

        // Allow any registered credential if no email is specified (Resident Key flow)
        const allowCredentials = email ? [
            {
                id: this._base64ToUint8Array(savedPasskeys[email].rawId),
                type: "public-key",
            }
        ] : [];

        const getCredentialOptions = {
            publicKey: {
                challenge,
                timeout: 60000,
                userVerification: "required",
                allowCredentials,
                rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
            },
        };

        const assertion = await navigator.credentials.get(getCredentialOptions);

        // Find the email associated with this credential ID
        let authenticatedEmail = email;
        if (!authenticatedEmail) {
            for (const [e, data] of Object.entries(savedPasskeys)) {
                if (data.id === assertion.id) {
                    authenticatedEmail = e;
                    break;
                }
            }
        }

        if (!authenticatedEmail) {
            throw new Error("Passkey recognized but no matching account found.");
        }

        return { email: authenticatedEmail, assertion };
    }
};
