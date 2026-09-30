import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  // state = { message, resolve }

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleClose = (result) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => handleClose(false)}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl p-6 space-y-4 animate-fade-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 id="confirm-title" className="font-semibold text-white text-sm mb-1">Confirm Action</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{state.message}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                className="text-zinc-400 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleClose(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white border-0"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
