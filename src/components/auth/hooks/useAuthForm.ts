import { useState, useCallback } from 'react';
import { AuthFormState } from '../types';

export const useAuthForm = (isLoginMode: boolean) => {
  const [formState, setFormState] = useState<AuthFormState>({
    email: '',
    password: '',
    username: '',
    acceptTerms: false,
    subscribeNewsletter: false,
    showPassword: false,
  });

  const updateField = useCallback((field: keyof AuthFormState, value: string | boolean) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      email: '',
      password: '',
      username: '',
      acceptTerms: false,
      subscribeNewsletter: false,
      showPassword: false,
    });
  }, []);

  const validateForm = useCallback(() => {
    if (!formState.email.trim()) {
      return 'Email is required';
    }
    if (!formState.password.trim()) {
      return 'Password is required';
    }
    if (!isLoginMode && !formState.username.trim()) {
      return 'Username is required';
    }
    if (!isLoginMode && !formState.acceptTerms) {
      return 'Please accept the terms of service';
    }
    return null;
  }, [formState, isLoginMode]);

  return {
    formState,
    updateField,
    togglePasswordVisibility,
    resetForm,
    validateForm,
  };
};
