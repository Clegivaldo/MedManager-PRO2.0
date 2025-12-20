/**
 * Tax Calculation Service
 * Handles ICMS, PIS, COFINS calculations for Brazilian tax system
 * Supports Simples Nacional, Lucro Presumido, and Lucro Real regimes
 */

import { logger } from '../utils/logger.js';

// Tax Regime Types
export type TaxRegime = 'simple_national' | 'presumed_profit' | 'real_profit';

// ICMS CST/CSOSN Codes
export const ICMS_CSOSN = {
    '101': { description: 'Tributada com permissão de crédito', aliquot: 0 },
    '102': { description: 'Tributada sem permissão de crédito', aliquot: 0 },
    '103': { description: 'Isenção do ICMS para faixa de receita bruta', aliquot: 0 },
    '201': { description: 'Tributada com permissão de crédito e ST', aliquot: 0 },
    '202': { description: 'Tributada sem permissão de crédito e ST', aliquot: 0 },
    '203': { description: 'Isenção do ICMS para faixa de receita bruta e ST', aliquot: 0 },
    '300': { description: 'Imune', aliquot: 0 },
    '400': { description: 'Não tributada pelo Simples Nacional', aliquot: 0 },
    '500': { description: 'ICMS cobrado anteriormente por substituição tributária', aliquot: 0 },
    '900': { description: 'Outros', aliquot: 0 },
} as const;

// Simples Nacional Tax Rates by Revenue Range (Anexo I - Comércio)
export const SIMPLES_NACIONAL_RATES = [
    { minRevenue: 0, maxRevenue: 180000, aliquot: 4.00 },
    { minRevenue: 180000.01, maxRevenue: 360000, aliquot: 7.30 },
    { minRevenue: 360000.01, maxRevenue: 720000, aliquot: 9.50 },
    { minRevenue: 720000.01, maxRevenue: 1800000, aliquot: 10.70 },
    { minRevenue: 1800000.01, maxRevenue: 3600000, aliquot: 14.30 },
    { minRevenue: 3600000.01, maxRevenue: 4800000, aliquot: 19.00 },
];

// PIS/COFINS Rates
export const PIS_COFINS_RATES = {
    simple_national: { pis: 0, cofins: 0 }, // Included in DAS
    presumed_profit: { pis: 0.65, cofins: 3.00 }, // Cumulativo
    real_profit: { pis: 1.65, cofins: 7.60 }, // Não Cumulativo
};

// Standard ICMS Rates by State
export const ICMS_STATE_RATES: Record<string, number> = {
    'AC': 17, 'AL': 18, 'AP': 18, 'AM': 18, 'BA': 18,
    'CE': 18, 'DF': 18, 'ES': 17, 'GO': 17, 'MA': 18,
    'MT': 17, 'MS': 17, 'MG': 18, 'PA': 17, 'PB': 18,
    'PR': 18, 'PE': 18, 'PI': 18, 'RJ': 20, 'RN': 18,
    'RS': 18, 'RO': 17.5, 'RR': 17, 'SC': 17, 'SP': 18,
    'SE': 18, 'TO': 18,
};

export interface TaxCalculationInput {
    value: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRegime: TaxRegime;
    state?: string;
    ncm?: string;
    cfop?: string;
    annualRevenue?: number; // For Simples Nacional calculation
    isPharmaceutical?: boolean; // Medicamentos have special rules
}

export interface TaxCalculationResult {
    baseValue: number;
    icms: {
        base: number;
        aliquot: number;
        value: number;
        csosn?: string;
        cst?: string;
    };
    pis: {
        base: number;
        aliquot: number;
        value: number;
        cst: string;
    };
    cofins: {
        base: number;
        aliquot: number;
        value: number;
        cst: string;
    };
    totalTax: number;
    effectiveRate: number;
}

export class TaxService {

    /**
     * Calculate all applicable taxes for an item
     */
    calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
        const baseValue = input.value - (input.discount || 0);

