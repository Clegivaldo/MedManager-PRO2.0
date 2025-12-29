console.log("Testando endpoint /orders (para verificar se o erro P2022 foi resolvido)\n");

// Primeiro, fazer login para obter um token válido
const loginPayload = {
  email: "admin@farmaciademp.com.br",
  password: "MasterAdminPassword@123"
};

console.log("1. Fazendo login para obter token válido...\n");

try {
  const loginResponse = await fetch("http://localhost:3333/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginPayload)
  });

  const loginData = await loginResponse.json();
  
  if (loginData.success && loginData.data?.token) {
    const token = loginData.data.token;
    console.log("✅ Login bem-sucedido!\n");
    console.log("2. Testando GET /api/v1/orders com token válido...\n");

    const ordersResponse = await fetch("http://localhost:3333/api/v1/orders", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`✅ Resposta recebida! Status: ${ordersResponse.status}\n`);
    
    const ordersData = await ordersResponse.json();
    
    if (ordersData.success) {
      console.log("✅ ✅ ✅ SUCESSO! Endpoint /orders está funcionando!");
      console.log(`   Total de pedidos: ${ordersData.data.length}`);
      console.log("\n   Primeira linha da resposta:");
      console.log(JSON.stringify(ordersData.data[0], null, 2));
    } else {
      console.log("❌ Erro na resposta /orders:");
      console.log(JSON.stringify(ordersData, null, 2));
    }
  } else {
    console.log("❌ Erro no login:");
    console.log(JSON.stringify(loginData, null, 2));
  }

  process.exit(0);
} catch (error) {
  console.error(`❌ ERRO:`, error.message);
  process.exit(1);
}
