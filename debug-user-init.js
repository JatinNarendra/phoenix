// Debug script to test user initialization
console.log("=== USER INITIALIZATION DEBUG ===");

// Check WebApp availability
console.log("1. WebApp Check:");
console.log("  - window.Telegram:", !!window.Telegram);
console.log("  - window.Telegram.WebApp:", !!window.Telegram?.WebApp);
console.log(
  "  - WebApp.isTelegramApp:",
  window.Telegram?.WebApp?.isTelegramApp
);
console.log("  - WebApp.initData:", !!window.Telegram?.WebApp?.initData);
console.log(
  "  - WebApp.initDataUnsafe:",
  !!window.Telegram?.WebApp?.initDataUnsafe
);
console.log(
  "  - WebApp.initDataUnsafe.user:",
  !!window.Telegram?.WebApp?.initDataUnsafe?.user
);

if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
  const user = window.Telegram.WebApp.initDataUnsafe.user;
  console.log("2. User Data:");
  console.log("  - ID:", user.id);
  console.log("  - Username:", user.username);
  console.log("  - First Name:", user.first_name);
  console.log("  - Last Name:", user.last_name);
  console.log("  - Language:", user.language_code);
}

// Test API call directly
async function testAPICall() {
  console.log("3. Testing API Call:");

  if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
    console.log("  ❌ No user data available");
    return;
  }

  const user = window.Telegram.WebApp.initDataUnsafe.user;
  const testData = {
    action: "initialize",
    userData: {
      id: user.id,
      is_bot: false,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      language_code: user.language_code,
      photo_url: user.photo_url,
    },
    initData: window.Telegram.WebApp.initData,
  };

  console.log("  - Sending data:", testData);

  try {
    const response = await fetch("/api/telegram/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log("  - Response status:", response.status);
    console.log("  - Response data:", result);

    if (result.success) {
      console.log("  ✅ API call successful!");
    } else {
      console.log("  ❌ API call failed:", result.error);
    }
  } catch (error) {
    console.log("  ❌ API call error:", error);
  }
}

// Run the test
testAPICall();

console.log("=== END DEBUG ===");
