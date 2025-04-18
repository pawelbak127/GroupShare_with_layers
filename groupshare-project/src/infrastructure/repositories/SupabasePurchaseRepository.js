// /src/infrastructure/repositories/SupabasePurchaseRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { Purchase } from '@/domain/purchase/Purchase';
import { Transaction } from '@/domain/purchase/entities/Transaction';
import { Id } from '@/domain/shared/value-objects/Id';
import { Money } from '@/domain/shared/value-objects/Money';
import { PurchaseStatus } from '@/domain/purchase/value-objects/PurchaseStatus';
import { TransactionStatus } from '@/domain/purchase/value-objects/TransactionStatus';
import { PaymentMethod } from '@/domain/purchase/value-objects/PaymentMethod';

/**
 * Implementacja repozytorium zakupów używająca Supabase
 * @implements {RepositoryPort<Purchase>}
 */
class SupabasePurchaseRepository extends RepositoryPort {
  /**
   * Zapisuje zakup
   * @param {Purchase} purchase Zakup do zapisania
   * @returns {Promise<Purchase>} Zapisany zakup
   */
  async save(purchase) {
    // Przygotuj dane do zapisu
    const purchaseData = {
      id: purchase.id,
      user_id: purchase.userId,
      group_sub_id: purchase.subscriptionId,
      status: purchase.status.toString(),
      access_provided: purchase.accessProvided,
      access_provided_at: purchase.accessProvidedAt?.toISOString() || null,
      access_confirmed: purchase.accessConfirmed,
      access_confirmed_at: purchase.accessConfirmedAt?.toISOString() || null,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowy zakup, dodaj datę utworzenia
    if (!await this.exists(purchase.id)) {
      purchaseData.created_at = purchase.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .upsert(purchaseData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save purchase: ${error.message}`);
    }
    
    // Jeśli zakup ma transakcję, zapisz ją również
    let transactionData = null;
    if (purchase.transaction) {
      const transaction = purchase.transaction;
      
      // Zapisz transakcję
      const transactionResult = await this.saveTransaction(transaction);
      transactionData = transactionResult;
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return Purchase.restore(
      data.id,
      data.user_id,
      data.group_sub_id,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.access_provided,
      data.access_provided_at ? new Date(data.access_provided_at) : null,
      data.access_confirmed,
      data.access_confirmed_at ? new Date(data.access_confirmed_at) : null,
      transactionData
    );
  }
  
  /**
   * Znajduje zakup po ID
   * @param {string} id ID zakupu
   * @returns {Promise<Purchase|null>} Znaleziony zakup lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Pobierz powiązaną transakcję
    const transaction = await this.getTransaction(id);
    
    return Purchase.restore(
      data.id,
      data.user_id,
      data.group_sub_id,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.access_provided,
      data.access_provided_at ? new Date(data.access_provided_at) : null,
      data.access_confirmed,
      data.access_confirmed_at ? new Date(data.access_confirmed_at) : null,
      transaction
    );
  }
  
  /**
   * Usuwa zakup
   * @param {string} id ID zakupu
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('purchase_records')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy zakup istnieje
   * @param {string} id ID zakupu
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Zapisuje transakcję
   * @param {Transaction} transaction Transakcja
   * @returns {Promise<Transaction>} Zapisana transakcja
   */
  async saveTransaction(transaction) {
    // Przygotuj dane do zapisu
    const transactionData = {
      id: transaction.id,
      buyer_id: transaction.buyerId,
      seller_id: transaction.sellerId,
      group_sub_id: transaction.subscriptionId,
      purchase_record_id: transaction.purchaseId,
      amount: transaction.amount.amount,
      platform_fee: transaction.platformFee.amount,
      seller_amount: transaction.sellerAmount.amount,
      currency: transaction.amount.currency,
      payment_method: transaction.paymentMethod.toString(),
      payment_provider: transaction.paymentProvider,
      payment_id: transaction.paymentId,
      status: transaction.status.toString(),
      completed_at: transaction.completedAt?.toISOString() || null,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowa transakcja, dodaj datę utworzenia
    if (!await this.transactionExists(transaction.id)) {
      transactionData.created_at = transaction.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .upsert(transactionData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save transaction: ${error.message}`);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return Transaction.restore(
      data.id,
      data.buyer_id,
      data.seller_id,
      data.group_sub_id,
      data.purchase_record_id,
      data.amount,
      data.platform_fee,
      data.seller_amount,
      data.currency,
      data.payment_method,
      data.payment_provider,
      data.payment_id,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.completed_at ? new Date(data.completed_at) : null
    );
  }
  
  /**
   * Sprawdza czy transakcja istnieje
   * @param {string} id ID transakcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async transactionExists(id) {
    const { count, error } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Pobiera transakcję dla zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<Transaction|null>} Transakcja lub null
   */
  async getTransaction(purchaseId) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('purchase_record_id', purchaseId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return Transaction.restore(
      data.id,
      data.buyer_id,
      data.seller_id,
      data.group_sub_id,
      data.purchase_record_id,
      data.amount,
      data.platform_fee,
      data.seller_amount,
      data.currency,
      data.payment_method,
      data.payment_provider,
      data.payment_id,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.completed_at ? new Date(data.completed_at) : null
    );
  }
  
  /**
   * Znajduje zakupy po ID użytkownika
   * @param {string} userId ID użytkownika
   * @returns {Promise<Purchase[]>} Lista zakupów
   */
  async findByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch purchases by user ID: ${error.message}`);
    }
    
    // Pobierz powiązane transakcje
    const purchases = await Promise.all(data.map(async purchase => {
      const transaction = await this.getTransaction(purchase.id);
      
      return Purchase.restore(
        purchase.id,
        purchase.user_id,
        purchase.group_sub_id,
        purchase.status,
        new Date(purchase.created_at),
        new Date(purchase.updated_at),
        purchase.access_provided,
        purchase.access_provided_at ? new Date(purchase.access_provided_at) : null,
        purchase.access_confirmed,
        purchase.access_confirmed_at ? new Date(purchase.access_confirmed_at) : null,
        transaction
      );
    }));
    
    return purchases;
  }
  
  /**
   * Znajduje zakupy po ID subskrypcji
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<Purchase[]>} Lista zakupów
   */
  async findBySubscriptionId(subscriptionId) {
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*')
      .eq('group_sub_id', subscriptionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch purchases by subscription ID: ${error.message}`);
    }
    
