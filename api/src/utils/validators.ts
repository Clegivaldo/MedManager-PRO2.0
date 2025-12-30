import crypto from 'crypto';

/**
 * Validadores Centralizados
 * Contém funções de validação para documentos brasileiros e outros dados
 */

/**
 * Valida CNPJ (Cadastro Nacional de Pessoa Jurídica)
 * Aplica algoritmo de dígitos verificadores
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;

  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

  // Calcula primeiro dígito verificador
  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cleanCNPJ[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  // Verifica primeiro dígito
  if (parseInt(cleanCNPJ[12]) !== digito1) return false;

  // Calcula segundo dígito verificador
  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cleanCNPJ[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  // Verifica segundo dígito
  return parseInt(cleanCNPJ[13]) === digito2;
}

/**
 * Valida CPF (Cadastro de Pessoa Física)
 * Aplica algoritmo de dígitos verificadores
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  // Calcula primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleanCPF[i]) * (10 - i);
  }
  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  // Verifica primeiro dígito
  if (parseInt(cleanCPF[9]) !== digito1) return false;

  // Calcula segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleanCPF[i]) * (11 - i);
  }
  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

  // Verifica segundo dígito
  return parseInt(cleanCPF[10]) === digito2;
}

/**
 * Valida email
 * Regex avançado + verificação básica de formato
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;

  // Verificações adicionais
  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  
  // Local part não pode começar ou terminar com ponto
  if (local.startsWith('.') || local.endsWith('.')) return false;
  
  // Domain deve ter pelo menos um ponto
  if (!domain.includes('.')) return false;

  return true;
}

/**
 * Valida telefone brasileiro
 * Formatos aceitos: (11) 98765-4321, (11) 3456-7890, 11987654321
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;

  const cleanPhone = phone.replace(/\D/g, '');

  // Telefone fixo: 10 dígitos (DDD + 8 dígitos)
  // Celular: 11 dígitos (DDD + 9 dígitos começando com 9)
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false;

  // Verifica se DDD é válido (11 a 99)
  const ddd = parseInt(cleanPhone.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  // Se for celular (11 dígitos), o terceiro dígito deve ser 9
  if (cleanPhone.length === 11 && cleanPhone[2] !== '9') return false;

  return true;
}

/**
 * Valida CEP brasileiro
 * Formato: 12345-678 ou 12345678
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false;

  const cleanCEP = cep.replace(/\D/g, '');

  // Deve ter 8 dígitos
  if (cleanCEP.length !== 8) return false;

  // Não pode ser todos zeros
  if (cleanCEP === '00000000') return false;

  return true;
}

/**
 * Valida senha forte
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 */
export function validateStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida código de barras EAN-13 (GTIN)
 * Usado para produtos
 */
export function validateEAN13(ean: string): boolean {
  if (!ean) return false;

  const cleanEAN = ean.replace(/\D/g, '');

  if (cleanEAN.length !== 13) return false;

  // Calcula dígito verificador
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleanEAN[i]);
    soma += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (soma % 10)) % 10;

  return parseInt(cleanEAN[12]) === checkDigit;
}

/**
 * Formata CNPJ
 * Input: 12345678901234
 * Output: 12.345.678/9012-34
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;

  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata CPF
 * Input: 12345678901
 * Output: 123.456.789-01
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;

  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Formata telefone
 * Input: 11987654321
 * Output: (11) 98765-4321
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');

  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return phone;
}

/**
 * Formata CEP
 * Input: 12345678
 * Output: 12345-678
 */
export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return cep;

  return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Sanitiza string para SQL (previne SQL injection)
 * Remove caracteres perigosos
 */
export function sanitizeSQL(input: string): string {
  if (!input) return '';
  
  // Remove caracteres perigosos
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * Sanitiza string para HTML (previne XSS)
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida URL
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera código aleatório seguro
 * Útil para códigos de verificação, tokens, etc
 */
export function generateSecureCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  const code = Array.from(bytes)
    .map(byte => byte % 10)
    .join('');
  
  return code.substring(0, length);
}

/**
 * Valida data no formato ISO (YYYY-MM-DD)
 */
export function validateISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!isoDateRegex.test(date)) return false;

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Valida horário no formato HH:MM
 */
export function validateTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
