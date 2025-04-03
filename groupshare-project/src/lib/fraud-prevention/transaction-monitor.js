// src/lib/fraud-prevention/transaction-monitor.js
export class TransactionMonitor {
    async checkTransaction(userId, transactionData) {
      const riskScore = await this.calculateRiskScore(userId, transactionData);
      
      if (riskScore > 80) {
        // Wysoki poziom ryzyka - wymaga manualnej weryfikacji
        await this.flagForManualReview(transactionData.id, 'high_risk', riskScore);
        return { approved: false, requiresReview: true, riskScore };
      }
      
      if (riskScore > 50) {
        // Średni poziom ryzyka - wprowadź dodatkową weryfikację
        await this.addAdditionalVerification(transactionData.id, userId);
        return { approved: true, requiresVerification: true, riskScore };
      }
      
      // Niski poziom ryzyka - zatwierdzenie automatyczne
      return { approved: true, riskScore };
    }
    
    async calculateRiskScore(userId, transactionData) {
      // Pobierz historię użytkownika
      const { data: userHistory } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Pobierz historię transakcji
      const { data: transactionHistory } = await supabase
        .from('transactions')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Pobierz oceny użytkownika
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('rating_avg, rating_count, verification_level')
        .eq('id', userId)
        .single();
      
      // Oblicz czynniki ryzyka
      let riskScore = 50; // Podstawowy poziom
      
      // Zmniejsz ryzyko dla zweryfikowanych użytkowników
      if (userProfile.verification_level === 'verified') riskScore -= 15;
      if (userProfile.verification_level === 'trusted') riskScore -= 30;
      
      // Zmniejsz ryzyko dla użytkowników z dobrymi ocenami
      if (userProfile.rating_count > 5 && userProfile.rating_avg > 4.5) riskScore -= 10;
      if (userProfile.rating_count > 20) riskScore -= 10;
      
      // Zwiększ ryzyko dla nowych kont bez historii
      if (!transactionHistory || transactionHistory.length === 0) riskScore += 15;
      
      // Zwiększ ryzyko dla transakcji o wysokiej wartości
      if (transactionData.amount > 100) riskScore += 10;
      if (transactionData.amount > 500) riskScore += 20;
      
      // Sprawdź podejrzane zachowania w historii
      const recentFailedAttempts = userHistory.filter(
        log => log.action_type === 'access_attempt' && log.status === 'failure'
      ).length;
      
      if (recentFailedAttempts > 3) riskScore += 25;
      
      return Math.min(Math.max(riskScore, 0), 100); // Ograniczenie do 0-100
    }
    
    async flagForManualReview(transactionId, reason, riskScore) {
      await supabase
        .from('transaction_reviews')
        .insert({
          transaction_id: transactionId,
          reason,
          risk_score: riskScore,
          status: 'pending',
          created_at: new Date().toISOString()
        });
    }
    
    async addAdditionalVerification(transactionId, userId) {
      // Logika dodatkowej weryfikacji (np. SMS, email)
      // W przykładzie: po prostu dodajemy flagę
      await supabase
        .from('transactions')
        .update({
          requires_verification: true
        })
        .eq('id', transactionId);
    }
  }