self.addEventListener("install", (event) => {
  console.log("Service Worker installed");
});

// PWA Install পপআপ আসার জন্য এই fetch ইভেন্টটি থাকা বাধ্যতামূলক
self.addEventListener("fetch", (event) => {
  // আপাতত কোনো ক্যাশিং লজিক না লিখলেও চলবে, 
  // শুধু ইভেন্ট লিসেনারটি থাকলেই ব্রাউজার পপআপ দেখাবে।
});
