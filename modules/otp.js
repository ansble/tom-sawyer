const prompt = require('prompt');
const askForOTPString = 'Are you using 2FA on npm for writes?';

const askForOTP = () => {
  prompt.start();
};

module.exports = {
  askForOTPString
};
