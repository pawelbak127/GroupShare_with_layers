// /src/infrastructure/repositories/SupabaseTransactionRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { Transaction } from '@/domain/purchase/entities/Transaction';
import { Id } from '@/domain/shared/value-objects/Id';
import { Money } from '@/domain/shared/value-objects/Money';
import { TransactionStatus } from '@/domain/purchase/value-objects/TransactionStatus';
import { PaymentMethod } from '@/domain/purchase/value-objects/PaymentMethod';

/**
 * Implementacja repozytorium transakcji używająca Supabase
 * @implements {RepositoryPort<Transaction>}
 */
class SupabaseTransactionRepository extends RepositoryPort {
  /**
   * Zapisuje transakcję
   * @param {Transaction} transaction Transakcja do zapisania
   * @returns {Promise<Transaction>} Zapisana transakcja
   */
  async save(transaction) {
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
    if (!await this.exists(transaction.id)) {
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
   * Znajduje transakcję po ID
   * @param {string} id ID transakcji
   * @returns {Promise<Transaction|null>} Znaleziona transakcja lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', id)
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
   * Usuwa transakcję
   * @param {string} id ID transakcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy transakcja istnieje
   * @param {string} id ID transakcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Znajduje transakcje po ID kupującego
   * @param {string} buyerId ID kupującego
   * @returns {Promise<Transaction[]>} Lista transakcji
   */
  async findByBuyerId(buyerId) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch transactions by buyer ID: ${error.message}`);
    }
    
    return data.map(transaction => Transaction.restore(
      transaction.id,
      transaction.buyer_id,
      transaction.seller_id,
      transaction.group_sub_id,
      transaction.purchase_record_id,
      transaction.amount,
      transaction.platform_fee,
      transaction.seller_amount,
      transaction.currency,
      transaction.payment_method,
      transaction.payment_provider,
      transaction.payment_id,
      transaction.status,
      new Date(transaction.created_at),
      new Date(transaction.updated_at),
      transaction.completed_at ? new Date(transaction.completed_at) : null
    ));
  }
  
  /**
   * Znajduje transakcje po ID sprzedającego
   * @param {string} sellerId ID sprzedającego
   * @returns {Promise<Transaction[]>} Lista transakcji
   */
  async findBySellerId(sellerId) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch transactions by seller ID: ${error.message}`);
    }
    
    return data.map(transaction => Transaction.restore(
      transaction.id,
      transaction.buyer_id,
      transaction.seller_id,
      transaction.group_sub_id,
      transaction.purchase_record_id,
      transaction.amount,
      transaction.platform_fee,
      transaction.seller_amount,
      transaction.currency,
      transaction.payment_method,
      transaction.payment_provider,
      transaction.payment_id,
      transaction.status,
      new Date(transaction.created_at),
      new Date(transaction.updated_at),
      transaction.completed_at ? new Date(transaction.completed_at) : null
    ));
  }
  
  /**
   * Znajduje transakcje po ID zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<Transaction|null>} Transakcja lub null
   */
  async findByPurchaseId(purchaseId) {
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
   * Znajduje transakcje po statusie
   * @param {string} status Status transakcji
   * @returns {Promise<Transaction[]>} Lista transakcji
   */
  async findByStatus(status) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch transactions by status: ${error.message}`);
    }
    
    return data.map(transaction => Transaction.restore(
      transaction.id,
      transaction.buyer_id,
      transaction.seller_id,
      transaction.group_sub_id,
      transaction.purchase_record_id,
      transaction.amount,
      transaction.platform_fee,
      transaction.seller_amount,
      transaction.currency,
      transaction.payment_method,
      transaction.payment_provider,
      transaction.payment_id,
      transaction.status,
      new Date(transaction.created_at),
      new Date(transaction.updated_at),
      transaction.completed_at ? new Date(transaction.completed_at) : null
    ));
  }
}

export default SupabaseTransactionRepository;