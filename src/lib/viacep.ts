// src/lib/viacep.ts

export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

export async function searchCEP(cep: string): Promise<{
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}> {
    const cleanCEP = cep.replace(/\D/g, '');

    if (cleanCEP.length !== 8) {
        throw new Error('CEP deve ter 8 dígitos');
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);

    if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
    }

    const data: ViaCEPResponse = await response.json();

    if (data.erro) {
        throw new Error('CEP não encontrado');
    }

    return {
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
    };
}
