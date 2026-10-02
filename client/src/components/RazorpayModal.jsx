import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, ShieldCheck, CheckCircle2, XCircle, CreditCard, Smartphone, Building2 } from 'lucide-react';

export default function RazorpayModal({
  isOpen,
  orderData,
  booking,
  onSuccess,
  onCancel,
  verifying
}) {
  const [selectedMethod, setSelectedMethod] = useState('upi');

  if (!isOpen || !orderData) return null;

  const amountInRupees = (orderData.amount ? orderData.amount / 100 : booking?.serviceId?.price || 500);

  const handleSimulateSuccess = () => {
    const mockPaymentId = `pay_sim_${Date.now()}`;
    onSuccess({
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: 'simulated_valid_signature'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center font-bold text-white text-sm tracking-wider shadow">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">Razorpay</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-zinc-900">
                  Test Mode
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 font-mono">Order: {orderData.orderId}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-blue-200/70 block">Total Amount</span>
            <span className="text-lg font-bold text-white font-mono">₹{amountInRupees}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-zinc-50 rounded-lg p-3.5 border border-border space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Service:</span>
              <span className="font-medium text-zinc-900">{booking?.serviceId?.name || 'Local Marketplace Service'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Provider:</span>
              <span className="font-medium text-zinc-900">{booking?.vendorId?.name || 'Verified Vendor'}</span>
            </div>
          </div>

          {/* Test Payment Methods */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Select Test Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  selectedMethod === 'upi'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-border bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1 text-blue-600" />
                UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  selectedMethod === 'card'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-border bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-blue-600" />
                Card
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  selectedMethod === 'netbanking'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-border bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1 text-blue-600" />
                Netbanking
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Sandbox environment. Server verifies HMAC-SHA256 signature and confirms booking.</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              disabled={verifying}
              onClick={handleSimulateSuccess}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Payment Signature...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Simulate Success (Pay ₹{amountInRupees})
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={verifying}
              onClick={onCancel}
              className="w-full text-zinc-600 hover:text-zinc-900 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Abandon Checkout / Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
