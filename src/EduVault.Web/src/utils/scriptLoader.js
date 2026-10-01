/**
 * Dynamically loads an external script (e.g., Razorpay, Stripe checkout).
 * Centralized to avoid 3+ duplicate copies across Dashboard, StudentPages, Landing.
 * @param {string} src - The URL of the script to load.
 * @returns {Promise<boolean>} - Resolves true if script loaded, false on error.
 */
export const loadScript = (src) => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
