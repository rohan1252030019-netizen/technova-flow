async function testLiveLogin() {
  console.log("Testing POST https://technova-flow.vercel.app/api/auth/login...");
  try {
    const res = await fetch("https://technova-flow.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@technova.com", password: "Password@123" }),
    });
    console.log("Status Code:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testLiveLogin();
