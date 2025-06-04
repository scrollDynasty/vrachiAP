package com.vrachiapp.doctor.presentation.navigation

import androidx.navigation.NamedNavArgument
import androidx.navigation.NavType
import androidx.navigation.navArgument

sealed class Screen(
    val route: String,
    val arguments: List<NamedNavArgument> = emptyList()
) {
    
    object Splash : Screen("splash")
    
    object Auth : Screen("auth")
    
    object Home : Screen("home")
    
    object SearchDoctors : Screen("search_doctors")
    
    object DoctorProfile : Screen(
        route = "doctor_profile/{doctorId}",
        arguments = listOf(
            navArgument("doctorId") {
                type = NavType.StringType
            }
        )
    ) {
        fun createRoute(doctorId: String) = "doctor_profile/$doctorId"
    }
    
    object Profile : Screen("profile")
    
    object History : Screen("history")
    
    object Consultation : Screen(
        route = "consultation/{consultationId}",
        arguments = listOf(
            navArgument("consultationId") {
                type = NavType.StringType
            }
        )
    ) {
        fun createRoute(consultationId: String) = "consultation/$consultationId"
    }
} 