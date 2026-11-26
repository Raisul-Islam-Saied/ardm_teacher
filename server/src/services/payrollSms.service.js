const ApiError = require('../utils/ApiError');

const getSmsConfiguration = () => {
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;
    if (!apiKey || !senderId) {
        throw new ApiError(503, 'SMS gateway configuration is missing on the server.');
    }
    return { apiKey, senderId };
};

const postGatewayRequest = async (endpoint, payload, operation) => {
    if (!endpoint) {
        throw new ApiError(503, `SMS gateway ${operation} endpoint is not configured on the server.`);
    }
    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000)
        });
    } catch (error) {
        throw new ApiError(502, `Could not connect to the SMS gateway for ${operation}.`);
    }

    const responseText = await response.text();
    if (!response.ok || !/(^|\D)202(\D|$)/.test(responseText)) {
        throw new ApiError(502, `The SMS gateway did not accept the ${operation} request.`);
    }
    return true;
};

const normalizeBangladeshPhone = (value) => {
    let phone = String(value || '').replace(/\D/g, '');
    if (phone.length === 11 && phone.startsWith('0')) phone = `88${phone}`;
    if (!/^8801[3-9]\d{8}$/.test(phone)) return null;
    return phone;
};

const sendSinglePayrollSms = async ({ phone, message }) => {
    const config = getSmsConfiguration();
    return postGatewayRequest(
        process.env.SMS_API_URL,
        {
            api_key: config.apiKey,
            senderid: config.senderId,
            number: phone,
            message
        },
        'single SMS'
    );
};

const sendBulkPayrollSms = async (messages) => {
    const config = getSmsConfiguration();
    return postGatewayRequest(
        process.env.SMS_BULK_API_URL,
        {
            api_key: config.apiKey,
            senderid: config.senderId,
            messages: messages.map(({ phone, message }) => ({ to: phone, message }))
        },
        'bulk SMS'
    );
};

const getSmsGatewayBalance = async () => {
    const config = getSmsConfiguration();
    const endpoint = process.env.SMS_BALANCE_URL;
    if (!endpoint) {
        throw new ApiError(503, 'SMS gateway balance endpoint is not configured on the server.');
    }

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: config.apiKey }),
            signal: AbortSignal.timeout(15000)
        });
    } catch (error) {
        throw new ApiError(502, 'Could not connect to the SMS gateway balance service.');
    }

    const responseText = await response.text();
    if (!response.ok) {
        throw new ApiError(502, 'The SMS gateway balance request failed.');
    }

    let balanceValue = responseText.trim();
    try {
        const parsed = JSON.parse(responseText);
        balanceValue = parsed.balance ?? parsed.data?.balance ?? parsed;
    } catch (error) {
        balanceValue = responseText.trim();
    }
    const balance = Number(balanceValue);
    if (!Number.isFinite(balance)) {
        throw new ApiError(502, 'The SMS gateway returned an unreadable balance.');
    }
    return balance;
};

module.exports = {
    normalizeBangladeshPhone,
    sendSinglePayrollSms,
    sendBulkPayrollSms,
    getSmsGatewayBalance
};
