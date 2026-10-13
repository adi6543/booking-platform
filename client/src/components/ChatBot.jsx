import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  sendChatMessage,
  bookSlot,
  createPaymentOrder,
  verifyPayment,
  cancelPaymentOrder
} from '../lib/api';
import RazorpayModal from './RazorpayModal';
import { Button } from './ui/button';
import {
  MessageCircle, X, Send, Sparkles, RotateCcw,
  Bot, User as UserIcon, ArrowRight, ChevronDown,
  Calendar, Clock, Loader2, CheckCircle2
} from 'lucide-react';

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    sender: 'assistant',
    text: "Hi there! 👋 I'm your **BookEase Assistant**.\n\nI can help you find verified neighbourhood services (plumbing, salons, cleaning, tutors, electricians), check availability, or answer questions about payments and bookings.\n\nHow can I help you today?",
    suggestions: [
      'Find a plumber 🔧',
      'Need an electrician ⚡',
      'Home cleaning 🧹',
      'How does booking work? 📅',
      'Payment & hold policy 💳'
    ]
  }
];

export default function ChatBot() {
  const { user, token } = useAuth();
  const toastCtx = useToast();
  const toastSuccess = toastCtx?.success || toastCtx?.toastSuccess || (() => {});
  const toastError   = toastCtx?.error   || toastCtx?.toastError   || (() => {});

  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [hasUnread, setHasUnread]     = useState(true);

  // Direct In-Chat Booking State
  const [bookingSlotId, setBookingSlotId]           = useState(null);
  const [activeCheckout, setActiveCheckout]         = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDirectBook = async (slot) => {
    if (!token) {
      toastError('Please log in as a customer to book a slot.');
      const promptLoginMsg = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `To book the **${slot.serviceName}** slot, please log in with your customer account first.`,
        actions: [{ label: 'Log In to Book →', url: '/login' }],
        suggestions: ['Log In', 'Browse services 🔍']
      };
      setMessages(prev => [...prev, promptLoginMsg]);
      return;
    }

    if (user?.role === 'vendor') {
      toastError('Vendors cannot book slots. Please use a customer account.');
      const vendorWarnMsg = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `You are currently logged in as a **Vendor**. Slot bookings are reserved for customers. Please log in with a customer account to continue!`,
        suggestions: ['Go to Vendor Dashboard 🏪', 'Log Out']
      };
      setMessages(prev => [...prev, vendorWarnMsg]);
      return;
    }

    const slotId = slot.id || slot._id;
    setBookingSlotId(slotId);
    try {
      // 1. Reserve the slot via API
      const pendingBooking = await bookSlot(token, slotId);

      // 2. Create the payment order
      const orderData = await createPaymentOrder(token, pendingBooking._id);

      // 3. Open the payment modal directly in-place
      setActiveCheckout({
        slot,
        booking: pendingBooking,
        orderData
      });
    } catch (err) {
      toastError(err.message || 'Failed to start booking');
      const errorMsg = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `Sorry, I couldn't reserve that slot (${err.message}). It may have expired or already been booked by someone else!`,
        suggestions: ['Slots for AC service 🔨', 'Browse available slots 🔍']
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setBookingSlotId(null);
    }
  };

  const handlePaymentSuccess = async (response) => {
    if (!activeCheckout) return;
    setIsVerifyingPayment(true);
    try {
      const verifyResult = await verifyPayment(token, {
        bookingId: activeCheckout.booking._id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });

      if (verifyResult.success && verifyResult.booking?.paymentStatus === 'paid') {
        toastSuccess(`🎉 Booking confirmed for ${activeCheckout.slot.serviceName}!`);

        // Post confirmed card directly into the chat
        const confirmedMsg = {
          id: Date.now().toString(),
          sender: 'assistant',
          text: `🎉 **Booking Confirmed & Paid Directly via Chat!**\n\n• **Service**: ${activeCheckout.slot.serviceName}\n• **Vendor**: ${activeCheckout.slot.vendorName}\n• **Scheduled Date**: ${activeCheckout.slot.date}\n• **Time Slot**: ${activeCheckout.slot.time}\n• **Amount Paid**: ₹${activeCheckout.slot.price || (activeCheckout.orderData.amount / 100)}\n• **Booking Reference**: \`#${String(activeCheckout.booking._id).slice(-8).toUpperCase()}\`\n\nYour appointment is confirmed. You can view receipt details or cancel anytime in **My Bookings**!`,
          actions: [
            { label: 'View in My Bookings →', url: '/my-bookings' },
            { label: 'Browse More Services', url: '/browse' }
          ],
          suggestions: [
            'How to cancel if needed? ❌',
            'Find another service 🔍'
          ]
        };

        setMessages(prev => [...prev, confirmedMsg]);
        setActiveCheckout(null);
      } else {
        toastError('Payment verification was not confirmed by the server.');
      }
    } catch (err) {
      toastError(`Payment verification failed: ${err.message}`);
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handlePaymentCancel = async () => {
    if (!activeCheckout) return;
    try {
      await cancelPaymentOrder(token, activeCheckout.booking._id);
    } catch (_) {}
    toastError('Payment cancelled. Slot hold released.');

    const cancelledMsg = {
      id: Date.now().toString(),
      sender: 'assistant',
      text: `Payment for **${activeCheckout.slot.serviceName}** was cancelled. The 10-minute hold has been released. Let me know if you would like to select another time!`,
      suggestions: [
        'Slots for AC service 🔨',
        'Find a plumber 🔧'
      ]
    };
    setMessages(prev => [...prev, cancelledMsg]);
    setActiveCheckout(null);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await sendChatMessage(text, history);

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.reply || "I'm here to help! Could you specify what service you're looking for?",
        slots: res.slots || [],
        actions: res.actions || [],
        suggestions: res.suggestions || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "I couldn't reach the server just now, but you can explore all available slots and categories on our Browse page!",
        actions: [{ label: 'Browse Services →', url: '/browse' }],
        suggestions: ['Find a plumber 🔧', 'How does booking work? 📅']
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInputValue('');
  };

  // Helper to format basic markdown-style text (bold and bullets)
  const formatText = (txt) => {
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      // Bold replacer
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} className="italic text-zinc-800">{part.slice(1, -1)}</em>;
        }
        return part;
      });

      return (
        <span key={idx} className="block leading-relaxed">
          {renderedLine}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="chatbot-trigger"
          className="group relative flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label="Open chat assistant"
          title="Ask AI Assistant"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-600 animate-pulse" />
            )}
          </div>
          {/* Subtle desktop hover tooltip */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 bg-zinc-900/90 text-white text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-md hidden sm:block">
            Ask BookEase AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          id="chatbot-window"
          className="w-[calc(100vw-2.5rem)] sm:w-[380px] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-zinc-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white leading-tight">BookEase Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                </div>
                <p className="text-[11px] text-blue-100/90 font-medium">Instant Booking &amp; Support</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                title="Restart conversation"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-zinc-50/60 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white border border-border text-zinc-800 rounded-bl-xs'
                  }`}
                >
                  {formatText(m.text)}

                  {/* Render live slot cards if available */}
                  {m.slots && m.slots.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Live Available Slots</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.slots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 hover:border-blue-300 transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-zinc-900 text-xs truncate">
                                  {slot.serviceName}
                                </span>
                                {slot.price && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                    ₹{slot.price}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-600 mt-0.5">
                                <span className="font-medium text-zinc-800">{slot.date}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 text-zinc-500">
                                  <Clock className="w-2.5 h-2.5" />
                                  {slot.time}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {slot.vendorName}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={bookingSlotId === slot.id}
                              onClick={() => handleDirectBook(slot)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold shrink-0 shadow-2xs hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {bookingSlotId === slot.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Reserving...</span>
                                </>
                              ) : (
                                <>
                                  <span>Book Now</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions inside bot bubble */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap gap-1.5">
                      {m.actions.map((act, aIdx) => (
                        <Link
                          key={aIdx}
                          to={act.url}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors border border-blue-200/60"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggestions / Prompt chips */}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                    {m.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSend(sug.replace(/[^\w\s&?]/g, '').trim())}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors font-medium shadow-2xs text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 bg-white border border-border px-3 py-2 rounded-2xl w-fit shadow-2xs text-zinc-400">
                <Bot className="w-3.5 h-3.5 text-blue-600 mr-1" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 bg-white border-t border-border">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-border rounded-xl px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a service, booking, or pricing…"
                className="flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 outline-none"
              />
              <Button
                size="sm"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                className="h-7 w-7 p-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-center text-zinc-400 mt-1.5">
              Powered by BookEase AI Assistant
            </p>
          </div>
        </div>
      )}

      {/* Razorpay Modal for Direct In-Chat Checkout */}
      {activeCheckout && (
        <RazorpayModal
          isOpen={!!activeCheckout}
          orderData={activeCheckout.orderData}
          booking={activeCheckout.booking}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          verifying={isVerifyingPayment}
        />
      )}
    </div>
  );
}
