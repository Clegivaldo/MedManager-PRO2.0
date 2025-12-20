import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxService, TaxCalculationInput, SIMPLES_NACIONAL_RATES, PIS_COFINS_RATES, ICMS_STATE_RATES } from '../services/tax.service';

// Mock logger
vi.mock('../utils/logger.js', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

describe('TaxService', () => {
    let taxService: TaxService;

    beforeEach(() => {
        taxService = new TaxService();
    });

    describe('calculateTaxes', () => {
        it('should calculate taxes for Simples Nacional regime with zero ICMS/PIS/COFINS', () => {
            const input: TaxCalculationInput = {
                value: 100,
                quantity: 1,
                unitPrice: 100,
                taxRegime: 'simple_national',
                state: 'SP',
            };

            const result = taxService.calculateTaxes(input);

            expect(result.baseValue).toBe(100);
            expect(result.icms.value).toBe(0);
            expect(result.icms.csosn).toBe('102');
            expect(result.pis.value).toBe(0);
            expect(result.cofins.value).toBe(0);
            expect(result.totalTax).toBe(0);
        });

        it('should calculate taxes for Lucro Presumido regime', () => {
            const input: TaxCalculationInput = {
                value: 1000,
                quantity: 1,
                unitPrice: 1000,
                taxRegime: 'presumed_profit',
                state: 'SP',
            };

            const result = taxService.calculateTaxes(input);

            expect(result.baseValue).toBe(1000);
            // ICMS SP = 18%
            expect(result.icms.value).toBe(180);
            expect(result.icms.aliquot).toBe(18);
            // PIS = 0.65%
            expect(result.pis.value).toBe(6.5);
            // COFINS = 3.00%
            expect(result.cofins.value).toBe(30);
            expect(result.totalTax).toBe(216.5);
        });

        it('should calculate taxes for Lucro Real regime', () => {
            const input: TaxCalculationInput = {
                value: 1000,
                quantity: 1,
                unitPrice: 1000,
                taxRegime: 'real_profit',
                state: 'SP',
            };

            const result = taxService.calculateTaxes(input);

            expect(result.baseValue).toBe(1000);
            // ICMS SP = 18%
            expect(result.icms.value).toBe(180);
            // PIS = 1.65%
            expect(result.pis.value).toBe(16.5);
            // COFINS = 7.60%
            expect(result.cofins.value).toBe(76);
            expect(result.totalTax).toBe(272.5);
        });

        it('should apply discount correctly', () => {
            const input: TaxCalculationInput = {
                value: 100,
                quantity: 1,
                unitPrice: 100,
                discount: 10,
                taxRegime: 'presumed_profit',
                state: 'SP',
            };

            const result = taxService.calculateTaxes(input);

            expect(result.baseValue).toBe(90);
        });

        it('should use correct ICMS rate for different states', () => {
            const inputRJ: TaxCalculationInput = {
                value: 1000,
                quantity: 1,
                unitPrice: 1000,
                taxRegime: 'presumed_profit',
                state: 'RJ',
            };

            const resultRJ = taxService.calculateTaxes(inputRJ);
            expect(resultRJ.icms.aliquot).toBe(20); // RJ has 20%

            const inputSC: TaxCalculationInput = {
                value: 1000,
                quantity: 1,
                unitPrice: 1000,
                taxRegime: 'presumed_profit',
                state: 'SC',
            };

            const resultSC = taxService.calculateTaxes(inputSC);
            expect(resultSC.icms.aliquot).toBe(17); // SC has 17%
        });

        it('should calculate effective rate correctly', () => {
            const input: TaxCalculationInput = {
                value: 1000,
                quantity: 1,
                unitPrice: 1000,
                taxRegime: 'presumed_profit',
                state: 'SP',
            };

            const result = taxService.calculateTaxes(input);

            // Total tax = 216.5, base = 1000
            // Effective rate = 21.65%
            expect(result.effectiveRate).toBeCloseTo(21.65, 2);
        });
    });

    describe('getSimplesNacionalRate', () => {
        it('should return correct rate for first bracket', () => {
            const rate = taxService.getSimplesNacionalRate(100000);
            expect(rate).toBe(4.00);
        });

        it('should return correct rate for second bracket', () => {
            const rate = taxService.getSimplesNacionalRate(250000);
            expect(rate).toBe(7.30);
        });

        it('should return correct rate for third bracket', () => {
            const rate = taxService.getSimplesNacionalRate(500000);
            expect(rate).toBe(9.50);
        });

        it('should return highest rate for revenue above limit', () => {
            const rate = taxService.getSimplesNacionalRate(10000000);
            expect(rate).toBe(19.00);
        });
    });

    describe('calculateDAS', () => {
        it('should calculate DAS correctly for first bracket', () => {
            const das = taxService.calculateDAS(10000, 100000);
            // 10000 * 4% = 400
            expect(das).toBe(400);
        });

        it('should calculate DAS correctly for higher bracket', () => {
            const das = taxService.calculateDAS(50000, 1000000);
            // 50000 * 10.7% = 5350
            expect(das).toBe(5350);
        });
    });

    describe('validateNCM', () => {
        it('should validate correct NCM format', () => {
            expect(taxService.validateNCM('30039000')).toBe(true);
            expect(taxService.validateNCM('3003.90.00')).toBe(true);
        });

        it('should reject invalid NCM format', () => {
            expect(taxService.validateNCM('3003')).toBe(false);
            expect(taxService.validateNCM('123456789')).toBe(false);
        });
    });

    describe('getPharmaceuticalTaxTreatment', () => {
        it('should identify pharmaceutical products', () => {
            const result = taxService.getPharmaceuticalTaxTreatment('30039000');
            expect(result.reducedBase).toBe(true);
            expect(result.reduction).toBe(33.33);
        });

        it('should identify non-pharmaceutical products', () => {
            const result = taxService.getPharmaceuticalTaxTreatment('85171231');
            expect(result.reducedBase).toBe(false);
            expect(result.reduction).toBe(0);
        });
    });

    describe('Constants Validation', () => {
        it('should have all required Simples Nacional brackets', () => {
            expect(SIMPLES_NACIONAL_RATES.length).toBe(6);
        });

        it('should have all required PIS/COFINS rates', () => {
            expect(PIS_COFINS_RATES).toHaveProperty('simple_national');
            expect(PIS_COFINS_RATES).toHaveProperty('presumed_profit');
            expect(PIS_COFINS_RATES).toHaveProperty('real_profit');
        });

        it('should have all Brazilian states in ICMS rates', () => {
            expect(Object.keys(ICMS_STATE_RATES).length).toBe(27);
            expect(ICMS_STATE_RATES).toHaveProperty('SP');
            expect(ICMS_STATE_RATES).toHaveProperty('RJ');
            expect(ICMS_STATE_RATES).toHaveProperty('MG');
        });
    });
});
