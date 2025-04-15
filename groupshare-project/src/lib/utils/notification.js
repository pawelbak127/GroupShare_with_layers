// src/lib/utils/notification.js
import { toast as hotToast } from 'react-hot-toast';

/**
 * Centralny moduł do wyświetlania powiadomień
 * Zapobiega wielokrotnym importom toast w różnych komponentach
 */
export const toast = {
  /**
   * Wyświetla powiadomienie o sukcesie
   * @param {string} message - Treść powiadomienia
   * @param {Object} options - Opcje powiadomienia
   */
  success: (message, options = {}) => {
    return hotToast.success(message, options);
  },

  /**
   * Wyświetla powiadomienie o błędzie
   * @param {string} message - Treść powiadomienia
   * @param {Object} options - Opcje powiadomienia
   */
  error: (message, options = {}) => {
    return hotToast.error(message, options);
  },

  /**
   * Wyświetla neutralne powiadomienie informacyjne
   * @param {string} message - Treść powiadomienia
   * @param {Object} options - Opcje powiadomienia
   */
  info: (message, options = {}) => {
    return hotToast(message, options);
  },

  /**
   * Wyświetla powiadomienie ostrzegawcze
   * @param {string} message - Treść powiadomienia
   * @param {Object} options - Opcje powiadomienia
   */
  warning: (message, options = {}) => {
    return hotToast(message, {
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        borderLeft: '4px solid #F59E0B'
      },
      ...options
    });
  },

  /**
   * Pokazuje powiadomienie z promisem (np. ładowanie)
   * @param {Promise} promise - Promise do obserwowania
   * @param {Object} messages - Opcje wiadomości
   */
  promise: (promise, messages, options = {}) => {
    return hotToast.promise(promise, messages, options);
  },

  /**
   * Usuwa wszystkie aktywne powiadomienia
   */
  dismiss: () => {
    hotToast.dismiss();
  },

  /**
   * Niestandardowe powiadomienie z custom stylami
   * @param {string} message - Treść powiadomienia
   * @param {Object} options - Opcje powiadomienia
   */
  custom: (message, options = {}) => {
    return hotToast(message, options);
  }
};