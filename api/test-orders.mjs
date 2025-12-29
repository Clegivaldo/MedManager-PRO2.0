const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxOWY1NjRjOC00YmEzLTQzNTItYTllYi0zNmZmN2QyNjZlOTMiLCJlbWFpbCI6ImFkbWluQGZhcm1hY2lhZGVtby5jb20uYnIiLCJyb2xlIjoiTUFTVEVSIiwidGVuYW50SWQiOiJlOTY3NWJkZS0xMjZiLTQyOWEtYTE1MC01MzNlMDU1ZTdjYzAiLCJpYXQiOjE3MzU0MTQ2NTMsImV4cCI6MTczNTUwMTA1M30.Sf1DfIoNdxfbVvfIZCIwLQrfqPeVhzQ7DjLs1Zi8Pf4";

console.log("Testando GET /api/v1/orders...\n");

try {
  const response = await fetch("http://localhost:3333/api/v1/orders", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  console.log(`✅ Status: ${response.status} ${response.statusText}`);
  
  const data = await response.json();
  console.log(`✅ Resposta recebida!`);
  console.log(JSON.stringify(data, null, 2));
  
  process.exit(0);
} catch (error) {
  console.error(`❌ ERRO:`, error.message);
  process.exit(1);
}
