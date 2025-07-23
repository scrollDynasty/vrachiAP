package com.vrachiapp.doctor.data.repository

import com.vrachiapp.doctor.domain.model.AuthResponse
import com.vrachiapp.doctor.domain.model.User
import com.vrachiapp.doctor.domain.model.UserRole
import com.vrachiapp.doctor.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor() : AuthRepository {
    
    // Временная реализация для сборки приложения
    // TODO: Заменить на реальную реализацию с API
    
    override suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            // Временная заглушка
            val user = User(
                id = "1",
                email = email,
                name = "Test User",
                role = UserRole.PATIENT
            )
            Result.success(AuthResponse("test_token", user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun register(
        name: String, 
        email: String, 
        password: String, 
        role: String,
        phone: String,
        address: String,
        district: String,
        medicalInfo: String
    ): Result<AuthResponse> {
        return try {
            // Временная заглушка с использованием всех переданных данных
            val userRole = if (role == "doctor") UserRole.DOCTOR else UserRole.PATIENT
            val user = User(
                id = "1",
                email = email,
                name = name,
                role = userRole,
                phone = phone.takeIf { it.isNotBlank() },
                // Дополнительные поля сохраняются в реальной реализации API
                // Пока только логируем их для отладки
            )
            
            // Логируем дополнительные данные для отладки
            println("Register data - address: $address, district: $district, medicalInfo: $medicalInfo")
            
            Result.success(AuthResponse("test_token", user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun loginWithGoogle(): Result<AuthResponse> {
        return try {
            // Временная заглушка
            val user = User(
                id = "1",
                email = "google@test.com",
                name = "Google User",
                role = UserRole.PATIENT
            )
            Result.success(AuthResponse("test_token", user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun logout(): Result<Unit> {
        return Result.success(Unit)
    }
    
    override suspend fun verifyEmail(email: String, code: String): Result<Unit> {
        return Result.success(Unit)
    }
    
    override suspend fun resendVerificationEmail(email: String): Result<Unit> {
        return Result.success(Unit)
    }
    
    override suspend fun refreshToken(): Result<AuthResponse> {
        return try {
            val user = User(
                id = "1",
                email = "test@test.com",
                name = "Test User",
                role = UserRole.PATIENT
            )
            Result.success(AuthResponse("test_token", user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getCurrentUser(): Result<AuthResponse> {
        return try {
            val user = User(
                id = "1",
                email = "test@test.com",
                name = "Test User",
                role = UserRole.PATIENT
            )
            Result.success(AuthResponse("test_token", user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun saveToken(token: String) {
        // TODO: Сохранить токен в DataStore
    }
    
    override suspend fun getSavedToken(): String? {
        // TODO: Получить токен из DataStore
        return null
    }
    
    override suspend fun clearToken() {
        // TODO: Очистить токен из DataStore
    }
} 