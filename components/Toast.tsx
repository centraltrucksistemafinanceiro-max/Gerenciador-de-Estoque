
import React, { useEffect } from 'react';
import type { ToastMessage } from '../types';
import { CheckCircleIcon, XCircleIcon, ExclamationIcon } from './icons/Icon';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [toast, onClose]);

  const typeDetails = {
    success: {
      bg: 'bg-green-500/90',
      icon: <CheckCircleIcon className="w-6 h-6 text-white"/>,
    },
    error: {
      bg: 'bg-red-500/90',
      icon: <XCircleIcon className="w-6 h-6 text-white"/>,
    },
    warning: {
      bg: 'bg-yellow-500/90',
      icon: <ExclamationIcon className="w-6 h-6 text-white"/>,
    },
  };

  const details = typeDetails[toast.type];

  return (
    <div className={`max-w-sm w-full shadow-lg rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden backdrop-blur-sm ${details.bg}`}>
      <div className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {details.icon}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-white">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onClose(toast.id)}
              className="inline-flex text-white rounded-md hover:text-gray-200 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
      <div className="max-w-sm w-full flex flex-col items-end space-y-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};