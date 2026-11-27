const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { loginValidationRules } = require('./src/validators/auth.validator');

const validateIdentifier = async (identifier) => {
    const req = {
        body: { identifier, password: 'valid-password' },
        params: {},
        query: {},
        headers: {}
    };
    await Promise.all(loginValidationRules.map((rule) => rule.run(req)));
    return { req, errors: validationResult(req).array() };
};

const main = async () => {
    for (const identifier of [
        'Teacher@example.org',
        '01812345678',
        '1026030301'
    ]) {
        const { errors } = await validateIdentifier(identifier);
        assert.equal(errors.length, 0, `${identifier} should be accepted as a login identifier`);
    }

    const { errors: invalidEmailErrors } = await validateIdentifier('not-an-email@invalid');
    assert.ok(invalidEmailErrors.some((error) => error.path === 'identifier'));

    const { errors: missingIdentifierErrors } = await validateIdentifier('');
    assert.ok(missingIdentifierErrors.some((error) => error.path === 'identifier'));

    console.log('Login identifier validation passed: email, mobile, and teacher ID are accepted; malformed email is rejected.');
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
