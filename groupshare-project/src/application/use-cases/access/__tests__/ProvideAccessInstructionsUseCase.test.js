// src/application/use-cases/access/__tests__/ProvideAccessInstructionsUseCase.test.js

import { 
    ProvideAccessInstructionsUseCase, 
    ProvideAccessInstructionsRequestDTO 
  } from '../ProvideAccessInstructionsUseCase';
  import { 
    AuthorizationException, 
    ResourceNotFoundException,
    BusinessRuleViolationException
  } from '../../../exceptions';
  
  describe('ProvideAccessInstructionsUseCase', () => {
    // Mocki repozytoriów i serwisów
    const mockPurchaseRepository = {
      findById: jest.fn()
    };
    
    const mockAccessInstructionService = {
      getAccessInstructionsForPurchase: jest.fn()
    };
    
    const mockTokenService = {
      verifyAccessToken: jest.fn(),
      markTokenAsUsed: jest.fn()
    };
    
    const mockAuthorizationService = {
      hasPurchasePermission: jest.fn()
    };
    
    // Dodatkowe mocki
    const mockSubscriptionRepository = {
      findById: jest.fn()
    };
    
    const mockPlatformRepository = {
      findById: jest.fn()
    };
    
    const mockGroupRepository = {
      findById: jest.fn()
    };
    
    const mockUserRepository = {
      findById: jest.fn()
    };
    
    // Instancja przypadku użycia
    let useCase;
    
    // Domyślne żądanie
    let requestDTO;
    
    beforeEach(() => {
      // Resetuj mocki
      jest.clearAllMocks();
      
      // Utwórz przypadek użycia
      useCase = new ProvideAccessInstructionsUseCase(
        mockPurchaseRepository,
        mockAccessInstructionService,
        mockTokenService,
        mockAuthorizationService
      );
      
      // Dodaj dodatkowe zależności
      useCase.subscriptionRepository = mockSubscriptionRepository;
      useCase.platformRepository = mockPlatformRepository;
      useCase.groupRepository = mockGroupRepository;
      useCase.userRepository = mockUserRepository;
      
      // Utwórz domyślne żądanie
      requestDTO = new ProvideAccessInstructionsRequestDTO();
      requestDTO.purchaseId = 'purchase-123';
      requestDTO.userId = 'user-456';
      requestDTO.token = null;
      
      // Domyślne ustawienia mocków
      mockAuthorizationService.hasPurchasePermission.mockResolvedValue(true);
      
      mockPurchaseRepository.findById.mockResolvedValue({
        id: 'purchase-123',
        userId: 'user-456',
        subscriptionId: 'subscription-789',
        status: { toString: () => 'completed' },
        accessProvided: true,
        accessConfirmed: false,
        confirmAccess: jest.fn(),
        createdAt: new Date()
      });
      
      mockSubscriptionRepository.findById.mockResolvedValue({
        id: 'subscription-789',
        groupId: 'group-111',
        platformId: 'platform-222'
      });
      
      mockPlatformRepository.findById.mockResolvedValue({
        id: 'platform-222',
        name: 'Netflix'
      });
      
      mockGroupRepository.findById.mockResolvedValue({
        id: 'group-111',
        ownerId: 'user-333'
      });
      
      mockUserRepository.findById.mockResolvedValue({
        id: 'user-333',
        displayName: 'Owner',
        email: 'owner@example.com'
      });
      
      mockAccessInstructionService.getAccessInstructionsForPurchase.mockResolvedValue(
        'Login: test@example.com, Password: secure123'
      );
    });
    
    test('powinien zwrócić instrukcje dostępu dla zalogowanego użytkownika', async () => {
      // Wykonaj przypadek użycia
      const result = await useCase.execute(requestDTO);
      
      // Sprawdź czy serwisy zostały wywołane
      expect(mockAuthorizationService.hasPurchasePermission).toHaveBeenCalledWith(
        'user-456',
        'purchase-123'
      );
      
      expect(mockPurchaseRepository.findById).toHaveBeenCalledWith('purchase-123');
      expect(mockAccessInstructionService.getAccessInstructionsForPurchase).toHaveBeenCalledWith('purchase-123');
      
      // Sprawdź rezultat
      expect(result).toBeDefined();
      expect(result.purchaseId).toBe('purchase-123');
      expect(result.platform).toBe('Netflix');
      expect(result.instructions).toBe('Login: test@example.com, Password: secure123');
      expect(result.ownerContact).toEqual({
        displayName: 'Owner',
        email: 'owner@example.com'
      });
      expect(result.hasInstructions).toBe(true);
    });
    
    test('powinien zwrócić instrukcje dostępu dla tokenu', async () => {
      // Przygotuj dane dla tokenu
      requestDTO.userId = null;
      requestDTO.token = 'valid-token';
      
      mockTokenService.verifyAccessToken.mockResolvedValue({
        id: 'token-123',
        purchaseId: 'purchase-123'
      });
      
      // Wykonaj przypadek użycia
      const result = await useCase.execute(requestDTO);
      
      // Sprawdź czy serwisy zostały wywołane
      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('purchase-123', 'valid-token');
      expect(mockTokenService.markTokenAsUsed).toHaveBeenCalled();
      expect(mockAuthorizationService.hasPurchasePermission).not.toHaveBeenCalled();
      
      // Sprawdź rezultat
      expect(result).toBeDefined();
      expect(result.instructions).toBe('Login: test@example.com, Password: secure123');
    });
    
    test('powinien zgłosić błąd gdy zakup nie istnieje', async () => {
      // Przygotuj brak zakupu
      mockPurchaseRepository.findById.mockResolvedValue(null);
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(ResourceNotFoundException);
    });
    
    test('powinien zgłosić błąd gdy zakup nie jest ukończony', async () => {
      // Przygotuj niekompletny zakup
      mockPurchaseRepository.findById.mockResolvedValue({
        ...mockPurchaseRepository.findById(),
        status: { toString: () => 'pending_payment' }
      });
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(BusinessRuleViolationException);
    });
    
    test('powinien zgłosić błąd gdy dostęp nie został przyznany', async () => {
      // Przygotuj brak dostępu
      mockPurchaseRepository.findById.mockResolvedValue({
        ...mockPurchaseRepository.findById(),
        accessProvided: false
      });
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(BusinessRuleViolationException);
    });
    
    test('powinien zgłosić błąd autoryzacji gdy użytkownik nie ma uprawnień', async () => {
      // Przygotuj brak uprawnień
      mockAuthorizationService.hasPurchasePermission.mockResolvedValue(false);
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(AuthorizationException);
    });
  });