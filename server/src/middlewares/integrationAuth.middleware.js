const crypto = require('node:crypto');
const ApiError = require('../utils/ApiError');

const integrations = [
    {
        app: 'results',
        envKey: 'RESULTS_APP_API_KEY',
        scopes: ['teachers:read', 'students:read']
    },
    {
        app: 'admit-card',
        envKey: 'ADMIT_CARD_APP_API_KEY',
        scopes: ['teachers:read', 'students:read']
    }
];

const hashKey = (key) => crypto.createHash('sha256').update(key).digest();

const integrationAuth = (req, res, next) => {
    const configured = integrations
        .map((integration) => ({ ...integration, key: process.env[integration.envKey] }))
        .filter((integration) => Boolean(integration.key));
    if (configured.length === 0) {
        return next(new ApiError(503, 'কোনো trusted app API key সার্ভারে কনফিগার করা নেই।'));
    }
    if (configured.some((integration) => integration.key.length < 32)) {
        return next(new ApiError(503, 'প্রতিটি trusted app API key কমপক্ষে ৩২ অক্ষরের হতে হবে।'));
    }
    const hasDuplicateKeys = configured.some((integration, index) => (
        configured.slice(index + 1).some((other) => (
            crypto.timingSafeEqual(hashKey(integration.key), hashKey(other.key))
        ))
    ));
    if (hasDuplicateKeys) {
        return next(new ApiError(503, 'প্রতিটি trusted app-এর জন্য আলাদা API key কনফিগার করুন।'));
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        return next(new ApiError(401, 'Trusted app API token প্রয়োজন।'));
    }

    const providedHash = hashKey(match[1].trim());
    const matchedIntegrations = configured.filter((integration) => (
        crypto.timingSafeEqual(providedHash, hashKey(integration.key))
    ));
    if (matchedIntegrations.length !== 1) {
        return next(new ApiError(401, 'Trusted app API token সঠিক নয়।'));
    }

    req.integrationApp = {
        app: matchedIntegrations[0].app,
        scopes: matchedIntegrations[0].scopes
    };
    return next();
};

const requireIntegrationScope = (scope) => (req, res, next) => {
    if (!req.integrationApp?.scopes.includes(scope)) {
        return next(new ApiError(403, 'এই trusted app-এর প্রয়োজনীয় API permission নেই।'));
    }
    return next();
};

module.exports = {
    integrationAuth,
    requireIntegrationScope
};
