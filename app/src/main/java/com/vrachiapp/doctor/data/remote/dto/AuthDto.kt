package com.vrachiapp.doctor.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.vrachiapp.doctor.domain.model.User
import com.vrachiapp.doctor.domain.model.UserRole

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
)

data class AuthRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String,
    val role: String = "patient" // по умолчанию пациент
)

data class AuthResponse(
    val token: String,
    val user: UserDto,
    @SerializedName("needs_profile_update")
    val needsProfileUpdate: Boolean = false
)

data class UserDto(
    val id: String,
    val email: String,
    val name: String?,
    val role: String,
    @SerializedName("avatar_path")
    val avatarPath: String? = null,
    val phone: String? = null,
    @SerializedName("date_of_birth")
    val dateOfBirth: String? = null,
    val gender: String? = null,
    @SerializedName("is_email_verified")
    val isEmailVerified: Boolean = false,
    @SerializedName("created_at")
    val createdAt: String? = null,
    @SerializedName("updated_at")
    val updatedAt: String? = null
)

// Маппер для преобразования DTO в domain модель
fun UserDto.toDomain(): User {
    val userRole = when (role.lowercase()) {
        "doctor" -> UserRole.DOCTOR
        "admin" -> UserRole.ADMIN
        else -> UserRole.PATIENT
    }
    
    return User(
        id = id,
        email = email,
        name = name,
        role = userRole,
        avatar_path = avatarPath,
        phone = phone,
        dateOfBirth = dateOfBirth,
        gender = gender,
        isEmailVerified = isEmailVerified,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
} 