    // Pobierz powiązane transakcje
    const purchases = await Promise.all(data.map(async purchase => {
      const transaction = await this.getTransaction(purchase.id);
      
      return Purchase.restore(
        purchase.id,
        purchase.user_id,
        purchase.group_sub_id,
        purchase.status,
        new Date(purchase.created_at),
        new Date(purchase.updated_at),
        purchase.access_provided,
        purchase.access_provided_at ? new Date(purchase.access_provided_at) : null,
        purchase.access_confirmed,
        purchase.access_confirmed_at ? new Date(purchase.access_confirmed_at) : null,
        transaction
      );
    }));
    
    return purchases;
  }
  
  /**
   * Znajduje zakupy po statusie
   * @param {string} status Status zakupu
   * @returns {Promise<Purchase[]>} Lista zakupów
   */
  async findByStatus(status) {
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch purchases by status: ${error.message}`);
    }
    
    // Pobierz powiązane transakcje
    const purchases = await Promise.all(data.map(async purchase => {
      const transaction = await this.getTransaction(purchase.id);
      
      return Purchase.restore(
        purchase.id,
        purchase.user_id,
        purchase.group_sub_id,
        purchase.status,
        new Date(purchase.created_at),
        new Date(purchase.updated_at),
        purchase.access_provided,
        purchase.access_provided_at ? new Date(purchase.access_provided_at) : null,
        purchase.access_confirmed,
        purchase.access_confirmed_at ? new Date(purchase.access_confirmed_at) : null,
        transaction
      );
    }));
    
    return purchases;
  }
  
  /**
   * Znajduje zakupy z niepotwierdzonymi dostępami
   * @returns {Promise<Purchase[]>} Lista zakupów
   */
  async findUnconfirmedAccess() {
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .select('*')
      .eq('status', 'completed')
      .eq('access_provided', true)
      .eq('access_confirmed', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch unconfirmed access purchases: ${error.message}`);
    }
    
    // Pobierz powiązane transakcje
    const purchases = await Promise.all(data.map(async purchase => {
      const transaction = await this.getTransaction(purchase.id);
      
      return Purchase.restore(
        purchase.id,
        purchase.user_id,
        purchase.group_sub_id,
        purchase.status,
        new Date(purchase.created_at),
        new Date(purchase.updated_at),
        purchase.access_provided,
        purchase.access_provided_at ? new Date(purchase.access_provided_at) : null,
        purchase.access_confirmed,
        purchase.access_confirmed_at ? new Date(purchase.access_confirmed_at) : null,
        transaction
      );
    }));
    
    return purchases;
  }
}

export default SupabasePurchaseRepository;