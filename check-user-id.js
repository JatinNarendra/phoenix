// Quick user ID check
console.log("=== USER ID CHECK ===");

if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
  const user = window.Telegram.WebApp.initDataUnsafe.user;
  console.log("Your User ID:", user.id);
  console.log("Username:", user.username);
  console.log("First Name:", user.first_name);

  // Check if this user should be re-initialized
  const reinitUserIds = ["6042897820", "123456789"];
  const shouldReinit = reinitUserIds.includes(user.id.toString());

  console.log("Should be re-initialized:", shouldReinit);

  if (!shouldReinit) {
    console.log("❌ Your user ID is not in the re-initialization list!");
    console.log("Add your user ID to the shouldReinitializeOnMissing function");
  } else {
    console.log("✅ Your user ID is supported for re-initialization");
  }
} else {
  console.log("❌ No Telegram user data found");
}

console.log("=== END CHECK ===");
