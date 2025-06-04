package com.vrachiapp.doctor.presentation.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vrachiapp.doctor.R
import com.vrachiapp.doctor.presentation.theme.*
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToHome: () -> Unit
) {
    var startAnimation by remember { mutableStateOf(false) }
    
    // Анимации
    val scaleAnimation by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.5f,
        animationSpec = tween(
            durationMillis = 800,
            easing = FastOutSlowInEasing
        ), label = ""
    )
    
    val alphaAnimation by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(
            durationMillis = 1000,
            delayMillis = 300
        ), label = ""
    )
    
    val rotationAnimation by animateFloatAsState(
        targetValue = if (startAnimation) 360f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 2000,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ), label = ""
    )
    
    LaunchedEffect(key1 = true) {
        startAnimation = true
        delay(3000) // Показываем splash screen 3 секунды
        
        // Здесь должна быть проверка аутентификации
        // Пока просто переходим на экран логина
        onNavigateToLogin()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Primary,
                        GradientBlueMid,
                        PrimaryLight,
                        Color.White
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Иконка медицинского приложения
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(scaleAnimation)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.95f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "🏥",
                    fontSize = 60.sp,
                    modifier = Modifier.rotate(rotationAnimation)
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Название приложения
            Text(
                text = "ВрачиApp",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontSize = 32.sp
                ),
                modifier = Modifier.scale(scaleAnimation)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Описание
            Text(
                text = "Ваше здоровье в надежных руках",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 16.sp
                ),
                modifier = Modifier
                    .scale(scaleAnimation)
                    .padding(horizontal = 32.dp)
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Индикатор загрузки
            if (alphaAnimation > 0.5f) {
                CircularProgressIndicator(
                    modifier = Modifier.size(32.dp),
                    color = Color.White,
                    strokeWidth = 3.dp
                )
            }
        }
        
        // Нижний текст
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 48.dp),
            contentAlignment = Alignment.BottomCenter
        ) {
            Text(
                text = "Медицинские консультации онлайн",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = Color.White.copy(alpha = alphaAnimation)
                )
            )
        }
    }
} 