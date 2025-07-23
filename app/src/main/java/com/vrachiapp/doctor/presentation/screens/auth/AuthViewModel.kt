package com.vrachiapp.doctor.presentation.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vrachiapp.doctor.domain.model.User
import com.vrachiapp.doctor.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: User? = null,
    val token: String? = null,
    val error: String? = null,
    val needsProfileUpdate: Boolean = false,
    val pendingVerificationEmail: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    init {
        // Проверяем сохраненную аутентификацию при запуске
        checkSavedAuth()
    }
    
    fun login(email: String, password: String, rememberMe: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = authRepository.login(email, password)
                result.fold(
                    onSuccess = { authResponse ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = authResponse.user,
                            token = authResponse.token,
                            needsProfileUpdate = authResponse.needsProfileUpdate,
                            error = null
                        )
                        
                        // Сохраняем токен если пользователь выбрал "Запомнить меня"
                        if (rememberMe) {
                            authRepository.saveToken(authResponse.token)
                        }
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "Произошла ошибка при входе"
                        )
                    }
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Ошибка сети. Проверьте подключение к интернету"
                )
            }
        }
    }
    
    fun register(
        name: String, 
        email: String, 
        password: String, 
        role: String,
        phone: String = "",
        address: String = "",
        district: String = "",
        medicalInfo: String = ""
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = authRepository.register(
                    name = name,
                    email = email,
                    password = password,
                    role = role,
                    phone = phone,
                    address = address,
                    district = district,
                    medicalInfo = medicalInfo
                )
                result.fold(
                    onSuccess = { authResponse ->
                        if (role == "doctor") {
                            // Для врачей показываем сообщение о необходимости ожидания одобрения
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = null,
                                pendingVerificationEmail = email
                            )
                        } else {
                            // Для пациентов сразу аутентифицируем
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                isAuthenticated = true,
                                user = authResponse.user,
                                token = authResponse.token,
                                needsProfileUpdate = authResponse.needsProfileUpdate,
                                error = null
                            )
                            
                            // Сохраняем токен
                            authRepository.saveToken(authResponse.token)
                        }
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "Произошла ошибка при регистрации"
                        )
                    }
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Ошибка сети. Проверьте подключение к интернету"
                )
            }
        }
    }
    
    fun loginWithGoogle() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = authRepository.loginWithGoogle()
                result.fold(
                    onSuccess = { authResponse ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            isAuthenticated = true,
                            user = authResponse.user,
                            token = authResponse.token,
                            needsProfileUpdate = authResponse.needsProfileUpdate,
                            error = null
                        )
                        
                        // Сохраняем токен
                        authRepository.saveToken(authResponse.token)
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "Произошла ошибка при входе через Google"
                        )
                    }
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Ошибка сети. Проверьте подключение к интернету"
                )
            }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            try {
                authRepository.logout()
            } catch (e: Exception) {
                // Игнорируем ошибки при выходе
            } finally {
                _uiState.value = AuthUiState() // Сбрасываем состояние
            }
        }
    }
    
    fun verifyEmail(verificationCode: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = authRepository.verifyEmail(
                    email = _uiState.value.pendingVerificationEmail ?: "",
                    code = verificationCode
                )
                result.fold(
                    onSuccess = {
                        // После верификации email получаем текущего пользователя
                        getCurrentUser()
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "Неверный код подтверждения"
                        )
                    }
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Ошибка сети. Проверьте подключение к интернету"
                )
            }
        }
    }
    
    fun resendVerificationEmail() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = authRepository.resendVerificationEmail(
                    _uiState.value.pendingVerificationEmail ?: ""
                )
                result.fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = null
                        )
                        // Показываем toast с сообщением об успешной отправке
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = exception.message ?: "Не удалось отправить код повторно"
                        )
                    }
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Ошибка сети. Проверьте подключение к интернету"
                )
            }
        }
    }
    
    private fun checkSavedAuth() {
        viewModelScope.launch {
            try {
                val savedToken = authRepository.getSavedToken()
                if (savedToken != null) {
                    _uiState.value = _uiState.value.copy(isLoading = true)
                    getCurrentUser()
                }
            } catch (e: Exception) {
                // Если не удалось проверить сохраненную аутентификацию, просто игнорируем
            }
        }
    }
    
    private suspend fun getCurrentUser() {
        try {
            val result = authRepository.getCurrentUser()
            result.fold(
                onSuccess = { authResponse ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        user = authResponse.user,
                        token = authResponse.token,
                        needsProfileUpdate = authResponse.needsProfileUpdate,
                        error = null,
                        pendingVerificationEmail = null
                    )
                },
                onFailure = {
                    // Токен недействителен, очищаем его
                    authRepository.clearToken()
                    _uiState.value = AuthUiState()
                }
            )
        } catch (e: Exception) {
            // Ошибка сети или другая ошибка
            authRepository.clearToken()
            _uiState.value = AuthUiState()
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun updateProfileCompleted() {
        _uiState.value = _uiState.value.copy(needsProfileUpdate = false)
    }
} 