package com.vrachiapp.doctor.presentation.screens.doctors

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DoctorProfileScreen(
    doctorId: String,
    onNavigateBack: () -> Unit,
    onNavigateToConsultation: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Профиль врача",
            style = MaterialTheme.typography.headlineMedium
        )
        
        Text(
            text = "ID: $doctorId",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(onClick = onNavigateBack) {
            Text("Назад")
        }
    }
} 