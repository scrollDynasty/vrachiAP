package com.vrachiapp.doctor.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = PrimaryLight,
    onPrimaryContainer = PrimaryDark,
    
    secondary = Secondary,
    onSecondary = Color.White,
    secondaryContainer = Gray100,
    onSecondaryContainer = Gray800,
    
    tertiary = Accent,
    onTertiary = Color.White,
    tertiaryContainer = Gray50,
    onTertiaryContainer = Gray900,
    
    error = Error,
    onError = Color.White,
    errorContainer = Color(0xFFFFEDED),
    onErrorContainer = Color(0xFF7F1D1D),
    
    background = Background,
    onBackground = TextPrimary,
    
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = TextSecondary,
    
    outline = Gray300,
    outlineVariant = Gray200,
    
    scrim = Color(0x80000000)
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryLight,
    onPrimary = Gray900,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = Gray50,
    
    secondary = Primary,
    onSecondary = Gray900,
    secondaryContainer = Gray800,
    onSecondaryContainer = Gray100,
    
    tertiary = Accent,
    onTertiary = Gray900,
    tertiaryContainer = Gray700,
    onTertiaryContainer = Gray50,
    
    error = Color(0xFFFF6B6B),
    onError = Gray900,
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFFEDED),
    
    background = Gray900,
    onBackground = Gray50,
    
    surface = Gray800,
    onSurface = Gray50,
    surfaceVariant = Gray700,
    onSurfaceVariant = Gray300,
    
    outline = Gray600,
    outlineVariant = Gray700,
    
    scrim = Color(0x80000000)
)

@Composable
fun VrachiAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false, // Отключаем для медицинского приложения
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
} 