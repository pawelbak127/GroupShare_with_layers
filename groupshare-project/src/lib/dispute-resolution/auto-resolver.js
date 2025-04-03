// src/lib/dispute-resolution/auto-resolver.js
export class DisputeAutoResolver {
    async attemptAutoResolution(disputeId) {
      const { data: dispute } = await supabase
        .from('disputes')
        .select(`
          *,
          transaction:transactions(
            *,
            buyer:user_profiles!buyer_id(*),
            seller:user_profiles!seller_id(*)
          )
        `)
        .eq('id', disputeId)
        .single();
      
      if (!dispute) return { resolved: false, reason: 'Dispute not found' };
      
      // Sprawdź, czy spór może być automatycznie rozwiązany
      if (dispute.dispute_type === 'access' && !dispute.access_confirmed) {
        // Sprawdź, czy instrukcje dostępu były udostępnione
        const { data: purchase } = await supabase
          .from('purchase_records')
          .select('access_provided, access_provided_at')
          .eq('id', dispute.transaction.purchase_record_id)
          .single();
        
        if (!purchase.access_provided) {
          // Automatyczny zwrot, jeśli dostęp nie został udostępniony
          await this.processRefund(dispute.transaction.id, dispute.id);
          
          // Aktualizuj status sporu
          await supabase
            .from('disputes')
            .update({
              status: 'resolved',
              resolution_note: 'Automatyczne rozwiązanie: brak udostępnionych instrukcji dostępu.',
              refund_status: 'completed',
              refund_amount: dispute.transaction.amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', dispute.id);
          
          return { 
            resolved: true, 
            resolution: 'refunded',
            reason: 'No access instructions provided' 
          };
        }
        
        // Jeśli dostęp był udostępniony, ale minęło mniej niż 24h
        const accessTime = new Date(purchase.access_provided_at).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceAccess = (currentTime - accessTime) / (1000 * 60 * 60);
        
        if (hoursSinceAccess < 24) {
          // Jeszcze za wcześnie na automatyczne rozwiązanie
          return { 
            resolved: false, 
            reason: 'Waiting for seller response',
            waitingTimeHours: 24 - hoursSinceAccess
          };
        }
        
        // Jeśli minęło więcej niż 24h bez odpowiedzi sprzedającego, automatyczny zwrot
        await this.processRefund(dispute.transaction.id, dispute.id);
        
        await supabase
          .from('disputes')
          .update({
            status: 'resolved',
            resolution_note: 'Automatyczne rozwiązanie: brak odpowiedzi sprzedającego w ciągu 24 godzin.',
            refund_status: 'completed',
            refund_amount: dispute.transaction.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', dispute.id);
        
        return { 
          resolved: true, 
          resolution: 'refunded',
          reason: 'Seller did not respond within 24 hours' 
        };
      }
      
      // Inne typy sporów wymagają manualnej interwencji
      return { resolved: false, reason: 'Requires manual review' };
    }
    
    async processRefund(transactionId, disputeId) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      // W rzeczywistej implementacji: integracja z API bramki płatności
      // Symulacja zwrotu płatności
      await supabase
        .from('transactions')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);
      
      // Aktualizuj dostępność miejsc
      await supabase
        .from('group_subs')
        .update({
          slots_available: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.group_sub_id);
      
      // Powiadomienia dla kupującego i sprzedającego
      await createNotification(
        transaction.buyer_id,
        'refund_processed',
        'Zwrot płatności został przetworzony',
        'Twoja płatność została zwrócona w związku ze zgłoszonym problemem.',
        'dispute',
        disputeId
      );
      
      await createNotification(
        transaction.seller_id,
        'refund_processed',
        'Dokonano zwrotu płatności',
        'Płatność została zwrócona kupującemu w związku ze zgłoszonym problemem.',
        'dispute',
        disputeId
      );
    }
  }