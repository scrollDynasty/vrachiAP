package com.vrachiapp.doctor.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.vrachiapp.doctor.presentation.screens.auth.AuthScreen
import com.vrachiapp.doctor.presentation.screens.home.HomeScreen
import com.vrachiapp.doctor.presentation.screens.doctors.SearchDoctorsScreen
import com.vrachiapp.doctor.presentation.screens.doctors.DoctorProfileScreen
import com.vrachiapp.doctor.presentation.screens.profile.ProfileScreen
import com.vrachiapp.doctor.presentation.screens.consultation.ConsultationScreen
import com.vrachiapp.doctor.presentation.screens.history.HistoryScreen
import com.vrachiapp.doctor.presentation.screens.splash.SplashScreen

@Composable
fun VrachiNavigation(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route,
        modifier = modifier
    ) {
        // Splash Screen
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Authentication Screen (объединенная форма входа и регистрации)
        composable(Screen.Auth.route) {
            AuthScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Main App Screens
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToSearchDoctors = {
                    navController.navigate(Screen.SearchDoctors.route)
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToHistory = {
                    navController.navigate(Screen.History.route)
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.SearchDoctors.route) {
            SearchDoctorsScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToDoctorProfile = { doctorId ->
                    navController.navigate(Screen.DoctorProfile.createRoute(doctorId))
                }
            )
        }
        
        composable(
            route = Screen.DoctorProfile.route,
            arguments = Screen.DoctorProfile.arguments
        ) { backStackEntry ->
            val doctorId = backStackEntry.arguments?.getString("doctorId") ?: ""
            DoctorProfileScreen(
                doctorId = doctorId,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToConsultation = { consultationId ->
                    navController.navigate(Screen.Consultation.createRoute(consultationId))
                }
            )
        }
        
        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.History.route) {
            HistoryScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToConsultation = { consultationId ->
                    navController.navigate(Screen.Consultation.createRoute(consultationId))
                }
            )
        }
        
        composable(
            route = Screen.Consultation.route,
            arguments = Screen.Consultation.arguments
        ) { backStackEntry ->
            val consultationId = backStackEntry.arguments?.getString("consultationId") ?: ""
            ConsultationScreen(
                consultationId = consultationId,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
} 