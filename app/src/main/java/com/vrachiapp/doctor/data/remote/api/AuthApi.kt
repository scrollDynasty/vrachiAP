package com.vrachiapp.doctor.data.remote.api

import com.vrachiapp.doctor.data.remote.dto.AuthRequest
import com.vrachiapp.doctor.data.remote.dto.AuthResponse
import com.vrachiapp.doctor.data.remote.dto.RegisterRequest
import com.vrachiapp.doctor.data.remote.dto.ApiResponse
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {
    
    @POST("auth/login")
    suspend fun login(@Body request: AuthRequest): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponse>>
    
    @POST("auth/logout")
    suspend fun logout(@Header("Authorization") token: String): Response<ApiResponse<Unit>>
    
    @POST("auth/verify-email")
    suspend fun verifyEmail(
        @Body request: Map<String, String>
    ): Response<ApiResponse<Unit>>
    
    @POST("auth/resend-verification")
    suspend fun resendVerification(
        @Body request: Map<String, String>
    ): Response<ApiResponse<Unit>>
    
    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Header("Authorization") token: String
    ): Response<ApiResponse<AuthResponse>>
    
    @GET("auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<ApiResponse<AuthResponse>>
} 