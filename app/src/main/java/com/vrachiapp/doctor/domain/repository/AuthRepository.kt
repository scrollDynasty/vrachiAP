package com.vrachiapp.doctor.domain.repository

import com.vrachiapp.doctor.domain.model.AuthResponse

interface AuthRepository {
    
    suspend fun login(email: String, password: String): Result<AuthResponse>
    
    suspend fun register(
        name: String, 
        email: String, 
        password: String, 
        role: String,
        phone: String = "",
        address: String = "",
        district: String = "",
        medicalInfo: String = ""
    ): Result<AuthResponse>
    
    suspend fun loginWithGoogle(): Result<AuthResponse>
    
    suspend fun logout(): Result<Unit>
    
    suspend fun verifyEmail(email: String, code: String): Result<Unit>
    
    suspend fun resendVerificationEmail(email: String): Result<Unit>
    
    suspend fun refreshToken(): Result<AuthResponse>
    
    suspend fun getCurrentUser(): Result<AuthResponse>
    
    suspend fun saveToken(token: String)
    
    suspend fun getSavedToken(): String?
    
    suspend fun clearToken()
} 