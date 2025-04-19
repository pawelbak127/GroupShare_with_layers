// /src/infrastructure/external-services/email/EmailServiceAdapter.js

import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';

/**
 * Adapter usługi email odpowiedzialny za wysyłanie wiadomości
 * W wersji produkcyjnej byłby zintegrowany z dostawcą jak SendGrid, Mailgun itp.
 */
export class EmailServiceAdapter {
  /**
   * Inicjalizuje adapter usługi email
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    this.options = {
      enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      provider: process.env.EMAIL_PROVIDER || 'console',
      fromEmail: process.env.EMAIL_FROM || 'no-reply@groupshare.example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'GroupShare',
      debugMode: process.env.NODE_ENV !== 'production',
      loggingEnabled: true,
      ...options
    };
    
    // Konfiguracja dostawcy usług email
    this.providerConfig = {
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || 'your-sendgrid-api-key',
        templates: {
          welcome: process.env.SENDGRID_WELCOME_TEMPLATE || 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          purchaseConfirmation: process.env.SENDGRID_PURCHASE_TEMPLATE || 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          accessInstructions: process.env.SENDGRID_ACCESS_TEMPLATE || 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          passwordReset: process.env.SENDGRID_PASSWORD_RESET_TEMPLATE || 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          dispute: process.env.SENDGRID_DISPUTE_TEMPLATE || 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        }
      },
      mailgun: {
        apiKey: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key',
        domain: process.env.MAILGUN_DOMAIN || 'mg.example.com',
        region: process.env.MAILGUN_REGION || 'eu'
      }
    };
  }
  
  /**
   * Wysyła wiadomość email
   * @param {string} to - Adres email odbiorcy
   * @param {string} subject - Temat wiadomości
   * @param {string} content - Treść wiadomości (HTML)
   * @param {Object} options - Dodatkowe opcje
   * @returns {Promise<Object>} - Wynik wysyłania
   */
  async sendEmail(to, subject, content, options = {}) {
    try {
      // Sprawdź czy usługa jest włączona
      if (!this.options.enabled) {
        console.log(`Email sending disabled: Would send to ${to} with subject: ${subject}`);
        return { success: false, reason: 'Email sending is disabled' };
      }
      
      // Przygotuj dane email
      const emailData = {
        to,
        from: {
          email: options.fromEmail || this.options.fromEmail,
          name: options.fromName || this.options.fromName
        },
        subject,
        html: content,
        text: this.htmlToText(content), // Wersja tekstowa dla klientów bez HTML
        ...options
      };
      
      // Wysyłka przez odpowiedniego dostawcę
      let result;
      
      switch (this.options.provider.toLowerCase()) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(emailData);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(emailData);
          break;
        case 'console':
        default:
          // W trybie developerskim wyświetl treść w konsoli
          result = this.sendViaConsole(emailData);
          break;
      }
      
      // Zaloguj wysłanie emaila
      if (this.options.loggingEnabled) {
        await this.logEmailSent({
          recipient: to,
          subject,
          provider: this.options.provider,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
          message_id: result.messageId,
          template_id: options.templateId,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Zaloguj błąd
      if (this.options.loggingEnabled) {
        await this.logEmailSent({
          recipient: to,
          subject,
          provider: this.options.provider,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw new ApplicationException('Failed to send email', 'EMAIL_ERROR');
    }
  }
  
  /**
   * Wysyła email używając SendGrid
   * @param {Object} emailData - Dane emaila
   * @returns {Promise<Object>} - Wynik wysyłania
   * @private
   */
  async sendViaSendGrid(emailData) {
    try {
      // W rzeczywistej implementacji użylibyśmy SDK SendGrid
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.providerConfig.sendgrid.apiKey);
      // const response = await sgMail.send(emailData);
      
      // Symulacja wysyłki (w rzeczywistym kodzie byłby faktyczny wywołanie API)
      console.log(`[SendGrid] Sending email to: ${emailData.to}`);
      console.log(`[SendGrid] Subject: ${emailData.subject}`);
      
      // Symulacja udanej odpowiedzi
      return {
        success: true,
        messageId: `sendgrid_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        provider: 'sendgrid'
      };
    } catch (error) {
      console.error('SendGrid sending error:', error);
      return {
        success: false,
        error: error.message || 'Unknown SendGrid error',
        provider: 'sendgrid'
      };
    }
  }
  
  /**
   * Wysyła email używając Mailgun
   * @param {Object} emailData - Dane emaila
   * @returns {Promise<Object>} - Wynik wysyłania
   * @private
   */
  async sendViaMailgun(emailData) {
    try {
      // W rzeczywistej implementacji użylibyśmy SDK Mailgun
      // const mailgun = require('mailgun-js')({
      //   apiKey: this.providerConfig.mailgun.apiKey,
      //   domain: this.providerConfig.mailgun.domain,
      //   region: this.providerConfig.mailgun.region
      // });
      // 
      // const data = {
      //   from: `${emailData.from.name} <${emailData.from.email}>`,
      //   to: emailData.to,
      //   subject: emailData.subject,
      //   html: emailData.html,
      //   text: emailData.text
      // };
      // 
      // const response = await mailgun.messages().send(data);
      
      // Symulacja wysyłki (w rzeczywistym kodzie byłby faktyczny wywołanie API)
      console.log(`[Mailgun] Sending email to: ${emailData.to}`);
      console.log(`[Mailgun] Subject: ${emailData.subject}`);
      
      // Symulacja udanej odpowiedzi
      return {
        success: true,
        messageId: `mailgun_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        provider: 'mailgun'
      };
    } catch (error) {
      console.error('Mailgun sending error:', error);
      return {
        success: false,
        error: error.message || 'Unknown Mailgun error',
        provider: 'mailgun'
      };
    }
  }
  
  /**
   * Wyświetla email w konsoli (dla rozwoju)
   * @param {Object} emailData - Dane emaila
   * @returns {Object} - Wynik symulowanej wysyłki
   * @private
   */
  sendViaConsole(emailData) {
    console.log('========== EMAIL ==========');
    console.log(`To: ${emailData.to}`);
    console.log(`From: ${emailData.from.name} <${emailData.from.email}>`);
    console.log(`Subject: ${emailData.subject}`);
    console.log('------ CONTENT ------');
    console.log(emailData.text || emailData.html);
    console.log('========================');
    
    return {
      success: true,
      messageId: `console_${Date.now()}`,
      provider: 'console'
    };
  }
  
  /**
   * Konwertuje HTML do tekstu
   * @param {string} html - Treść HTML
   * @returns {string} - Treść tekstowa
   * @private
   */
  htmlToText(html) {
    // Prosta implementacja, w rzeczywistości lepiej użyć biblioteki jak html-to-text
    return html
      .replace(/<[^>]*>/g, '') // Usuń tagi HTML
      .replace(/\s+/g, ' ') // Zastąp wiele spacji jedną
      .trim();
  }
  
  /**
   * Loguje wysłanie emaila
   * @param {Object} logData - Dane do zalogowania
   * @returns {Promise<void>}
   * @private
   */
  async logEmailSent(logData) {
    try {
      await supabaseAdmin
        .from('email_logs')
        .insert([logData]);
    } catch (error) {
      console.error('Failed to log email sending:', error);
      // Nie rzucamy wyjątku, aby nie przerywać głównego procesu
    }
  }
  
  /**
   * Wysyła email z szablonu
   * @param {string} to - Adres email odbiorcy
   * @param {string} templateName - Nazwa szablonu
   * @param {Object} templateData - Dane do szablonu
   * @param {Object} options - Dodatkowe opcje
   * @returns {Promise<Object>} - Wynik wysyłania
   */
  async sendTemplateEmail(to, templateName, templateData, options = {}) {
    try {
      // Jeśli używamy SendGrid, możemy użyć ich systemu szablonów
      if (this.options.provider.toLowerCase() === 'sendgrid') {
        const templateId = this.providerConfig.sendgrid.templates[templateName];
        
        if (!templateId) {
          throw new Error(`Template not found: ${templateName}`);
        }
        
        // Symulacja wysyłki z szablonem
        console.log(`[SendGrid] Sending template email to: ${to}`);
        console.log(`[SendGrid] Template: ${templateName} (${templateId})`);
        console.log(`[SendGrid] Data:`, templateData);
        
        // Zaloguj
        if (this.options.loggingEnabled) {
          await this.logEmailSent({
            recipient: to,
            template: templateName,
            provider: 'sendgrid',
            status: 'sent',
            template_id: templateId,
            timestamp: new Date().toISOString()
          });
        }
        
        return {
          success: true,
          messageId: `sendgrid_template_${Date.now()}`,
          provider: 'sendgrid',
          templateId
        };
      }
      
      // Dla innych dostawców, możemy użyć lokalnych szablonów
      const subject = this.getTemplateSubject(templateName, templateData);
      const content = this.renderTemplate(templateName, templateData);
      
      return await this.sendEmail(to, subject, content, options);
    } catch (error) {
      console.error('Error sending template email:', error);
      throw new ApplicationException('Failed to send template email', 'EMAIL_ERROR');
    }
  }
  
  /**
   * Pobiera temat dla szablonu
   * @param {string} templateName - Nazwa szablonu
   * @param {Object} templateData - Dane do szablonu
   * @returns {string} - Temat
   * @private
   */
  getTemplateSubject(templateName, templateData) {
    const subjects = {
      welcome: 'Witaj w GroupShare!',
      purchaseConfirmation: 'Potwierdzenie zakupu subskrypcji',
      accessInstructions: 'Instrukcje dostępu do subskrypcji',
      passwordReset: 'Resetowanie hasła w GroupShare',
      dispute: 'Zgłoszono problem z subskrypcją'
    };
    
    return subjects[templateName] || 'Wiadomość z GroupShare';
  }
  
  /**
   * Renderuje szablon do HTML
   * @param {string} templateName - Nazwa szablonu
   * @param {Object} templateData - Dane do szablonu
   * @returns {string} - Zawartość HTML
   * @private
   */
  renderTemplate(templateName, templateData) {
    // W rzeczywistej implementacji użylibyśmy silnika szablonów jak Handlebars, EJS itp.
    // Tutaj dla uproszczenia zwracamy prosty HTML
    
    switch (templateName) {
      case 'welcome':
        return `
          <h1>Witaj ${templateData.name || 'w GroupShare'}!</h1>
          <p>Dziękujemy za dołączenie do naszej platformy. Możesz teraz zacząć korzystać z grupowych subskrypcji.</p>
          <p><a href="${templateData.loginUrl || 'https://groupshare.example.com/login'}">Zaloguj się</a> i odkryj dostępne oferty!</p>
        `;
      
      case 'purchaseConfirmation':
        return `
          <h1>Potwierdzenie zakupu subskrypcji</h1>
          <p>Dziękujemy za zakup subskrypcji ${templateData.subscriptionName || ''}.</p>
          <p>Szczegóły zakupu:</p>
          <ul>
            <li>Platforma: ${templateData.platformName || ''}</li>
            <li>Kwota: ${templateData.amount || ''} ${templateData.currency || 'PLN'}</li>
            <li>Data: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p><a href="${templateData.accessUrl || ''}">Kliknij tutaj, aby uzyskać dostęp</a></p>
        `;
      
      case 'accessInstructions':
        return `
          <h1>Instrukcje dostępu do subskrypcji</h1>
          <p>Oto instrukcje dostępu do subskrypcji ${templateData.subscriptionName || ''}:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${templateData.instructions || 'Instrukcje nie są dostępne. Skontaktuj się z administracją.'}
          </div>
          <p>W razie problemów, <a href="${templateData.supportUrl || 'https://groupshare.example.com/support'}">skontaktuj się z nami</a>.</p>
        `;
      
      case 'passwordReset':
        return `
          <h1>Resetowanie hasła</h1>
          <p>Otrzymaliśmy prośbę o reset hasła dla Twojego konta w GroupShare.</p>
          <p>Kliknij poniższy link, aby zresetować hasło:</p>
          <p><a href="${templateData.resetUrl || ''}">Resetuj hasło</a></p>
          <p>Link wygaśnie za ${templateData.expiryHours || 1} ${templateData.expiryHours === 1 ? 'godzinę' : 'godziny'}.</p>
          <p>Jeśli to nie Ty prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
        `;
      
      case 'dispute':
        return `
          <h1>Zgłoszono problem z subskrypcją</h1>
          <p>Otrzymaliśmy zgłoszenie problemu z subskrypcją ${templateData.subscriptionName || ''}.</p>
          <p>Opis problemu: ${templateData.description || 'Brak opisu'}</p>
          <p>Zajmiemy się tym jak najszybciej. W razie pytań, odpowiedz na tę wiadomość.</p>
        `;
      
      default:
        return `
          <h1>Wiadomość z GroupShare</h1>
          <p>${JSON.stringify(templateData)}</p>
        `;
    }
  }
}

export default EmailServiceAdapter;