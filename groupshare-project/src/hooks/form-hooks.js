// src/hooks/form-hooks.js
'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook do zarządzania stanem formularza z walidacją
 * @param {Object} initialValues - Początkowe wartości formularza
 * @param {Function} validate - Funkcja walidująca, zwraca obiekt z błędami
 * @param {Function} onSubmit - Funkcja wywoływana po pomyślnej walidacji
 * @returns {Object} - Metody i stan formularza
 */
export function useForm(initialValues, validate, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset formularza do wartości początkowych
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  // Ustawienie wszystkich wartości formularza na raz
  const setFormValues = useCallback((newValues) => {
    setValues(newValues);
  }, []);
  
  // Obsługa zmiany wartości pola
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Oznacz pole jako dotknięte
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    // Wyczyść błąd dla tego pola
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [touched, errors]);
  
  // Obsługa ręcznej zmiany wartości
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Oznacz pole jako dotknięte
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    // Wyczyść błąd dla tego pola
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [touched, errors]);
  
  // Obsługa utraty fokusu
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Walidacja pojedynczego pola
    if (validate) {
      const fieldErrors = validate({ [name]: values[name] });
      if (fieldErrors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: fieldErrors[name]
        }));
      }
    }
  }, [values, validate]);
  
  // Obsługa wysłania formularza
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // Oznacz wszystkie pola jako dotknięte
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Walidacja wszystkich pól
    if (validate) {
      const formErrors = validate(values);
      setErrors(formErrors);
      
      // Jeśli są błędy, przerwij submit
      if (Object.keys(formErrors).length > 0) {
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Można tutaj obsłużyć błędy serwera
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFormValues,
    resetForm
  };
}

/**
 * Hook do walidacji formularza na podstawie schematu
 * @param {Object} schema - Schemat walidacji
 * @returns {Function} - Funkcja walidująca
 */
export function useValidationSchema(schema) {
  return useCallback((values) => {
    const errors = {};
    
    // Iteruj po właściwościach schematu
    for (const [field, requirements] of Object.entries(schema)) {
      // Sprawdź, czy pole jest wymagane
      if (requirements.required && 
          (values[field] === undefined || values[field] === null || values[field] === '')) {
        errors[field] = requirements.errorMessage || `To pole jest wymagane`;
        continue; // Przejdź do następnego pola
      }
      
      // Jeśli pole nie ma wartości, ale nie jest wymagane, pomijamy walidację
      if (values[field] === undefined || values[field] === null || values[field] === '') {
        continue;
      }
      
      // Walidacja typu
      if (requirements.type) {
        const expectedType = requirements.type;
        const actualType = typeof values[field];
        
        // Specjalne przypadki
        if (expectedType === 'number' && actualType === 'string') {
          // Próba konwersji string -> number
          if (isNaN(Number(values[field]))) {
            errors[field] = requirements.typeErrorMessage || `To pole musi być liczbą`;
            continue;
          }
        } else if (expectedType !== actualType) {
          errors[field] = requirements.typeErrorMessage || `To pole ma nieprawidłowy format`;
          continue;
        }
      }
      
      // Walidacja dla stringów
      if (typeof values[field] === 'string') {
        // Minimalna długość
        if (requirements.minLength !== undefined && values[field].length < requirements.minLength) {
          errors[field] = requirements.minLengthErrorMessage || 
                         `To pole musi mieć co najmniej ${requirements.minLength} znaków`;
          continue;
        }
        
        // Maksymalna długość
        if (requirements.maxLength !== undefined && values[field].length > requirements.maxLength) {
          errors[field] = requirements.maxLengthErrorMessage || 
                         `To pole może mieć maksymalnie ${requirements.maxLength} znaków`;
          continue;
        }
        
        // Wzorzec regex
        if (requirements.pattern && !requirements.pattern.test(values[field])) {
          errors[field] = requirements.patternErrorMessage || `To pole ma nieprawidłowy format`;
          continue;
        }
      }
      
      // Walidacja dla liczb
      if (typeof values[field] === 'number' || 
         (typeof values[field] === 'string' && !isNaN(Number(values[field])))) {
        const numValue = typeof values[field] === 'string' ? Number(values[field]) : values[field];
        
        // Minimalna wartość
        if (requirements.min !== undefined && numValue < requirements.min) {
          errors[field] = requirements.minErrorMessage || 
                         `Ta wartość musi być większa lub równa ${requirements.min}`;
          continue;
        }
        
        // Maksymalna wartość
        if (requirements.max !== undefined && numValue > requirements.max) {
          errors[field] = requirements.maxErrorMessage || 
                         `Ta wartość musi być mniejsza lub równa ${requirements.max}`;
          continue;
        }
      }
      
      // Walidacja niestandardowa
      if (requirements.validate && typeof requirements.validate === 'function') {
        const customError = requirements.validate(values[field], values);
        if (customError) {
          errors[field] = customError;
          continue;
        }
      }
    }
    
    return errors;
  }, [schema]);
}

