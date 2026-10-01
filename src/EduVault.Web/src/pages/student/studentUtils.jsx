import { apiClient } from '../../api/apiClient';
import { loadScript } from '../../utils/scriptLoader';

export const CustomStudentTooltip = ({ active, payload, label, isPercent }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700/50 text-xs">
        <p className="font-semibold text-slate-200">{label || payload[0].payload?.subject || payload[0].name}</p>
        <p className="text-blue-400 font-bold font-mono mt-0.5">
          {payload[0].value} {isPercent ? '%' : 'Marks'}
        </p>
      </div>
    );
  }
  return null;
};

export const executePaymentFlow = async (invoiceId, setLoader, successCallback, customAmount = null) => {
  if (!invoiceId) return;
  setLoader(true);
  try {
    const orderRes = await apiClient.post('/billing/create-order', { 
      invoiceId,
      amount: customAmount ? parseFloat(customAmount) : undefined
    });
    const { orderId, amount, currency, keyId, isMock, paymentProvider, instructions } = orderRes.data;

    const provider = paymentProvider ? paymentProvider.toLowerCase() : 'razorpay';
    const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

    if (provider === 'razorpay') {
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        if (typeof window !== 'undefined' && window.appToast) {
          window.appToast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        } else {
          alert('Failed to load Razorpay SDK. Please check your internet connection.');
        }
        setLoader(false);
        return;
      }

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "EduVault Payments",
        description: "School Fee Invoice Payment",
        order_id: isMock ? undefined : orderId,
        handler: async function (response) {
          setLoader(true);
          try {
            await apiClient.post('/billing/verify-payment', {
              invoiceId: invoiceId,
              amount: customAmount ? parseFloat(customAmount) : undefined,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'mock_signature',
              paymentProvider: 'razorpay'
            });
            if (typeof window !== 'undefined' && window.appToast) {
              window.appToast.success('Payment completed and verified successfully!');
            } else {
              alert('Payment completed and verified successfully!');
            }
            successCallback();
          } catch (err) {
            const msg = 'Payment verification failed: ' + (err.response?.data?.error || err.message);
            if (typeof window !== 'undefined' && window.appToast) {
              window.appToast.error(msg);
            } else {
              alert(msg);
            }
          } finally {
            setLoader(false);
          }
        },
        prefill: {
          name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`,
          email: userProfile.email || 'student@eduvault.com',
          contact: userProfile.phone || '9999999999'
        },
        theme: {
          color: "#1a2744"
        }
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } else if (provider === 'none') {
      alert(`🏫 Offline / Cashless Instructions:\n\n${instructions || 'Please deposit fees at the school administration billing counter.'}`);
      const txRef = window.prompt("Enter Cashless / Cheque Transaction Ref Number (Optional):");
      if (txRef) {
        setLoader(true);
        try {
          await apiClient.post('/billing/verify-payment', {
            invoiceId: invoiceId,
            amount: customAmount ? parseFloat(customAmount) : undefined,
            paymentProvider: 'cashless',
            transactionReference: txRef
          });
          if (typeof window !== 'undefined' && window.appToast) {
            window.appToast.success('Cashless receipt logged! Pending admin verification.');
          } else {
            alert('Cashless receipt logged! Pending admin verification.');
          }
          successCallback();
        } catch (err) {
          alert('Failed to submit cashless transaction: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoader(false);
        }
      } else {
        setLoader(false);
      }
    } else {
      const providerName = provider === 'stripe' ? 'Stripe' : provider === 'paypal' ? 'PayPal' : provider === 'phonepe' ? 'PhonePe' : provider;
      const confirmMsg = `💳 Active Gateway: ${providerName}\n\nPayable Amount: ₹${amount}\n\nWould you like to proceed with the checkout?`;

      if (window.confirm(confirmMsg)) {
        setLoader(true);
        try {
          const txRef = `${provider}_ref_${Math.random().toString(36).substring(7)}`;
          await apiClient.post('/billing/verify-payment', {
            invoiceId: invoiceId,
            amount: customAmount ? parseFloat(customAmount) : undefined,
            paymentProvider: provider,
            transactionReference: txRef
          });
          if (typeof window !== 'undefined' && window.appToast) {
            window.appToast.success(`Payment completed and verified successfully via ${providerName}!`);
          } else {
            alert(`Payment completed and verified successfully via ${providerName}!`);
          }
          successCallback();
        } catch (err) {
          alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoader(false);
        }
      } else {
        setLoader(false);
      }
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to initialize payment.');
    setLoader(false);
  }
};
