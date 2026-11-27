const jwt = require('jsonwebtoken');

const DEFAULT_JWT_EXPIRES_IN = '90d';
const MAX_SESSION_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const DURATION_UNITS_MS = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;

const getJwtSessionMaxAgeMs = () => {
    const expiresIn = getJwtExpiresIn();
    const match = String(expiresIn).trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/i);
    if (!match) {
        throw new Error('JWT_EXPIRES_IN must be a positive duration such as 90d, 12h, or 30m.');
    }

    const amount = Number(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();
    const maxAgeMs = Math.floor(amount * DURATION_UNITS_MS[unit]);
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1000 || maxAgeMs > MAX_SESSION_AGE_MS) {
        throw new Error('JWT_EXPIRES_IN must be between 1 second and 365 days.');
    }
    return maxAgeMs;
};

const signAccessToken = (id, role) => jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: getJwtExpiresIn() }
);

const setAccessTokenCookie = (res, token) => res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: getJwtSessionMaxAgeMs()
});

const clearAccessTokenCookie = (res) => res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
});

module.exports = {
    getJwtExpiresIn,
    getJwtSessionMaxAgeMs,
    signAccessToken,
    setAccessTokenCookie,
    clearAccessTokenCookie
};