        const icms = this.calculateICMS(input, baseValue);
        const pis = this.calculatePIS(input, baseValue);
        const cofins = this.calculateCOFINS(input, baseValue);

        const totalTax = icms.value + pis.value + cofins.value;
        const effectiveRate = baseValue > 0 ? (totalTax / baseValue) * 100 : 0;

        logger.debug('Tax calculation completed', {
            baseValue,
            icms: icms.value,
            pis: pis.value,
            cofins: cofins.value,
            totalTax,
            effectiveRate: effectiveRate.toFixed(2) + '%'
        });

        return {
            baseValue,
            icms,
            pis,
            cofins,
            totalTax,
            effectiveRate
        };
    }

    /**
     * Calculate ICMS based on tax regime
     */
    private calculateICMS(input: TaxCalculationInput, baseValue: number) {
        if (input.taxRegime === 'simple_national') {
            // Simples Nacional - ICMS is part of DAS, use CSOSN
            return {
                base: baseValue,
                aliquot: 0,
                value: 0,
                csosn: '102', // Default: Tributada sem permissão de crédito
                cst: undefined
            };
        }

        // Lucro Presumido/Real - Calculate actual ICMS
        const stateRate = ICMS_STATE_RATES[input.state || 'SP'] || 18;
        const aliquot = stateRate;
        const value = baseValue * (aliquot / 100);

        return {
            base: baseValue,
            aliquot,
            value: Math.round(value * 100) / 100,
            csosn: undefined,
            cst: '00' // 00 = Tributada integralmente
        };
    }

    /**
     * Calculate PIS
     */
    private calculatePIS(input: TaxCalculationInput, baseValue: number) {
        const rates = PIS_COFINS_RATES[input.taxRegime];
        const aliquot = rates.pis;
        const value = baseValue * (aliquot / 100);

        return {
            base: baseValue,
            aliquot,
            value: Math.round(value * 100) / 100,
            cst: input.taxRegime === 'simple_national' ? '99' : '01'
        };
    }

    /**
     * Calculate COFINS
     */
    private calculateCOFINS(input: TaxCalculationInput, baseValue: number) {
        const rates = PIS_COFINS_RATES[input.taxRegime];
        const aliquot = rates.cofins;
        const value = baseValue * (aliquot / 100);

        return {
            base: baseValue,
            aliquot,
            value: Math.round(value * 100) / 100,
            cst: input.taxRegime === 'simple_national' ? '99' : '01'
        };
    }

    /**
     * Get Simples Nacional rate based on annual revenue
     */
    getSimplesNacionalRate(annualRevenue: number): number {
        const bracket = SIMPLES_NACIONAL_RATES.find(
            r => annualRevenue >= r.minRevenue && annualRevenue <= r.maxRevenue
        );
        return bracket?.aliquot || 19.00; // Default to highest if out of range
    }

    /**
     * Calculate DAS (Documento de Arrecadação do Simples Nacional)
     */
    calculateDAS(monthlyRevenue: number, annualRevenue: number): number {
        const rate = this.getSimplesNacionalRate(annualRevenue);
        return Math.round(monthlyRevenue * (rate / 100) * 100) / 100;
    }

    /**
     * Validate NCM code format
     */
    validateNCM(ncm: string): boolean {
        // NCM must be 8 digits
        const cleanNCM = ncm.replace(/\D/g, '');
        return cleanNCM.length === 8;
    }

    /**
     * Get pharmaceutical tax treatment
     * Many medications have reduced or zero ICMS in Brazil
     */
    getPharmaceuticalTaxTreatment(ncm: string): { reducedBase: boolean; reduction: number } {
        // NCMs starting with 3003 or 3004 are pharmaceutical products
        const isPharmaceutical = ncm.startsWith('3003') || ncm.startsWith('3004');

        if (isPharmaceutical) {
            return { reducedBase: true, reduction: 33.33 }; // Common reduction for medications
        }

        return { reducedBase: false, reduction: 0 };
    }
}

export const taxService = new TaxService();