/**
 * Hook do zarządzania stanem i zachowaniem formularza wieloetapowego
 * @param {Array} steps - Tablica etapów formularza
 * @param {Function} onComplete - Funkcja wywoływana po zakończeniu wszystkich etapów
 * @returns {Object} - Metody i stan formularza wieloetapowego
 */
export function useMultiStepForm(steps, onComplete) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [formState, setFormState] = useState({
    isSubmitting: false,
    isComplete: false,
    error: null
  });
  
  // Aktualny etap formularza
  const step = steps[currentStep];
  
  // Czy to ostatni etap
  const isLastStep = currentStep === steps.length - 1;
  
  // Przejście do następnego kroku
  const goToNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      return true;
    }
    return false;
  }, [currentStep, steps.length]);
  
  // Przejście do poprzedniego kroku
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      return true;
    }
    return false;
  }, [currentStep]);
  
  // Przejście do konkretnego kroku
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      return true;
    }
    return false;
  }, [steps.length]);
  
  // Aktualizacja danych formularza
  const updateFormData = useCallback((newData) => {
    setFormData(prev => ({
      ...prev,
      ...newData
    }));
  }, []);
  
  // Obsługa wysłania etapu
  const handleStepSubmit = useCallback(async (stepData) => {
    // Aktualizuj dane formularza z bieżącego etapu
    updateFormData(stepData);
    
    // Jeśli to ostatni etap, zakończ formularz
    if (isLastStep) {
      try {
        setFormState(prev => ({ ...prev, isSubmitting: true, error: null }));
        
        // Wywołaj funkcję zakończenia z wszystkimi danymi
        const finalData = {
          ...formData,
          ...stepData
        };
        
        if (onComplete) {
          await onComplete(finalData);
        }
        
        setFormState(prev => ({ ...prev, isComplete: true }));
      } catch (error) {
        console.error('Form completion error:', error);
        setFormState(prev => ({ 
          ...prev, 
          error: error.message || 'Wystąpił błąd podczas przetwarzania formularza' 
        }));
      } finally {
        setFormState(prev => ({ ...prev, isSubmitting: false }));
      }
    } else {
      // Przejdź do następnego kroku
      goToNextStep();
    }
  }, [formData, isLastStep, goToNextStep, onComplete, updateFormData]);
  
  // Reset formularza
  const resetForm = useCallback(() => {
    setCurrentStep(0);
    setFormData({});
    setFormState({
      isSubmitting: false,
      isComplete: false,
      error: null
    });
  }, []);
  
  return {
    currentStep,
    step,
    steps,
    isLastStep,
    formData,
    formState,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateFormData,
    handleStepSubmit,
    resetForm
  };
}

/**
 * Hook do zarządzania stanem filtrów z pamięcią URLa
 * @param {Object} initialFilters - Początkowe filtry
 * @returns {Array} - [filters, setFilter, resetFilters]
 */
export function useFilterState(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  
  // Aktualizacja URL przy zmianie filtrów
  useEffect(() => {
    // Aktualizuj URL tylko jeśli są jakieś filtry
    if (Object.keys(filters).some(key => filters[key] !== undefined && filters[key] !== '')) {
      // Pobierz bieżący URL
      const url = new URL(window.location.href);
      
      // Wyczyść istniejące parametry
      for (const key of url.searchParams.keys()) {
        url.searchParams.delete(key);
      }
      
      // Dodaj parametry filtrów
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '' && value !== null) {
          url.searchParams.set(key, value);
        }
      }
      
      // Zmień URL bez przeładowania strony
      window.history.replaceState({}, '', url.toString());
    } else {
      // Jeśli nie ma filtrów, wyczyść parametry URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [filters]);
  
  // Funkcja do aktualizacji pojedynczego filtra
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  // Funkcja do resetowania wszystkich filtrów
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  
  return [filters, setFilter, resetFilters];
}