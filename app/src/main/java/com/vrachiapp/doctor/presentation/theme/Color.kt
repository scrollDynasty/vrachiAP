package com.vrachiapp.doctor.presentation.theme

import androidx.compose.ui.graphics.Color

// Primary colors from frontend (#3b82f6)
val Primary = Color(0xFF3B82F6) // --color-primary
val PrimaryLight = Color(0xFF93C5FD) // --color-primary-light
val PrimaryDark = Color(0xFF1D4ED8) // --color-primary-dark

// Secondary colors from frontend
val Secondary = Color(0xFF64748B) // --color-secondary  
val Accent = Color(0xFF6366F1) // Similar to indigo from frontend

// Status colors from frontend
val Success = Color(0xFF22C55E) // --color-success
val Warning = Color(0xFFF59E0B) // --color-warning
val Error = Color(0xFFEF4444) // --color-danger
val Info = Color(0xFF06B6D4) // --color-info

// Gray scale from frontend Tailwind config
val Gray50 = Color(0xFFF8FAFC) // --color-gray-50
val Gray100 = Color(0xFFF1F5F9) // --color-gray-100
val Gray200 = Color(0xFFE2E8F0) // --color-gray-200
val Gray300 = Color(0xFFCBD5E1) // --color-gray-300
val Gray400 = Color(0xFF94A3B8) // --color-gray-400
val Gray500 = Color(0xFF64748B) // --color-gray-500
val Gray600 = Color(0xFF475569) // --color-gray-600
val Gray700 = Color(0xFF334155) // --color-gray-700
val Gray800 = Color(0xFF1E293B) // --color-gray-800
val Gray900 = Color(0xFF0F172A) // --color-gray-900

// Text colors from frontend
val TextPrimary = Gray800 // --color-gray-800
val TextSecondary = Gray500 // --color-gray-500
val TextLight = Gray400 // --color-gray-400

// Background colors from frontend
val Background = Color(0xFFFFFFFF) // --color-white
val Surface = Color(0xFFFFFFFF) // --color-white  
val SurfaceVariant = Gray50 // --color-gray-50

// Gradient colors for animations
val GradientBlueStart = Primary
val GradientBlueMid = Color(0xFF60A5FA)
val GradientBlueEnd = PrimaryLight

val GradientIndigoStart = Color(0xFF4F46E5)
val GradientIndigoEnd = Color(0xFF6366F1)

val GradientPurpleStart = Color(0xFF7C3AED)
val GradientPurpleEnd = Color(0xFFA855F7)

// Card and component colors
val CardBackground = Color(0xFFFFFFFF)
val CardBorder = Gray200
val Divider = Gray200

// Special colors for medical theme
val MedicalBlue = Color(0xFF0891B2) // --color-medical-blue
val MedicalGreen = Color(0xFF059669) // --color-medical-green
val MedicalRed = Error // --color-medical-red

// Нейтральные цвета
val MedicalGray50 = Color(0xFFF9FAFB)
val MedicalGray100 = Color(0xFFF3F4F6)
val MedicalGray200 = Color(0xFFE5E7EB)
val MedicalGray300 = Color(0xFFD1D5DB)
val MedicalGray400 = Color(0xFF9CA3AF)
val MedicalGray500 = Color(0xFF6B7280)
val MedicalGray600 = Color(0xFF4B5563)
val MedicalGray700 = Color(0xFF374151)
val MedicalGray800 = Color(0xFF1F2937)
val MedicalGray900 = Color(0xFF111827)

// Градиентные цвета
val GradientStartLight = Color(0xFFEBF8FF) // from-blue-50
val GradientEndLight = Color(0xFFFEFEFE) // to-white
val GradientStart = Color(0xFFEBF4FF) // from-blue-100/40  
val GradientEnd = Color(0xFFE0E7FF) // to-indigo-100/40

// Цвета для различных состояний
val SuccessColor = MedicalGreen
val ErrorColor = MedicalRed
val WarningColor = Color(0xFFEA580C) // Оранжевый для предупреждений
val InfoColor = MedicalBlue

// Цвета фона
val BackgroundPrimary = Color(0xFFFFFFFF)
val BackgroundSecondary = MedicalGray50
val BackgroundTertiary = MedicalGray100

// Цвета поверхностей
val SurfacePrimary = Color(0xFFFFFFFF)
val SurfaceSecondary = MedicalGray50
val SurfaceElevated = Color(0xFFFFFFFF)

// Цвета для карточек врачей и консультаций
val DoctorCardBackground = Color(0xFFFFFFFF)
val ConsultationActiveColor = MedicalGreen
val ConsultationPendingColor = Color(0xFFEA580C)
val ConsultationCompletedColor = MedicalGray400 