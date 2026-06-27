import toast, { Toaster } from 'react-hot-toast';

// Re-export showToast to use react-hot-toast
export const showToast = (message, type = 'success') => {
  const options = {
    duration: 4000,
    style: {
      background: '#0f172a',
      color: '#ffffff',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      fontSize: '14px',
    },
  };

  if (type === 'success') {
    toast.success(message, options);
  } else if (type === 'error') {
    toast.error(message, options);
  } else if (type === 'warning') {
    toast(message, { ...options, icon: '⚠️' });
  } else {
    toast(message, options);
  }
};

export const ToastContainer = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'dark-toast-theme',
      }}
    />
  );
};
