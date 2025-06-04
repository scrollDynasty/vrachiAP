package com.vrachiapp.doctor.domain.model

data class AuthResponse(
    val token: String,
    val user: User,
    val needsProfileUpdate: Boolean = false
) 