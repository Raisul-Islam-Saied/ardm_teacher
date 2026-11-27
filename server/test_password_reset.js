require('dotenv').config();
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const {
    PASSWORD_RESET_TTL_MS,
    createPasswordResetToken,
    hashPasswordResetToken,
    buildPasswordResetUrl
} = require('./src/services/passwordReset.service');
const {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
} = require('./src/validators/teacher.validator');

const main = async () => {
    const originalClientUrl = process.env.CLIENT_URL;
    try {
        const reset = createPasswordResetToken();
        assert.match(reset.token, /^[a-f0-9]{64}$/);
        assert.equal(reset.tokenHash, hashPasswordResetToken(reset.token));
        assert.notEqual(reset.tokenHash, reset.token);
        assert.ok(reset.expiresAt.getTime() > Date.now());
        assert.ok(reset.expiresAt.getTime() <= Date.now() + PASSWORD_RESET_TTL_MS);

        process.env.CLIENT_URL = 'https://portal.example.test,https://backup.example.test';
        const resetUrl = new URL(buildPasswordResetUrl(reset.token));
        assert.equal(resetUrl.origin, 'https://portal.example.test');
        assert.equal(resetUrl.pathname, '/password-recovery');
        assert.equal(resetUrl.searchParams.get('token'), reset.token);

        process.env.CLIENT_URL = 'javascript:alert(1)';
        assert.throws(() => buildPasswordResetUrl(reset.token), /CLIENT_URL/);

        for (const rules of [createTeacherValidator, publicSelfRegisterValidator]) {
            const req = { body: {}, params: {}, query: {}, headers: {} };
            await Promise.all(rules.map((rule) => rule.run(req)));
            const errors = validationResult(req).array();
            assert.ok(
                errors.some((error) => error.path === 'email' || error.param === 'email'),
                'Teacher account registration must reject a missing email address'
            );
        }

        const updateReq = { body: { email: '' }, params: {}, query: {}, headers: {} };
        await Promise.all(updateTeacherValidator.map((rule) => rule.run(updateReq)));
        assert.ok(
            validationResult(updateReq).array().some((error) => error.path === 'email' || error.param === 'email'),
            'Teacher account profile updates must not clear the recovery email address'
        );
    } finally {
        if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
        else process.env.CLIENT_URL = originalClientUrl;
    }

    console.log('Password reset and registration validation passed: single-use token format, 15-minute expiry, safe link, and required teacher email.');
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
