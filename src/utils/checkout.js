// src/utils/checkout.js

const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

export const priceIds = {
  proMonthly: env === "production" 
    ? import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY 
    : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_MONTHLY,
  proYearly: env === "production" 
    ? import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY
    : import.meta.env.VITE_SANDBOX_PADDLE_PRICE_PRO_YEARLY
};

// Initialize Paddle (call this once in your app)
export const initializePaddle = () => {
  return new Promise((resolve, reject) => {
    if (window.Paddle?.initialized) {
      resolve(true);
      return;
    }

    const loadPaddleScript = () => {
      if (document.querySelector('script[src*="paddle"]')) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        try {
          const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";
          const token = environment === "production"
            ? import.meta.env.VITE_PADDLE_TOKEN
            : import.meta.env.VITE_SANDBOX_PADDLE_TOKEN;
          
          window.Paddle.Environment.set(environment);
          window.Paddle.Initialize({ token: token });
          window.Paddle.initialized = true;
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => reject(new Error('Failed to load Paddle'));
      document.head.appendChild(script);
    };

    if (window.Paddle) {
      try {
        const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";
        const token = environment === "production"
          ? import.meta.env.VITE_PADDLE_TOKEN
          : import.meta.env.VITE_SANDBOX_PADDLE_TOKEN;
        
        window.Paddle.Environment.set(environment);
        window.Paddle.Initialize({ token: token });
        window.Paddle.initialized = true;
        resolve(true);
      } catch (error) {
        reject(error);
      }
    } else {
      loadPaddleScript();
    }
  });
};

// Open checkout (use this everywhere)
export const openCheckout = async (priceId, planName, authUser, signIn) => {
  try {
    // Ensure Paddle is loaded
    await initializePaddle();

    // If not logged in, save checkout intent and trigger sign in
    if (!authUser) {
      const currentUrl = window.location.href;
      const checkoutUrl = `${currentUrl}?startCheckout=true&plan=${planName}&priceId=${priceId}`;
      localStorage.setItem("postLoginCheckout", checkoutUrl);
      await signIn();
      return;
    }

    // Open Paddle checkout
    window.Paddle.Checkout.open({
      items: [{ quantity: 1, priceId }],
      customer: { email: authUser.email },
      customData: { 
        plan: planName, 
        userId: authUser.uid, 
        userEmail: authUser.email 
      },
      settings: {
        successUrl: `${window.location.origin}/welcome-pro`,
      },
      closeCallback: () => {
        console.log("Checkout closed");
      },
      errorCallback: (error) => {
        console.error("Checkout error:", error);
      },
    });
  } catch (error) {
    console.error('Failed to open checkout:', error);
    // Show user-friendly error
    alert('Failed to load payment system. Please refresh and try again.');
  }
};

// Checkout URLs (for direct links if needed)
export const getCheckoutUrl = (plan = 'annual') => {
  const priceId = plan === 'annual' ? priceIds.proYearly : priceIds.proMonthly;
  return `?startCheckout=true&plan=pro&priceId=${priceId}`;
};