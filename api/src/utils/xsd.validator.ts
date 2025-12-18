import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

let libxml: any = null;

async function ensureLibxml() {
    if (libxml) return libxml;
    try {
        libxml = await import('libxmljs2');
        return libxml;
    } catch (err) {
        logger.warn('libxmljs2 not available, XML validation will be skipped');
        libxml = null;
        return null;
    }
}

export class XmlValidator {
    private schema: any; // libxmljs.Document | null

    constructor(private schemaPath: string) {
        // load schema asynchronously; if libxml not available, schema stays null
        void this.loadSchema();
    }

    private async loadSchema() {
        try {
            const mod = await ensureLibxml();
            if (!mod) return;

            if (fs.existsSync(this.schemaPath)) {
                const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
                this.schema = mod.parseXml(schemaContent);
                logger.info('XSD Schema loaded successfully', { path: this.schemaPath });
            } else {
                logger.warn('XSD Schema file not found. Validation will be skipped.', { path: this.schemaPath });
            }
        } catch (error) {
            logger.error('Failed to load XSD Schema', { error: (error as Error).message });
            this.schema = null;
        }
    }

    public validate(xmlInfo: string): { valid: boolean; errors: string[] } {
        if (!this.schema) {
            return { valid: true, errors: [] }; // Skip if no schema or libxml unavailable
        }

        try {
            const xmlDoc = libxml.parseXml(xmlInfo);
            const valid = xmlDoc.validate(this.schema);

            if (valid) {
                return { valid: true, errors: [] };
            } else {
                return {
                    valid: false,
                    errors: xmlDoc.validationErrors.map((e: any) => `Line ${e.line}: ${e.message}`)
                };
            }
        } catch (error) {
            logger.error('XML Validation Exception', { error: (error as Error).message });
            return { valid: false, errors: [(error as Error).message] };
        }
    }
}

// Pre-load main schema
const schemaPath = path.join(process.cwd(), 'src', 'schemas', 'nfe_v4.00.xsd');
export const nfeValidator = new XmlValidator(schemaPath);
