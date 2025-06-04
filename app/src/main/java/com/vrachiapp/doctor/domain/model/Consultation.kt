package com.vrachiapp.doctor.domain.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class Consultation(
    val id: String,
    val patientId: String,
    val doctorId: String,
    val patientName: String,
    val doctorName: String,
    val doctorSpecialization: String,
    val scheduledAt: String,
    val status: ConsultationStatus,
    val type: ConsultationType,
    val price: Double,
    val duration: Int = 30, // в минутах
    val symptoms: String? = null,
    val diagnosis: String? = null,
    val prescription: String? = null,
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val meetingId: String? = null,
    val rating: Double? = null,
    val review: String? = null
) : Parcelable

enum class ConsultationStatus {
    PENDING,
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    NO_SHOW
}

enum class ConsultationType {
    VIDEO_CALL,
    CHAT,
    PHONE_CALL
}

@Parcelize
data class ChatMessage(
    val id: String,
    val consultationId: String,
    val senderId: String,
    val senderName: String,
    val message: String,
    val timestamp: String,
    val messageType: MessageType = MessageType.TEXT,
    val fileUrl: String? = null,
    val fileName: String? = null
) : Parcelable

enum class MessageType {
    TEXT,
    IMAGE,
    FILE,
    SYSTEM
}

@Parcelize
data class Review(
    val id: String,
    val consultationId: String,
    val patientId: String,
    val doctorId: String,
    val rating: Double,
    val comment: String? = null,
    val createdAt: String
) : Parcelable 