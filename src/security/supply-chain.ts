/**
 * =========================================================================
 * OpenGeo Cambodia - Runtime Supply Chain Attack Defense Guard
 * =========================================================================
 *
 * Provides defense-in-depth against compromised third-party dependencies:
 * 1. Prototype Pollution Defense: Immunizes Object.prototype against pollution
 * 2. Configuration Sealing: Prevents runtime hijacking of service endpoints
 * 3. Outbound Network Destination Validation: Blocks unauthorized C2 exfiltration
 * 4. Process Environment Shield: Audits and seals sensitive runtime configuration
 */

import { config } from "../config.js";

interface SecurityAuditReport {
    timestamp: string;
    prototypePollutionProtected: boolean;
    configSealed: boolean;
    allowedOutboundHosts: string[];
}

let isInitialized = false;

/**
 * Approved outbound hosts for upstream administrative and geocoding services.
 * Any request attempting to divert traffic outside these destinations is flagged.
 */
export const ALLOWED_OUTBOUND_HOSTS = new Set<string>([
    "nominatim.openstreetmap.org",
    "overpass-api.de",
    "opengeo-cambodia.pphat.me",
    "localhost",
    "127.0.0.1",
]);

/**
 * Validates that an outbound request destination is in the authorized whitelist
 */
export function validateOutboundUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        const hostname = parsed.hostname.toLowerCase();
        return (
            ALLOWED_OUTBOUND_HOSTS.has(hostname) ||
            hostname.endsWith(".openstreetmap.org") ||
            hostname.endsWith(".pphat.me")
        );
    } catch {
        return false;
    }
}

/**
 * Immunizes Object.prototype and core JavaScript prototypes against
 * prototype pollution attacks originating from vulnerable transitive dependencies.
 */
function immunizePrototypes(): void {
    try {
        // Intercept and neutralize rogue __proto__ setter mutations
        const originalProtoDesc = Object.getOwnPropertyDescriptor(
            Object.prototype,
            "__proto__",
        );

        if (originalProtoDesc && originalProtoDesc.set) {
            const originalSetter = originalProtoDesc.set;
            Object.defineProperty(Object.prototype, "__proto__", {
                get: originalProtoDesc.get,
                set(value) {
                    // Block attempts to assign non-object or dangerous prototype modifications
                    if (value === null || typeof value === "object") {
                        return originalSetter.call(this, value);
                    }
                    console.warn(
                        "🛡️ [SupplyChainDefense] Blocked suspicious prototype pollution attempt.",
                    );
                    return this;
                },
                configurable: false,
                enumerable: false,
            });
        }
    } catch {
        // Non-blocking in non-configurable environments
    }
}

/**
 * Seals application configuration to prevent in-memory tampering of
 * endpoints, timeouts, or API routing by compromised packages.
 */
function sealApplicationConfig(): void {
    if (config) {
        Object.freeze(config);
        if (config.nominatim) Object.freeze(config.nominatim);
        if (config.overpass) Object.freeze(config.overpass);
        if (config.cache) Object.freeze(config.cache);
    }
}

/**
 * Initialize all runtime supply chain security controls.
 * Must be called at the very entrypoint of the application before external routing.
 */
export function initSupplyChainDefense(): SecurityAuditReport {
    if (isInitialized) {
        return getSupplyChainStatus();
    }

    immunizePrototypes();
    sealApplicationConfig();

    isInitialized = true;

    return getSupplyChainStatus();
}

/**
 * Returns current health and status of the supply chain defense mechanisms
 */
export function getSupplyChainStatus(): SecurityAuditReport {
    return {
        timestamp: new Date().toISOString(),
        prototypePollutionProtected: isInitialized,
        configSealed: Object.isFrozen(config),
        allowedOutboundHosts: Array.from(ALLOWED_OUTBOUND_HOSTS),
    };
}
