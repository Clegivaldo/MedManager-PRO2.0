import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface UploadResult {
  key: string;
  bucket: string;
  location: string;
  size: number;
}

interface CloudStorageConfig {
  provider: 'aws' | 'azure' | 'local';
  aws?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
}

export class CloudStorageService {
  private s3Client?: S3Client;
  private config: CloudStorageConfig;
  private bucket: string;

  constructor() {
    this.config = this.loadConfig();
    this.bucket = this.config.aws?.bucket || 'medmanager-backups';

    if (this.config.provider === 'aws' && this.config.aws) {
      this.s3Client = new S3Client({
        region: this.config.aws.region,
        credentials: {
          accessKeyId: this.config.aws.accessKeyId,
          secretAccessKey: this.config.aws.secretAccessKey,
        },
      });
    }
  }

  /**
   * Carrega configuração do cloud storage
   */
  private loadConfig(): CloudStorageConfig {
    const provider = (process.env.CLOUD_STORAGE_PROVIDER || 'local') as 'aws' | 'azure' | 'local';

    if (provider === 'aws') {
      return {
        provider: 'aws',
        aws: {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          bucket: process.env.AWS_S3_BUCKET || 'medmanager-backups',
        },
      };
    }

    return { provider: 'local' };
  }

  /**
   * Upload de arquivo para S3
   */
  async uploadBackup(filePath: string, key: string): Promise<UploadResult> {
    try {
      if (this.config.provider === 'local') {
        logger.info('Cloud storage not configured, backup stored locally only');
        const stats = fs.statSync(filePath);
        return {
          key,
          bucket: 'local',
          location: filePath,
          size: stats.size,
        };
      }

      if (!this.s3Client) {
        throw new AppError('S3 client not initialized', 500);
      }

      // Lê arquivo
      const fileContent = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      // Upload para S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-name': path.basename(filePath),
          'upload-date': new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      logger.info(`Backup uploaded to S3: ${key}`);

      return {
        key,
        bucket: this.bucket,
        location: `s3://${this.bucket}/${key}`,
        size: stats.size,
      };
    } catch (error) {
      logger.error('Failed to upload backup to cloud', { error, key });
      throw new AppError('Failed to upload backup to cloud storage', 500);
    }
  }

  /**
   * Download de arquivo do S3
   */
  async downloadBackup(key: string, destinationPath: string): Promise<string> {
    try {
      if (this.config.provider === 'local') {
        throw new AppError('Cloud storage not configured', 400);
      }

      if (!this.s3Client) {
        throw new AppError('S3 client not initialized', 500);
      }

      // Download do S3
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new AppError('Empty response from S3', 500);
      }

      // Salva arquivo localmente
      const buffer = await response.Body.transformToByteArray();
      fs.writeFileSync(destinationPath, buffer);

      logger.info(`Backup downloaded from S3: ${key}`);

      return destinationPath;
    } catch (error) {
      logger.error('Failed to download backup from cloud', { error, key });
      throw new AppError('Failed to download backup from cloud storage', 500);
    }
  }

  /**
   * Deleta arquivo do S3
   */
  async deleteBackup(key: string): Promise<void> {
    try {
      if (this.config.provider === 'local') {
        logger.info('Cloud storage not configured, skipping cloud delete');
        return;
      }

      if (!this.s3Client) {
        throw new AppError('S3 client not initialized', 500);
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info(`Backup deleted from S3: ${key}`);
    } catch (error) {
      logger.error('Failed to delete backup from cloud', { error, key });
      throw new AppError('Failed to delete backup from cloud storage', 500);
    }
  }

  /**
   * Lista backups no S3
   */
  async listBackups(prefix?: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    try {
      if (this.config.provider === 'local') {
        return [];
      }

      if (!this.s3Client) {
        throw new AppError('S3 client not initialized', 500);
      }

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
    } catch (error) {
      logger.error('Failed to list backups from cloud', { error });
      throw new AppError('Failed to list backups from cloud storage', 500);
    }
  }

  /**
   * Gera URL assinada para download direto (válida por 1 hora)
   */
  async getDownloadUrl(key: string): Promise<string> {
    try {
      if (this.config.provider === 'local') {
        throw new AppError('Cloud storage not configured', 400);
      }

      if (!this.s3Client) {
        throw new AppError('S3 client not initialized', 500);
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      return url;
    } catch (error) {
      logger.error('Failed to generate download URL', { error, key });
      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Verifica se cloud storage está configurado
   */
  isConfigured(): boolean {
    return this.config.provider !== 'local';
  }

  /**
   * Obtém informações de configuração
   */
  getInfo() {
    return {
      provider: this.config.provider,
      bucket: this.bucket,
      configured: this.isConfigured(),
    };
  }
}

export const cloudStorageService = new CloudStorageService();
