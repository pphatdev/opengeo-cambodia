import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    nodeEnv: process.env.NODE_ENV || "development",
    domain: process.env.APP_DOMAIN || "opengeo-cambodia.pphat.me",
    appUrl: process.env.APP_URL || "https://opengeo-cambodia.pphat.me",

    // OpenStreetMap Services
    nominatim: {
        baseUrl: process.env.NOMINATIM_BASE_URL ||
            "https://nominatim.openstreetmap.org",
        userAgent: process.env.NOMINATIM_USER_AGENT ||
            "OpenGeoCambodia/1.0 (contact@opengeo-cambodia.pphat.me)",
        timeoutMs: 8000,
    },

    overpass: {
        apiUrl: process.env.OVERPASS_API_URL ||
            "https://overpass-api.de/api/interpreter",
        timeoutMs: 60000,
    },

    // Local cache TTL & files (Default: 1 year / 31,536,000 seconds)
    cache: {
        ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "31536000", 10),
    },
};
