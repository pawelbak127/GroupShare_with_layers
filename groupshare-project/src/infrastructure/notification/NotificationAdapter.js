// /src/infrastructure/notification/NotificationAdapter.js

import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';

/**
 * Adapter powiadomień implementujący interfejs z warstwy aplikacji
 * Rozszerza implementację o obsługę różnych kanałów powiadomień
 */
export class NotificationAdapter {
  /**
   * Inicjalizuje adapter powiadomień
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    this.options = {
      useDatabase: true,
      useToast: true,
      useEmail: false,
      ...options
    };
  }
  
  /**
   * Wysyła powiadomienie do użytkownika
   * @param {string} userId ID użytkownika
   * @param {string} type Typ powiadomienia
   * @param {string} title Tytuł powiadomienia
   * @param {string} content Treść powiadomienia
   * @param {string} relatedEntityType Typ powiązanej encji
   * @param {string} relatedEntityId ID powiązanej encji
   * @returns {Promise<Object>} Informacje o wysłanym powiadomieniu
   */
  async sendNotification(userId, type, title, content, relatedEntityType, relatedEntityId) {
    try {
      // Sprawdź czy parametry są poprawne
      if (!userId || !type || !title || !content) {
        throw new Error('Missing required notification parameters');
      }
      
      // Utwórz notyfikację
      const notification = {
        user_id: userId,
        type,
        title,
        content,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // Lista kanałów do których wysłano powiadomienie
      const deliveredChannels = [];
      
      // Zapisz powiadomienie w bazie danych
      if (this.options.useDatabase) {
        await this.saveNotificationToDatabase(notification);
        deliveredChannels.push('database');
      }
      
      // Wyślij powiadomienie toast (np. przez websocket)
      if (this.options.useToast) {
        await this.sendToastNotification(notification);
        deliveredChannels.push('toast');
      }
      
      // Wyślij email (jeśli włączone)
      if (this.options.useEmail) {
        await this.sendEmailNotification(notification);
        deliveredChannels.push('email');
      }
      
      return {
        success: true,
        notification: {
          userId,
          type,
          title,
          relatedEntityType,
          relatedEntityId
        },
        deliveredChannels
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new ApplicationException('Failed to send notification', 'NOTIFICATION_ERROR');
    }
  }
  
  /**
   * Zapisuje powiadomienie w bazie danych
   * @param {Object} notification Obiekt powiadomienia
   * @returns {Promise<Object>} Zapisane powiadomienie
   * @private
   */
  async saveNotificationToDatabase(notification) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert([notification])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error saving notification to database:', error);
      throw error;
    }
  }
  
  /**
   * Wysyła powiadomienie typu toast (poprzez websocket/SSE)
   * @param {Object} notification Obiekt powiadomienia
   * @returns {Promise<void>}
   * @private
   */
  async sendToastNotification(notification) {
    try {
      // W rzeczywistej implementacji można by użyć:
      // - Supabase Realtime
      // - Server-Sent Events (SSE)
      // - Socket.io
      // - WebSockets
      
      // Przykładowy kod dla Supabase Realtime
      const { error } = await supabaseAdmin
        .from('realtime_notifications')
        .insert([{
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          timestamp: new Date().toISOString()
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error sending toast notification:', error);
      // Nie rzucamy błędu, traktujemy to jako niekrytyczne
    }
  }
  
  /**
   * Wysyła powiadomienie przez email
   * @param {Object} notification Obiekt powiadomienia
   * @returns {Promise<void>}
   * @private
   */
  async sendEmailNotification(notification) {
    try {
      // Pobierz adres email użytkownika
      const { data: user, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', notification.user_id)
        .single();
      
      if (userError || !user || !user.email) {
        throw new Error('User email not found');
      }
      
      // W rzeczywistej implementacji, użylibyśmy serwisu email
      // np. SendGrid, Mailgun, AWS SES, etc.
      
      console.log(`Would send email to ${user.email} with title: ${notification.title}`);
      
      // Zapisz informację o wysłanym mailu
      const { error } = await supabaseAdmin
        .from('email_logs')
        .insert([{
          user_id: notification.user_id,
          email: user.email,
          subject: notification.title,
          type: notification.type,
          status: 'sent',
          timestamp: new Date().toISOString()
        }]);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Nie rzucamy błędu, traktujemy to jako niekrytyczne
    }
  }
  
  /**
   * Pobiera nieprzeczytane powiadomienia użytkownika
   * @param {string} userId ID użytkownika
   * @param {number} limit Limit wyników
   * @returns {Promise<Array>} Lista powiadomień
   */
  async getUnreadNotifications(userId, limit = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw new ApplicationException('Failed to fetch notifications', 'NOTIFICATION_ERROR');
    }
  }
  
  /**
   * Oznacza powiadomienie jako przeczytane
   * @param {string} notificationId ID powiadomienia
   * @param {string} userId ID użytkownika (dla weryfikacji)
   * @returns {Promise<boolean>} Czy operacja się powiodła
   */
  async markAsRead(notificationId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new ApplicationException('Failed to mark notification as read', 'NOTIFICATION_ERROR');
    }
  }
  
  /**
   * Wysyła powiadomienie o zakupie do sprzedającego i kupującego
   * @param {Purchase} purchase Zakup
   * @param {Subscription} subscription Subskrypcja
   * @returns {Promise<void>}
   */
  async sendPurchaseNotifications(purchase, subscription) {
    try {
      // Powiadomienie dla kupującego
      await this.sendNotification(
        purchase.userId,
        'purchase_completed',
        'Zakup zakończony pomyślnie',
        `Twój zakup subskrypcji ${subscription.platformName} został pomyślnie zakończony.`,
        'purchase',
        purchase.id
      );
      
      // Znajdź właściciela grupy (sprzedającego)
      const { data: group, error: groupError } = await supabaseAdmin
        .from('groups')
        .select('owner_id')
        .eq('id', subscription.groupId)
        .single();
      
      if (groupError || !group) {
        throw new Error('Group not found');
      }
      
      // Powiadomienie dla sprzedającego
      await this.sendNotification(
        group.owner_id,
        'sale_completed',
        'Sprzedaż zakończona pomyślnie',
        `Ktoś właśnie kupił miejsce w Twojej subskrypcji ${subscription.platformName}.`,
        'purchase',
        purchase.id
      );
    } catch (error) {
      console.error('Error sending purchase notifications:', error);
      // Log but don't throw to prevent transaction failure
    }
  }
  
  /**
   * Wysyła powiadomienie o problemie z dostępem
   * @param {string} userId ID użytkownika zgłaszającego
   * @param {string} sellerId ID sprzedającego
   * @param {string} disputeId ID sporu
   * @param {string} subscriptionName Nazwa subskrypcji
   * @returns {Promise<void>}
   */
  async sendAccessProblemNotification(userId, sellerId, disputeId, subscriptionName) {
    try {
      // Powiadomienie dla kupującego
      await this.sendNotification(
        userId,
        'dispute_created',
        'Zgłoszenie problemu z dostępem',
        'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
        'dispute',
        disputeId
      );
      
      // Powiadomienie dla sprzedającego
      await this.sendNotification(
        sellerId,
        'dispute_filed',
        'Zgłoszono problem z dostępem',
        `Kupujący zgłosił problem z dostępem do Twojej subskrypcji ${subscriptionName}.`,
        'dispute',
        disputeId
      );
    } catch (error) {
      console.error('Error sending access problem notification:', error);
      // Log but don't throw to prevent transaction failure
    }
  }
}

export default NotificationAdapter;