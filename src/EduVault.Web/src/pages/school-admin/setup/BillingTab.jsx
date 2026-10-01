import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { loadScript } from '../../../utils/scriptLoader';
import { useToast } from '../../../contexts/ToastContext';

export default function BillingTab() {
  const { toast } = useToast();
  const [subInfo, setSubInfo] = useState(null);
  const [platformPlans, setPlatformPlans] = useState([]);
  const [payingSub, setPayingSub] = useState(false);
  const [showUpgradeRequirementsModal, setShowUpgradeRequirementsModal] = useState(false);
  const [upgradeRequirementsPlanType, setUpgradeRequirementsPlanType] = useState('Enterprise');
  const [upgradeRequirementsText, setUpgradeRequirementsText] = useState('');

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await apiClient.get('/academics/stats');
      setSubInfo({
        status: res.data.subscriptionStatus,
        amount: res.data.subscriptionAmount,
        planType: res.data.subscriptionPlanType,
        id: res.data.subscriptionId,
        startDate: res.data.subscriptionStartDate,
        endDate: res.data.subscriptionEndDate,
        pendingUpgradeRequest: res.data.pendingUpgradeRequest
      });
      const plansRes = await apiClient.get('/billing/plans');
      setPlatformPlans(plansRes.data || []);
    } catch (err) {
      console.error('Error fetching subscription details:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const getRemainingDays = (endDateStr) => {
    if (!endDateStr) return 999;
    try {
      const endDate = new Date(endDateStr);
      const today = new Date();
      const diffTime = endDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 999;
    }
  };

  const handleRequestUpgrade = (planType) => {
    setUpgradeRequirementsPlanType(planType);
    setUpgradeRequirementsText('');
    setShowUpgradeRequirementsModal(true);
  };

  const handleSubUpgradeRequirements = async (e) => {
    e.preventDefault();
    if (!upgradeRequirementsText.trim()) {
      toast.warning('Please specify your project requirements.');
      return;
    }
    setPayingSub(true);
    try {
      await apiClient.post('/billing/upgrade-request', {
        requestedPlanType: upgradeRequirementsPlanType,
        requirements: upgradeRequirementsText
      });
      toast.success('Requirements submitted successfully! The Super Admin has been notified.');
      setShowUpgradeRequirementsModal(false);
      fetchSubscriptionInfo();
    } catch (err) {
      console.error('Error submitting upgrade requirements:', err);
      toast.error(err.response?.data?.error || 'Failed to submit requirements. Please try again.');
    } finally {
      setPayingSub(false);
    }
  };

  const handlePaySetupSubscription = async (isRenewal = false) => {
    setPayingSub(true);
    try {
      const orderRes = await apiClient.post(`/billing/create-subscription-order?isRenewal=${isRenewal}`);
      const { 
        orderId, 
        amount, 
        currency, 
        keyId, 
        isMock, 
        paymentProvider, 
        instructions 
      } = orderRes.data;

      const provider = paymentProvider ? paymentProvider.toLowerCase() : 'razorpay';
      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      if (provider === 'razorpay') {
        const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!scriptLoaded) {
          toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
          setPayingSub(false);
          return;
        }

        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: isRenewal ? "EduVault Subscription Renewal" : "EduVault Subscription",
          description: `${subInfo?.planType || 'Standard'} Plan Platform Fees`,
          order_id: isMock ? undefined : orderId,
          handler: async function (response) {
            setPayingSub(true);
            try {
              await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
                razorpayOrderId: response.razorpay_order_id || orderId,
                razorpayPaymentId: response.razorpay_payment_id || '',
                razorpaySignature: response.razorpay_signature || 'mock_signature',
                paymentProvider: 'razorpay'
              });
              toast.success(isRenewal ? 'Platform subscription renewal successful!' : 'Platform subscription payment successful! All features unlocked.');
              fetchSubscriptionInfo();
            } catch (err) {
              toast.error('Payment verification failed: ' + (err.response?.data?.error || err.message));
            } finally {
              setPayingSub(false);
            }
          },
          prefill: {
            name: userProfile.firstName || 'School Admin',
            email: userProfile.email || '',
          },
          theme: { color: "#1a2744" }
        };

        if (isMock) {
          if (window.confirm("Razorpay credentials not configured. Proceed with simulated subscription payment?")) {
            await options.handler({
              razorpay_order_id: orderId,
              razorpay_payment_id: `sub_pay_mock_${Math.random().toString(36).substring(7)}`,
              razorpay_signature: 'mock_signature'
            });
          } else {
            setPayingSub(false);
          }
        } else {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            toast.error("Payment failed: " + response.error.description);
          });
          rzp.open();
        }
      } else if (provider === 'cashless') {
        const confirmMsg = `🏦 Platform Cashless / Bank Transfer Instructions:\n\n${instructions || 'Please transfer the platform fees to the admin account.'}\n\nAmount: Rs. ${amount}\n\nHave you completed the bank transfer? Click OK to submit subscription verification.`;
        if (window.confirm(confirmMsg)) {
          setPayingSub(true);
          try {
            const txRef = `cashless_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
              razorpayOrderId: orderId,
              paymentProvider: 'cashless',
              transactionReference: txRef
            });
            toast.success(isRenewal ? 'Platform subscription renewal submitted!' : 'Platform subscription payment submitted! The admin will verify it shortly.');
            fetchSubscriptionInfo();
          } catch (err) {
            toast.error('Failed to submit cashless transaction: ' + (err.response?.data?.error || err.message));
          } finally {
            setPayingSub(false);
          }
        } else {
          setPayingSub(false);
        }
      } else {
        const providerName = provider === 'stripe' ? 'Stripe' : provider === 'paypal' ? 'PayPal' : provider === 'phonepe' ? 'PhonePe' : provider;
        const confirmMsg = `💳 Active Platform Gateway: ${providerName}\n\nAmount: Rs. ${amount}\n\nWould you like to proceed with the simulated checkout?`;
        
        if (window.confirm(confirmMsg)) {
          setPayingSub(true);
          try {
            const txRef = `${provider}_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
              razorpayOrderId: orderId,
              paymentProvider: provider,
              transactionReference: txRef
            });
            toast.success(isRenewal ? 'Platform subscription renewal successful!' : 'Platform subscription payment successful! All features unlocked.');
            fetchSubscriptionInfo();
          } catch (err) {
            toast.error('Payment verification failed: ' + (err.response?.data?.error || err.message));
          } finally {
            setPayingSub(false);
          }
        } else {
          setPayingSub(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setPayingSub(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Overview */}
      <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-display font-bold text-primary text-lg">Platform Service Subscription</h3>
          <p className="text-gray-400 text-xs mt-1">Configure and manage your school's EduVault subscription tier.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {subInfo?.status === 'success' ? (
                <span className="badge badge-success text-xxs">Active / Paid</span>
              ) : (
                <span className="badge badge-warning text-xxs animate-pulse">Pending Payment</span>
              )}
            </div>
          </div>
          {subInfo?.status === 'success' && (
            <div className="border-l border-gray-100 pl-3">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Validity Period</div>
              <div className="text-xs font-semibold text-primary mt-0.5">
                {subInfo.startDate && subInfo.endDate
                  ? `from ${subInfo.startDate} to ${subInfo.endDate}`
                  : '1 Year Recurring'}
              </div>
            </div>
          )}
        </div>
      </div>

      {subInfo?.pendingUpgradeRequest && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-5 text-xs font-semibold flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="animate-pulse">🔔</span>
            <span className="font-bold text-amber-900">
              Pending {subInfo.pendingUpgradeRequest.requestedPlanType === 'Custom' ? 'Custom Modification' : 'Plan Upgrade'} Request
            </span>
          </div>
          <div className="text-gray-700 bg-white/70 p-3.5 rounded-xl border border-amber-100/50 font-normal">
            <span className="font-bold text-gray-700 block mb-1 text-3xs uppercase tracking-wider text-gray-400">Your Submitted Requirements:</span>
            <p className="text-xs whitespace-pre-wrap leading-relaxed">{subInfo.pendingUpgradeRequest.requirements || 'No specific requirements listed.'}</p>
          </div>
          <div className="text-amber-700 text-[10px] uppercase font-extrabold tracking-wider mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            Status: Waiting for Super Admin Review and Price Customization
          </div>
        </div>
      )}

      {/* Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platformPlans.map(p => {
          const isCurrent = subInfo && (p.planName.toLowerCase().includes(subInfo.planType?.toLowerCase() || '') || (subInfo.planType || '').toLowerCase().includes(p.planName.toLowerCase()));
          return (
            <div
              key={p.id}
              className={`card relative transition-all duration-300 flex flex-col justify-between min-h-[350px] border-2 ${isCurrent
                  ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 bg-primary/[0.01]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
            >
              {p.isTopRevenue && (
                <div className="absolute -top-3 right-4 bg-accent text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  TOP REVENUE
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{p.tierLabel}</div>

                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                  <div className="font-display font-bold text-primary text-xl">{p.planName}</div>
                  {isCurrent && (
                    <span className="bg-primary/10 text-primary border border-primary/25 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Current Tier
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                    <span className="text-gray-400">Implementation Cost</span>
                    <span className="font-bold text-primary">₹{p.implementationCost?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                    <span className="text-gray-400">Student Capacity</span>
                    <span className="font-bold text-primary">{p.studentCapacity}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                    <span className="text-gray-400">Storage Limit</span>
                    <span className="font-bold text-primary">{p.storageLimit}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                    <span className="text-gray-400">Support Level</span>
                    <span className="font-bold text-primary">{p.planName.toLowerCase().includes('enterprise') ? '24/7 Priority Support' : 'Standard Support'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-50 pt-4 mt-auto">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Plan Cost</span>
                    <span className="text-2xl font-black text-primary">
                      {p.monthlyPrice?.startsWith('₹') || p.monthlyPrice?.toLowerCase().includes('per') || p.monthlyPrice?.toLowerCase().includes('custom')
                        ? p.monthlyPrice
                        : p.monthlyPrice?.includes('$') ? p.monthlyPrice.replace('$', '₹') : `₹${p.monthlyPrice}`}
                    </span>
                  </div>
                </div>

                {isCurrent ? (
                  subInfo?.status === 'success' ? (
                    <div className="space-y-2 w-full animate-in fade-in duration-200">
                      <div className="w-full bg-green-50 border border-green-100 text-green-700 text-center rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                        <span>✅ Plan Active & Fully Paid</span>
                      </div>
                      {getRemainingDays(subInfo.endDate) <= 30 && (
                        <button
                          type="button"
                          onClick={() => handlePaySetupSubscription(true)}
                          disabled={payingSub}
                          className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          {payingSub ? 'Processing...' : '🔄 Renew Subscription'}
                        </button>
                      )}
                      {p.planName.toLowerCase().includes('enterprise') && (
                        <button
                          type="button"
                          onClick={() => handleRequestUpgrade('Custom')}
                          disabled={payingSub || (subInfo.pendingUpgradeRequest && subInfo.pendingUpgradeRequest.requestedPlanType === 'Custom')}
                          className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          📝 Request Custom Modification
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePaySetupSubscription(false)}
                      disabled={payingSub}
                      className="w-full btn-primary justify-center font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-2"
                    >
                      {payingSub ? 'Processing...' : `💳 Accept & Pay ₹${subInfo?.amount}`}
                    </button>
                  )
                ) : (() => {
                  const isPendingThisPlan = subInfo?.pendingUpgradeRequest &&
                    (subInfo.pendingUpgradeRequest.requestedPlanType?.toLowerCase().includes(p.planName.toLowerCase()) ||
                      p.planName.toLowerCase().includes(subInfo.pendingUpgradeRequest.requestedPlanType?.toLowerCase()));

                  if (isPendingThisPlan) {
                    return (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-amber-50 border border-amber-200 text-amber-600 text-center rounded-xl py-3 text-xs font-bold cursor-not-allowed animate-pulse"
                      >
                        Upgrade Request Pending Approval
                      </button>
                    );
                  } else {
                    return (
                      <button
                        type="button"
                        onClick={() => handleRequestUpgrade(p.planName.toLowerCase().includes('enterprise') ? 'Enterprise' : p.planName)}
                        disabled={payingSub || !!subInfo?.pendingUpgradeRequest}
                        className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm"
                      >
                        {p.planName.toLowerCase().includes('enterprise') ? 'Contact Support to Upgrade' : 'Select Standard Plan'}
                      </button>
                    );
                  }
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Requirements Modal */}
      {showUpgradeRequirementsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSubUpgradeRequirements} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 text-white">
              <h3 className="font-display font-bold text-base">
                {upgradeRequirementsPlanType === 'Custom' ? '📝 Submit Modification Requirements' : '🚀 Request Enterprise Upgrade'}
              </h3>
              <p className="text-blue-200 text-xxs mt-1">
                {upgradeRequirementsPlanType === 'Custom'
                  ? 'Specify new requirements/features to change in your custom plan.'
                  : 'Specify requirements to customize and scale your platform to Enterprise Plan.'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Describe all your custom features, integration requirements, or modifications *
                </label>
                <textarea
                  required
                  rows={6}
                  value={upgradeRequirementsText}
                  onChange={e => setUpgradeRequirementsText(e.target.value)}
                  placeholder="e.g., We need integrations with our legacy biometric attendance devices, 2TB storage space, and customized student report card templates..."
                  className="input text-xs py-2 px-3 focus:ring-primary/20 w-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xxs text-blue-700 leading-normal flex items-start gap-2">
                <span>💡</span>
                <span>
                  After submission, the Super Admin will review your requirements. Once approved, customized pricing will be available to pay and activate.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUpgradeRequirementsModal(false)}
                  disabled={payingSub}
                  className="btn-outline text-xs py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingSub || !upgradeRequirementsText.trim()}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {payingSub ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
