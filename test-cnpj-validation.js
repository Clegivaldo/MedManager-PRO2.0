// Test CNPJ validation and formatting
function isValidCNPJ(cnpj) {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Calculate first check digit
  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i]) * multiplier;
    multiplier--;
    if (multiplier === 1) multiplier = 9;
  }
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleaned[8]) !== firstDigit) return false;
  
  // Calculate second check digit
  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * multiplier;
    multiplier--;
    if (multiplier === 1) multiplier = 9;
  }
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleaned[9]) !== secondDigit) return false;
  
  return true;
}

function formatCNPJ(cnpj) {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cleaned;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

const testCNPJs = [
  '12345678000155',
  '12345678000199',
  '12345678000195',
  '11222333000181', // Valid test CNPJ
];

console.log('CNPJ Validation Test\n');
testCNPJs.forEach(cnpj => {
  console.log(`CNPJ: ${cnpj}`);
  console.log(`  Valid: ${isValidCNPJ(cnpj)}`);
  console.log(`  Formatted: ${formatCNPJ(cnpj)}\n`);
});

// Check Asaas sandbox test CNPJ
const asaasSandboxCNPJ = '35028316000152'; // Asaas sandbox valid CNPJ
console.log(`Asaas Sandbox CNPJ: ${asaasSandboxCNPJ}`);
console.log(`  Valid: ${isValidCNPJ(asaasSandboxCNPJ)}`);
console.log(`  Formatted: ${formatCNPJ(asaasSandboxCNPJ)}`);
