import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor() {
    const host = process.env.MAIL_HOST;
    this.from = process.env.MAIL_FROM ?? 'UNICAL <no-reply@unical.assoc.id>';

    // Tanpa SMTP, layanan tetap hidup; pengiriman dilaporkan gagal secara jujur.
    this.transport = host
      ? createTransport({
          host,
          port: Number(process.env.MAIL_PORT ?? 587),
          secure: process.env.MAIL_SECURE === 'true',
          auth: process.env.MAIL_USER
            ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
            : undefined,
        })
      : null;
  }

  get configured(): boolean {
    return this.transport !== null;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<boolean> {
    if (!this.transport) return false;

    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject: 'Reset Kata Sandi — UNICAL ASSOCIATES REPO',
        text:
          `Super admin menerbitkan tautan reset kata sandi untuk akun Anda.\n\n` +
          `Buka tautan berikut dalam 1 jam:\n${resetUrl}\n\n` +
          `Abaikan email ini bila Anda tidak meminta reset.`,
      });
      return true;
    } catch (error) {
      this.logger.warn(`Kirim email gagal: ${(error as Error).message}`);
      return false;
    }
  }
}
