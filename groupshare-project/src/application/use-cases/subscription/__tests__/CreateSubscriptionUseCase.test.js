// src/application/use-cases/subscription/__tests__/CreateSubscriptionUseCase.test.js

import { 
    CreateSubscriptionUseCase, 
    CreateSubscriptionRequestDTO 
  } from '../CreateSubscriptionUseCase';
  import { AuthorizationException, ValidationException } from '../../../exceptions';
  
  describe('CreateSubscriptionUseCase', () => {
    // Mocki repozytoriów i serwisów
    const mockSubscriptionRepository = {
      save: jest.fn(),
      findById: jest.fn()
    };
    
    const mockGroupRepository = {
      findById: jest.fn()
    };
    
    const mockPlatformRepository = {
      findById: jest.fn()
    };
    
    const mockAuthorizationService = {
      hasGroupPermission: jest.fn()
    };
    
    const mockAccessInstructionService = {
      saveAccessInstructions: jest.fn()
    };
    
    // Instancja przypadku użycia
    let useCase;
    
    // Domyślne żądanie
    let requestDTO;
    
    beforeEach(() => {
      // Resetuj mocki
      jest.clearAllMocks();
      
      // Utwórz przypadek użycia
      useCase = new CreateSubscriptionUseCase(
        mockSubscriptionRepository,
        mockGroupRepository,
        mockPlatformRepository,
        mockAuthorizationService,
        mockAccessInstructionService
      );
      
      // Utwórz domyślne żądanie
      requestDTO = new CreateSubscriptionRequestDTO();
      requestDTO.groupId = 'group-123';
      requestDTO.platformId = 'platform-456';
      requestDTO.slotsTotal = 5;
      requestDTO.pricePerSlot = 10;
      requestDTO.currency = 'PLN';
      requestDTO.accessInstructions = 'Login: test, Password: 123456';
      requestDTO.userId = 'user-789';
      
      // Domyślne ustawienia mocków
      mockAuthorizationService.hasGroupPermission.mockResolvedValue(true);
      mockGroupRepository.findById.mockResolvedValue({ 
        id: 'group-123', 
        name: 'Test Group',
        ownerId: 'user-789'
      });
      mockPlatformRepository.findById.mockResolvedValue({ 
        id: 'platform-456', 
        name: 'Netflix' 
      });
      mockSubscriptionRepository.save.mockImplementation(subscription => {
        return { ...subscription, id: 'subscription-123' };
      });
    });
    
    test('powinien utworzyć subskrypcję gdy dane są poprawne', async () => {
      // Wykonaj przypadek użycia
      const result = await useCase.execute(requestDTO);
      
      // Sprawdź czy repozytoria i serwisy zostały wywołane
      expect(mockAuthorizationService.hasGroupPermission).toHaveBeenCalledWith(
        'user-789',
        'group-123',
        'admin'
      );
      
      expect(mockGroupRepository.findById).toHaveBeenCalledWith('group-123');
      expect(mockPlatformRepository.findById).toHaveBeenCalledWith('platform-456');
      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
      expect(mockAccessInstructionService.saveAccessInstructions).toHaveBeenCalled();
      
      // Sprawdź rezultat
      expect(result).toBeDefined();
      expect(result.id).toBe('subscription-123');
      expect(result.groupId).toBe('group-123');
      expect(result.platformId).toBe('platform-456');
      expect(result.slotsTotal).toBe(5);
      expect(result.slotsAvailable).toBe(5);
      expect(result.pricePerSlot).toBe(10);
      expect(result.currency).toBe('PLN');
    });
    
    test('powinien zgłosić błąd walidacji gdy dane są niepoprawne', async () => {
      // Przygotuj niepoprawne dane
      requestDTO.slotsTotal = -1;
      requestDTO.pricePerSlot = 0;
      requestDTO.accessInstructions = '';
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(ValidationException);
      
      // Sprawdź czy repozytoria nie zostały wywołane
      expect(mockSubscriptionRepository.save).not.toHaveBeenCalled();
      expect(mockAccessInstructionService.saveAccessInstructions).not.toHaveBeenCalled();
    });
    
    test('powinien zgłosić błąd autoryzacji gdy użytkownik nie ma uprawnień', async () => {
      // Przygotuj brak uprawnień
      mockAuthorizationService.hasGroupPermission.mockResolvedValue(false);
      
      // Sprawdź czy zgłaszany jest błąd
      await expect(useCase.execute(requestDTO)).rejects.toThrow(AuthorizationException);
      
      // Sprawdź czy repozytoria nie zostały wywołane
      expect(mockSubscriptionRepository.save).not.toHaveBeenCalled();
      expect(mockAccessInstructionService.saveAccessInstructions).not.toHaveBeenCalled();
    });
  });