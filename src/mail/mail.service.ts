import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  sendPasswordResetEmail(email: string, resetUrl: string) {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Сброс пароля Astusha ID',
      html: `
                <h2>Сброс пароля</h2>

                <p>Вы запросили сброс пароля для Astusha ID.</p>

                <p>Чтобы задать новый пароль, перейдите по ссылке:</p>

                <p>
                    <a href="${resetUrl}">
                        Сбросить пароль
                    </a>
                </p>

                <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>

                <p>Ссылка действует 30 минут.</p>
            `,
    });
  }
}
