package com.vrachiapp.doctor.domain.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class User(
    val id: String,
    val email: String,
    val name: String?,
    val role: UserRole,
    val avatar_path: String? = null,
    val phone: String? = null,
    val dateOfBirth: String? = null,
    val gender: String? = null,
    val isEmailVerified: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null
) : Parcelable

enum class UserRole {
    PATIENT,
    DOCTOR,
    ADMIN
}

@Parcelize
data class DoctorProfile(
    val userId: String,
    val specialization: String,
    val experience: Int,
    val education: String? = null,
    val certifications: List<String> = emptyList(),
    val languages: List<String> = emptyList(),
    val consultationPrice: Double = 0.0,
    val rating: Double = 0.0,
    val reviewsCount: Int = 0,
    val isAvailable: Boolean = true,
    val bio: String? = null,
    val workingHours: String? = null
) : Parcelable

@Parcelize
data class PatientProfile(
    val userId: String,
    val medicalHistory: String? = null,
    val allergies: List<String> = emptyList(),
    val medications: List<String> = emptyList(),
    val emergencyContact: String? = null
) : Parcelable 