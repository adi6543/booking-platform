const Razorpay = require('razorpay');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.warn('⚠️ Razorpay credentials missing from environment variables');
    }

    razorpayInstance = new Razorpay({
      key_id: key_id || 'dummy_key',
      key_secret: key_secret || 'dummy_secret'
    });
  }
  return razorpayInstance;
};

module.exports = { getRazorpayInstance };
