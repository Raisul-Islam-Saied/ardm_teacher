require('dotenv').config();
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
    getJwtExpiresIn,
    getJwtSessionMaxAgeMs,
    signAccessToken,
    setAccessTokenCookie
} = require('./src/services/authSession.service');

const originalExpiresIn = process.env.JWT_EXPIRES_IN;
const originalSecret = process.env.JWT_SECRET;
try {
    process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';

    delete process.env.JWT_EXPIRES_IN;
    assert.equal(getJwtExpiresIn(), '90d');
    assert.equal(getJwtSessionMaxAgeMs(), 90 * 24 * 60 * 60 * 1000);
    const defaultToken = signAccessToken('teacher-id', 'Teacher');
    const defaultClaims = jwt.verify(defaultToken, process.env.JWT_SECRET);
    assert.equal(defaultClaims.exp - defaultClaims.iat, 90 * 24 * 60 * 60);
    let cookieOptions;
    setAccessTokenCookie({
        cookie(name, value, options) {
            assert.equal(name, 'accessToken');
            assert.equal(value, defaultToken);
            cookieOptions = options;
        }
    }, defaultToken);
    assert.equal(cookieOptions.maxAge, 90 * 24 * 60 * 60 * 1000);
    assert.equal(cookieOptions.httpOnly, true);

    process.env.JWT_EXPIRES_IN = '12h';
    assert.equal(getJwtSessionMaxAgeMs(), 12 * 60 * 60 * 1000);

    process.env.JWT_EXPIRES_IN = 'not-a-duration';
    assert.throws(getJwtSessionMaxAgeMs, /JWT_EXPIRES_IN/);

    process.env.JWT_EXPIRES_IN = '400d';
    assert.throws(getJwtSessionMaxAgeMs, /365 days/);
} finally {
    if (originalExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = originalExpiresIn;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
}

console.log('Authentication session duration passed: token and cookie use one configurable 90-day default.');
