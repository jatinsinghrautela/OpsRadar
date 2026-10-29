const { authenticator } = require('otplib');
const QRCode = require('qrcode');

authenticator.options = { window: 1 };

function generateTotpSecret() {
  return authenticator.generateSecret();
}

function buildOtpauthUrl(username, secret, issuer = 'OpsRadar') {
  return authenticator.keyuri(username, issuer, secret);
}

async function buildQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl);
}

function verifyTotp(token, secret) {
  if (!token || !secret) return false;
  return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret });
}

module.exports = {
  generateTotpSecret,
  buildOtpauthUrl,
  buildQrDataUrl,
  verifyTotp
};
