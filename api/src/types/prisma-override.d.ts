declare module '@prisma/client' {
  // Permitir acesso dinâmico a propriedades do PrismaClient (workaround temporário)
  interface PrismaClient {
    [key: string]: any;
  }
}
