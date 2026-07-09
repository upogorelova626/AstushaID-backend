import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';

type SecurityNotificationMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

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

  async sendTwoFactorCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: 'Код подтверждения Astusha ID',
      html: `
        <h2>Код подтверждения</h2>
        <p>Введите этот код для входа в Astusha ID:</p>
        <h1 style="letter-spacing: 6px;">${code}</h1>
        <p>Код действует 10 минут.</p>
        <p>Если это были не вы, просто проигнорируйте письмо.</p>
      `,
    });
  }

  sendLoginNotificationEmail(email: string, meta: SecurityNotificationMeta) {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: 'Новый вход в Astusha ID',
      html: `
        <h2>Новый вход в аккаунт</h2>

        <p>В ваш аккаунт Astusha ID выполнен новый вход.</p>

        <p><b>Устройство:</b> ${this.escapeHtml(meta.userAgent ?? 'Неизвестно')}</p>
        <p><b>IP-адрес:</b> ${this.escapeHtml(meta.ipAddress ?? 'Неизвестно')}</p>

        <p>Если это были не вы, смените пароль и завершите активные сессии.</p>
      `,
    });
  }

  sendPasswordChangedNotificationEmail(email: string) {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: 'Пароль Astusha ID изменён',
      html: `
        <h2>Пароль изменён</h2>

        <p>Пароль от вашего аккаунта Astusha ID был успешно изменён.</p>

        <p>Если это были не вы, восстановите доступ к аккаунту и завершите активные сессии.</p>
      `,
    });
  }

  sendSessionsFinishedNotificationEmail(email: string) {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: 'Сессии Astusha ID завершены',
      html: `
        <h2>Сессии завершены</h2>

        <p>Одна или несколько активных сессий вашего аккаунта были завершены.</p>

        <p>Если это были не вы, смените пароль от аккаунта.</p>
      `,
    });
  }

  sendTwoFactorChangedNotificationEmail(email: string, enabled: boolean) {
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: enabled
        ? 'Двухфакторная аутентификация включена'
        : 'Двухфакторная аутентификация отключена',
      html: enabled
        ? `
          <h2>Двухфакторная аутентификация включена</h2>

          <p>Для вашего аккаунта Astusha ID включена двухфакторная аутентификация.</p>

          <p>Теперь при входе может потребоваться дополнительный код подтверждения.</p>
        `
        : `
          <h2>Двухфакторная аутентификация отключена</h2>

          <p>Для вашего аккаунта Astusha ID отключена двухфакторная аутентификация.</p>

          <p>Если это были не вы, смените пароль и проверьте активные сессии.</p>
        `,
    });
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
