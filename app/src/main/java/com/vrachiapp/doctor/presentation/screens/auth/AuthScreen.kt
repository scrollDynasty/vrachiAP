package com.vrachiapp.doctor.presentation.screens.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vrachiapp.doctor.presentation.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    onNavigateToHome: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var currentTab by remember { mutableStateOf("login") }
    
    // Состояния для форм
    var loginEmail by remember { mutableStateOf("") }
    var loginPassword by remember { mutableStateOf("") }
    var loginPasswordVisible by remember { mutableStateOf(false) }
    var rememberMe by remember { mutableStateOf(false) }
    
    var registerName by remember { mutableStateOf("") }
    var registerEmail by remember { mutableStateOf("") }
    var registerPhone by remember { mutableStateOf("") }
    var registerAddress by remember { mutableStateOf("") }
    var registerDistrict by remember { mutableStateOf("") }
    var registerMedicalInfo by remember { mutableStateOf("") }
    var registerPassword by remember { mutableStateOf("") }
    var registerConfirmPassword by remember { mutableStateOf("") }
    var registerPasswordVisible by remember { mutableStateOf(false) }
    var registerConfirmPasswordVisible by remember { mutableStateOf(false) }
    var acceptTerms by remember { mutableStateOf(false) }
    
    val districts = listOf(
        "Алмазарский район", "Бектемирский район", "Мирабадский район",
        "Мирзо-Улугбекский район", "Сергелийский район", "Учтепинский район",
        "Чиланзарский район", "Шайхантаурский район", "Юнусабадский район",
        "Яккасарайский район", "Яшнабадский район"
    )
    var expandedDistrict by remember { mutableStateOf(false) }
    
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            onNavigateToHome()
        }
    }
    
    // Фон точно как во фронтенде: from-blue-50 via-indigo-50 to-purple-50
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0xFFEFF6FF), // blue-50
                        Color(0xFFE0E7FF), // indigo-50
                        Color(0xFFEDE9FE)  // purple-50
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Заголовок точно как во фронтенде
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(bottom = 24.dp)
            ) {
                Text(
                    text = "Soglom",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.headlineLarge.copy(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                Color(0xFF2563EB), // blue-600
                                Color(0xFF4F46E5)  // indigo-600
                            )
                        )
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                
                Text(
                    text = "Медицинская платформа для онлайн-консультаций\nс лучшими специалистами",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Medium,
                        fontSize = 12.sp
                    ),
                    color = Color(0xFF6B7280),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    lineHeight = 20.sp
                )
            }
            
            // Главная Card точно как во фронтенде
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 448.dp) // max-w-md
                    .graphicsLayer {
                        shadowElevation = 32.dp.toPx() // увеличиваю тень
                    },
                colors = CardDefaults.cardColors(
                    containerColor = Color.White.copy(alpha = 0.95f) // увеличиваю прозрачность
                ),
                shape = RoundedCornerShape(16.dp), // увеличиваю скругление
                border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.4f), // усиливаю границу
                            Color.White.copy(alpha = 0.4f)
                        )
                    )
                )
            ) {
                // Анимированная линия вверху как во фронтенде
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp) // немного уменьшаю
                        .background(
                            brush = Brush.horizontalGradient(
                                    colors = listOf(
                                        Color(0xFF3B82F6), // blue-500
                                        Color(0xFF6366F1), // indigo-500  
                                        Color(0xFF8B5CF6), // purple-500
                                        Color(0xFFEC4899)  // pink-500 - добавляю розовый
                                    )
                                )
                        )
                )
                
                Column(
                    modifier = Modifier.padding(32.dp), // px-8 py-8
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar как во фронтенде
                    Box(
                        modifier = Modifier
                            .size(64.dp) // уменьшено с 80dp
                            .clip(RoundedCornerShape(32.dp)) // уменьшено с 40dp
                            .background(
                                brush = Brush.radialGradient( // изменяю на радиальный градиент
                                    colors = listOf(
                                        Color(0xFF3B82F6), // blue-500
                                        Color(0xFF4F46E5), // indigo-600
                                        Color(0xFF7C3AED)  // violet-600 - добавляю фиолетовый
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (currentTab == "login") Icons.Default.Lock else Icons.Default.PersonAdd,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(28.dp) // уменьшено с 32dp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Заголовок
                    Text(
                        text = if (currentTab == "login") "Добро пожаловать!" else "Создайте аккаунт",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.headlineMedium.copy(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFF2563EB), // blue-600
                                    Color(0xFF4F46E5)  // indigo-600
                                )
                            )
                        ),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    
                    Text(
                        text = if (currentTab == "login") 
                            "Войдите в систему для доступа к медицинским консультациям" 
                        else 
                            "Зарегистрируйтесь для получения консультаций от специалистов",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 11.sp,
                            lineHeight = 18.sp
                        ),
                        color = Color(0xFF6B7280), // gray-500
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    
                    // Переключатель вкладок точно как во фронтенде
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        // Кнопка Вход
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Button(
                                onClick = { currentTab = "login" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent,
                                    contentColor = if (currentTab == "login") Primary else Color(0xFF6B7280)
                                ),
                                elevation = null,
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Login,
                                        contentDescription = null,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "Вход",
                                        fontSize = 11.sp,
                                        fontWeight = if (currentTab == "login") FontWeight.Medium else FontWeight.Normal
                                    )
                                }
                            }
                            
                            // Подчеркивание для активной вкладки
                            if (currentTab == "login") {
                                Box(
                                    modifier = Modifier
                                        .width(48.dp) // уменьшено с 60dp
                                        .height(1.5.dp) // уменьшено с 2dp
                                        .background(
                                            brush = Brush.horizontalGradient(
                                                colors = listOf(
                                                    Color(0xFF3B82F6), // blue-500
                                                    Color(0xFF4F46E5)  // indigo-600
                                                )
                                            ),
                                            shape = RoundedCornerShape(1.dp)
                                        )
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.width(24.dp)) // уменьшено с 32dp
                        
                        // Кнопка Регистрация
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Button(
                                onClick = { currentTab = "register" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent,
                                    contentColor = if (currentTab == "register") Primary else Color(0xFF6B7280)
                                ),
                                elevation = null,
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PersonAdd,
                                        contentDescription = null,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "Регистрация",
                                        fontSize = 11.sp,
                                        fontWeight = if (currentTab == "register") FontWeight.Medium else FontWeight.Normal
                                    )
                                }
                            }
                            
                            // Подчеркивание для активной вкладки
                            if (currentTab == "register") {
                                Box(
                                    modifier = Modifier
                                        .width(80.dp) // уменьшено с 100dp
                                        .height(1.5.dp) // уменьшено с 2dp
                                        .background(
                                            brush = Brush.horizontalGradient(
                                                colors = listOf(
                                                    Color(0xFF3B82F6), // blue-500
                                                    Color(0xFF4F46E5)  // indigo-600
                                                )
                                            ),
                                            shape = RoundedCornerShape(1.dp)
                                        )
                                )
                            }
                        }
                    }
                    
                    // Сообщение об ошибке как во фронтенде
                    AnimatedVisibility(visible = uiState.error != null) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 24.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = Color(0xFFFEF2F2) // danger-50
                            ),
                            shape = RoundedCornerShape(12.dp),
                            border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        Color(0xFFFECACA), // danger-200
                                        Color(0xFFFECACA)
                                    )
                                )
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = Color(0xFFEF4444), // danger
                                    modifier = Modifier
                                        .size(16.dp)
                                        .padding(end = 8.dp)
                                )
                                Text(
                                    text = uiState.error ?: "",
                                    color = Color(0xFFEF4444), // danger
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 12.sp
                                    )
                                )
                            }
                        }
                    }
                    
                    // Кнопка Google как во фронтенде
                    OutlinedButton(
                        onClick = { viewModel.loginWithGoogle() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                            .height(36.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFF374151) // gray-700
                        ),
                        border = BorderStroke(1.dp, Color(0xFFD1D5DB)), // gray-300
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(vertical = 0.dp)
                        ) {
                            // Google иконка
                            Box(
                                modifier = Modifier
                                    .size(18.dp)
                                    .clip(RoundedCornerShape(9.dp)) // делаю круглым через RoundedCornerShape
                                    .background(Color.White),
                                contentAlignment = Alignment.Center
                            ) {
                                // Упрощенный Google логотип
                                Text(
                                    text = "G",
                                    color = Color(0xFF4285F4), // Google Blue
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif
                                    )
                                )
                            }
                            Text(
                                text = "Google",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 11.sp
                                )
                            )
                        }
                    }
                    
                    // Разделитель как во фронтенде
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        HorizontalDivider(
                            modifier = Modifier.weight(1f),
                            color = Color(0xFFE5E7EB) // gray-200
                        )
                        Text(
                            text = "или",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF6B7280), // gray-500
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                        HorizontalDivider(
                            modifier = Modifier.weight(1f),
                            color = Color(0xFFE5E7EB) // gray-200
                        )
                    }
                    
                    // Условное отображение формы
                    if (currentTab == "login") {
                        // ФОРМА ВХОДА
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Email
                            OutlinedTextField(
                                value = loginEmail,
                                onValueChange = { loginEmail = it },
                                label = { Text("Email", fontSize = 11.sp) },
                                placeholder = { Text("Введите ваш email") },
                                leadingIcon = {
                                    Icon(
                                        imageVector = Icons.Default.Email,
                                        contentDescription = null,
                                        tint = Color(0xFF9CA3AF) // gray-400
                                    )
                                },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Email
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Primary,
                                    unfocusedBorderColor = Color(0xFFD1D5DB), // gray-300
                                    focusedLabelColor = Primary,
                                    unfocusedLabelColor = Color(0xFF374151), // gray-700
                                    cursorColor = Primary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                            
                            // Password
                            OutlinedTextField(
                                value = loginPassword,
                                onValueChange = { loginPassword = it },
                                label = { Text("Пароль", fontSize = 11.sp) },
                                placeholder = { Text("Введите ваш пароль") },
                                leadingIcon = {
                                    Icon(
                                        imageVector = Icons.Default.Lock,
                                        contentDescription = null,
                                        tint = Color(0xFF9CA3AF) // gray-400
                                    )
                                },
                                trailingIcon = {
                                    IconButton(onClick = { loginPasswordVisible = !loginPasswordVisible }) {
                                        Icon(
                                            imageVector = if (loginPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                            contentDescription = if (loginPasswordVisible) "Скрыть пароль" else "Показать пароль",
                                            tint = Color(0xFF9CA3AF) // gray-400
                                        )
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                visualTransformation = if (loginPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Primary,
                                    unfocusedBorderColor = Color(0xFFD1D5DB), // gray-300
                                    focusedLabelColor = Primary,
                                    unfocusedLabelColor = Color(0xFF374151), // gray-700
                                    cursorColor = Primary
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                            
                            // Чекбокс и забыли пароль
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = rememberMe,
                                        onCheckedChange = { rememberMe = it },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = Primary,
                                            uncheckedColor = Color(0xFFD1D5DB) // gray-300
                                        )
                                    )
                                    Text(
                                        text = "Запомнить меня",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            fontSize = 12.sp
                                        ),
                                        color = Color(0xFF374151) // gray-700
                                    )
                                }
                                
                                Text(
                                    text = "Забыли?",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = Primary,
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 10.sp
                                    ),
                                    modifier = Modifier.clickable {
                                        // TODO: Восстановление пароля
                                    }
                                )
                            }
                            
                            // Кнопка входа
                            Button(
                                onClick = {
                                    viewModel.login(loginEmail, loginPassword, rememberMe)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(36.dp) 
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        brush = Brush.horizontalGradient(
                                            colors = listOf(
                                                Color(0xFF3B82F6), // blue-500
                                                Color(0xFF6366F1)  // indigo-500
                                            )
                                        )
                                    ),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent,
                                    disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                enabled = !uiState.isLoading && loginEmail.isNotBlank() && loginPassword.isNotBlank()
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(14.dp),
                                        color = Color.White,
                                        strokeWidth = 1.5.dp
                                    )
                                } else {
                                    Text(
                                        text = "Войти",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 12.sp
                                        ),
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    } else {
                        // ФОРМА РЕГИСТРАЦИИ - полная версия с анимациями
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Основная информация - заголовок с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { -it },
                                    animationSpec = tween(600, delayMillis = 100)
                                ) + fadeIn(animationSpec = tween(600, delayMillis = 100))
                            ) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFF8FAFC).copy(alpha = 0.8f) // slate-50
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                                        brush = Brush.linearGradient(
                                            colors = listOf(
                                                Color(0xFF3B82F6).copy(alpha = 0.2f),
                                                Color(0xFF6366F1).copy(alpha = 0.2f)
                                            )
                                        )
                                    )
                                ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(12.dp) // добавляю отступы
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                brush = Brush.linearGradient(
                                                    colors = listOf(
                                                        Color(0xFF3B82F6),
                                                        Color(0xFF6366F1)
                                                    )
                                                )
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(16.dp)
                                            .padding(end = 0.dp) // убираю отступ
                                    )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = "Основная информация",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF1E293B) // slate-800
                                    )
                                }
                                }
                            }
                            
                            // Поля с плавными анимациями появления
                            listOf(
                                Triple("name", "Полное имя", "Введите ваше ФИО"),
                                Triple("email", "Email", "Введите ваш email"),
                                Triple("phone", "Номер телефона", "Введите ваш номер телефона")
                            ).forEachIndexed { index, (type, label, placeholder) ->
                                AnimatedVisibility(
                                    visible = true,
                                    enter = slideInVertically(
                                        initialOffsetY = { it / 2 },
                                        animationSpec = tween(
                                            durationMillis = 800,
                                            delayMillis = 200 + index * 100,
                                            easing = FastOutSlowInEasing
                                        )
                                    ) + fadeIn(
                                        animationSpec = tween(800, delayMillis = 200 + index * 100)
                                    )
                                ) {
                                    OutlinedTextField(
                                        value = when(type) {
                                            "name" -> registerName
                                            "email" -> registerEmail
                                            "phone" -> registerPhone
                                            else -> ""
                                        },
                                        onValueChange = { value ->
                                            when(type) {
                                                "name" -> registerName = value
                                                "email" -> registerEmail = value
                                                "phone" -> registerPhone = value
                                            }
                                        },
                                        label = { Text(label, fontSize = 11.sp) },
                                        placeholder = { Text(placeholder, fontSize = 11.sp) },
                                        leadingIcon = {
                                            Icon(
                                                imageVector = when(type) {
                                                    "name" -> Icons.Default.Person
                                                    "email" -> Icons.Default.Email
                                                    "phone" -> Icons.Default.Phone
                                                    else -> Icons.Default.Person
                                                },
                                                contentDescription = null,
                                                tint = Color(0xFF9CA3AF)
                                            )
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = when(type) {
                                                "email" -> KeyboardType.Email
                                                "phone" -> KeyboardType.Phone
                                                else -> KeyboardType.Text
                                            }
                                        ),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = Primary,
                                            unfocusedBorderColor = Color(0xFFD1D5DB),
                                            focusedLabelColor = Primary,
                                            unfocusedLabelColor = Color(0xFF374151),
                                            cursorColor = Primary
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                }
                            }
                            
                            // Разделитель с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = scaleIn(
                                    animationSpec = tween(500, delayMillis = 600)
                                ) + fadeIn(animationSpec = tween(500, delayMillis = 600))
                            ) {
                                HorizontalDivider(
                                    color = Color(0xFFE5E7EB),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                            
                            // Адрес и район - заголовок
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInHorizontally(
                                    initialOffsetX = { -it },
                                    animationSpec = tween(600, delayMillis = 700)
                                ) + fadeIn(animationSpec = tween(600, delayMillis = 700))
                            ) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFF0F9FF).copy(alpha = 0.8f) // sky-50
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                                        brush = Brush.linearGradient(
                                            colors = listOf(
                                                Color(0xFF0EA5E9).copy(alpha = 0.2f), // sky-500
                                                Color(0xFF3B82F6).copy(alpha = 0.2f)  // blue-500
                                            )
                                        )
                                    )
                                ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                brush = Brush.linearGradient(
                                                    colors = listOf(
                                                        Color(0xFF0EA5E9), // sky-500
                                                        Color(0xFF3B82F6)  // blue-500
                                                    )
                                                )
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(16.dp)
                                            .padding(end = 0.dp)
                                    )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = "Адрес и местоположение",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF1E293B) // slate-800
                                    )
                                }
                                }
                            }
                            
                            // Район (dropdown) с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it / 2 },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 800,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 800))
                            ) {
                                ExposedDropdownMenuBox(
                                    expanded = expandedDistrict,
                                    onExpandedChange = { expandedDistrict = !expandedDistrict }
                                ) {
                                    OutlinedTextField(
                                        value = registerDistrict,
                                        onValueChange = { },
                                        readOnly = true,
                                        label = { Text("Район", fontSize = 11.sp) },
                                        placeholder = { Text("Выберите ваш район", fontSize = 11.sp) },
                                        leadingIcon = {
                                            Icon(
                                                imageVector = Icons.Default.LocationOn,
                                                contentDescription = null,
                                                tint = Color(0xFF9CA3AF)
                                            )
                                        },
                                        trailingIcon = {
                                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedDistrict)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .menuAnchor(),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = Primary,
                                            unfocusedBorderColor = Color(0xFFD1D5DB),
                                            focusedLabelColor = Primary,
                                            unfocusedLabelColor = Color(0xFF374151),
                                            cursorColor = Primary
                                        ),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    
                                    ExposedDropdownMenu(
                                        expanded = expandedDistrict,
                                        onDismissRequest = { expandedDistrict = false },
                                        modifier = Modifier
                                            .background(
                                                Color.White,
                                                RoundedCornerShape(12.dp)
                                            )
                                            .clip(RoundedCornerShape(12.dp))
                                    ) {
                                        districts.forEach { district ->
                                            DropdownMenuItem(
                                                text = { 
                                                    Text(
                                                        district, 
                                                        fontSize = 11.sp,
                                                        color = Color(0xFF1E293B), // slate-800
                                                        modifier = Modifier.padding(vertical = 4.dp)
                                                    ) 
                                                },
                                                onClick = {
                                                    registerDistrict = district
                                                    expandedDistrict = false
                                                },
                                                modifier = Modifier
                                                    .background(
                                                        if (registerDistrict == district) 
                                                            Color(0xFFF1F5F9).copy(alpha = 0.8f) // slate-100
                                                        else 
                                                            Color.Transparent
                                                    )
                                                    .fillMaxWidth(),
                                                leadingIcon = {
                                                    if (registerDistrict == district) {
                                                        Icon(
                                                            imageVector = Icons.Default.Check,
                                                            contentDescription = null,
                                                            tint = Primary,
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                    } else {
                                                        Icon(
                                                            imageVector = Icons.Default.LocationOn,
                                                            contentDescription = null,
                                                            tint = Color(0xFF64748B), // slate-500
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                            
                            // Адрес с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it / 2 },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 900,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 900))
                            ) {
                                OutlinedTextField(
                                    value = registerAddress,
                                    onValueChange = { registerAddress = it },
                                    label = { Text("Адрес", fontSize = 11.sp) },
                                    placeholder = { Text("Введите ваш адрес", fontSize = 11.sp) },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Home,
                                            contentDescription = null,
                                            tint = Color(0xFF9CA3AF)
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Primary,
                                        unfocusedBorderColor = Color(0xFFD1D5DB),
                                        focusedLabelColor = Primary,
                                        unfocusedLabelColor = Color(0xFF374151),
                                        cursorColor = Primary
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                            
                            // Разделитель
                            AnimatedVisibility(
                                visible = true,
                                enter = scaleIn(
                                    animationSpec = tween(500, delayMillis = 1000)
                                ) + fadeIn(animationSpec = tween(500, delayMillis = 1000))
                            ) {
                                HorizontalDivider(
                                    color = Color(0xFFE5E7EB),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                            
                            // Безопасность - заголовок
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInHorizontally(
                                    initialOffsetX = { it },
                                    animationSpec = tween(600, delayMillis = 1100)
                                ) + fadeIn(animationSpec = tween(600, delayMillis = 1100))
                            ) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFFDF2F8).copy(alpha = 0.8f) // pink-50
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                                        brush = Brush.linearGradient(
                                            colors = listOf(
                                                Color(0xFFEC4899).copy(alpha = 0.2f), // pink-500
                                                Color(0xFF8B5CF6).copy(alpha = 0.2f)  // violet-500
                                            )
                                        )
                                    )
                                ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                brush = Brush.linearGradient(
                                                    colors = listOf(
                                                        Color(0xFFEC4899), // pink-500
                                                        Color(0xFF8B5CF6)  // violet-500
                                                    )
                                                )
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                    Icon(
                                        imageVector = Icons.Default.Lock,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(16.dp)
                                            .padding(end = 0.dp)
                                    )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = "Безопасность",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF1E293B) // slate-800
                                    )
                                }
                                }
                            }
                            
                            // Пароль с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it / 2 },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 1200,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 1200))
                            ) {
                                OutlinedTextField(
                                    value = registerPassword,
                                    onValueChange = { registerPassword = it },
                                    label = { Text("Пароль", fontSize = 11.sp) },
                                    placeholder = { Text("Минимум 8 символов", fontSize = 11.sp) },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Lock,
                                            contentDescription = null,
                                            tint = Color(0xFF9CA3AF)
                                        )
                                    },
                                    trailingIcon = {
                                        IconButton(onClick = { registerPasswordVisible = !registerPasswordVisible }) {
                                            Icon(
                                                imageVector = if (registerPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                                contentDescription = if (registerPasswordVisible) "Скрыть пароль" else "Показать пароль",
                                                tint = Color(0xFF9CA3AF)
                                            )
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    visualTransformation = if (registerPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = KeyboardType.Password
                                    ),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Primary,
                                        unfocusedBorderColor = Color(0xFFD1D5DB),
                                        focusedLabelColor = Primary,
                                        unfocusedLabelColor = Color(0xFF374151),
                                        cursorColor = Primary
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                            
                            // Подтверждение пароля с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it / 2 },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 1300,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 1300))
                            ) {
                                OutlinedTextField(
                                    value = registerConfirmPassword,
                                    onValueChange = { registerConfirmPassword = it },
                                    label = { Text("Повтор пароля", fontSize = 11.sp) },
                                    placeholder = { Text("Повторите пароль", fontSize = 11.sp) },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Lock,
                                            contentDescription = null,
                                            tint = if (registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword) 
                                                Color(0xFFEF4444) else Color(0xFF9CA3AF)
                                        )
                                    },
                                    trailingIcon = {
                                        IconButton(onClick = { registerConfirmPasswordVisible = !registerConfirmPasswordVisible }) {
                                            Icon(
                                                imageVector = if (registerConfirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                                contentDescription = if (registerConfirmPasswordVisible) "Скрыть пароль" else "Показать пароль",
                                                tint = if (registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword) 
                                                    Color(0xFFEF4444) else Color(0xFF9CA3AF)
                                            )
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    visualTransformation = if (registerConfirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = KeyboardType.Password
                                    ),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = if (registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword) 
                                            Color(0xFFEF4444) else Primary,
                                        unfocusedBorderColor = if (registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword) 
                                            Color(0xFFEF4444) else Color(0xFFD1D5DB),
                                        focusedLabelColor = Primary,
                                        unfocusedLabelColor = Color(0xFF374151),
                                        cursorColor = Primary
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    isError = registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword
                                )
                            }
                            
                            // Предупреждение о несовпадении паролей с анимацией
                            AnimatedVisibility(
                                visible = registerPassword.isNotEmpty() && registerConfirmPassword.isNotEmpty() && registerPassword != registerConfirmPassword,
                                enter = slideInVertically(
                                    initialOffsetY = { -it },
                                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                ) + fadeIn(),
                                exit = slideOutVertically(
                                    targetOffsetY = { -it },
                                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                ) + fadeOut()
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(start = 16.dp, top = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier
                                            .size(16.dp)
                                            .padding(end = 4.dp)
                                    )
                                    Text(
                                        text = "Пароли не совпадают",
                                        color = Color(0xFFEF4444),
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            fontSize = 12.sp
                                        )
                                    )
                                }
                            }
                            
                            // Разделитель
                            AnimatedVisibility(
                                visible = true,
                                enter = scaleIn(
                                    animationSpec = tween(500, delayMillis = 1400)
                                ) + fadeIn(animationSpec = tween(500, delayMillis = 1400))
                            ) {
                                HorizontalDivider(
                                    color = Color(0xFFE5E7EB),
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                            
                            // Дополнительная информация - заголовок
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInHorizontally(
                                    initialOffsetX = { -it },
                                    animationSpec = tween(600, delayMillis = 1500)
                                ) + fadeIn(animationSpec = tween(600, delayMillis = 1500))
                            ) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = Color(0xFFF0FDF4).copy(alpha = 0.8f) // green-50
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder(enabled = true).copy(
                                        brush = Brush.linearGradient(
                                            colors = listOf(
                                                Color(0xFF10B981).copy(alpha = 0.2f), // emerald-500
                                                Color(0xFF059669).copy(alpha = 0.2f)  // emerald-600
                                            )
                                        )
                                    )
                                ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(
                                                brush = Brush.linearGradient(
                                                    colors = listOf(
                                                        Color(0xFF10B981), // emerald-500
                                                        Color(0xFF059669)  // emerald-600
                                                    )
                                                )
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                    Icon(
                                        imageVector = Icons.Default.LocalHospital,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier
                                            .size(16.dp)
                                            .padding(end = 0.dp)
                                    )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = "Мед. информация",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF1E293B) // slate-800
                                    )
                                }
                                }
                            }
                            
                            // Медицинская информация с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it / 2 },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 1600,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 1600))
                            ) {
                                OutlinedTextField(
                                    value = registerMedicalInfo,
                                    onValueChange = { registerMedicalInfo = it },
                                    label = { Text("Мед. информация", fontSize = 11.sp) },
                                    placeholder = { Text("Информация о заболеваниях (необязательно)", fontSize = 10.sp) },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.LocalHospital,
                                            contentDescription = null,
                                            tint = Color(0xFF9CA3AF),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 1, // уменьшаю до 1 строки
                                    maxLines = 2, // уменьшаю до 2 строк максимум
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Primary,
                                        unfocusedBorderColor = Color(0xFFD1D5DB),
                                        focusedLabelColor = Primary,
                                        unfocusedLabelColor = Color(0xFF374151),
                                        cursorColor = Primary
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                            
                            // Согласие с условиями с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInHorizontally(
                                    initialOffsetX = { -it },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 1700,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 1700))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Checkbox(
                                        checked = acceptTerms,
                                        onCheckedChange = { acceptTerms = it },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = Primary,
                                            uncheckedColor = Color(0xFFD1D5DB)
                                        )
                                    )
                                    Column(
                                        modifier = Modifier.padding(start = 8.dp, top = 12.dp)
                                    ) {
                                        Text(
                                            text = "Согласен с условиями",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontWeight = FontWeight.Medium,
                                                fontSize = 11.sp
                                            ),
                                            color = Color(0xFF374151)
                                        )
                                        Text(
                                            text = "и политикой",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontSize = 10.sp
                                            ),
                                            color = Color(0xFF6B7280)
                                        )
                                    }
                                }
                            }
                            
                            // Кнопка регистрации с анимацией
                            AnimatedVisibility(
                                visible = true,
                                enter = slideInVertically(
                                    initialOffsetY = { it },
                                    animationSpec = tween(
                                        durationMillis = 800,
                                        delayMillis = 1800,
                                        easing = FastOutSlowInEasing
                                    )
                                ) + fadeIn(animationSpec = tween(800, delayMillis = 1800))
                            ) {
                                val buttonScale by animateFloatAsState(
                                    targetValue = if (uiState.isLoading) 0.95f else 1f,
                                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                                    label = "button_scale"
                                )
                                
                                Button(
                                    onClick = {
                                        if (registerPassword == registerConfirmPassword && acceptTerms && 
                                            registerName.isNotBlank() && registerEmail.isNotBlank() && 
                                            registerPhone.isNotBlank() && registerDistrict.isNotBlank()) {
                                            viewModel.register(
                                                name = registerName,
                                                email = registerEmail,
                                                password = registerPassword,
                                                role = "patient",
                                                phone = registerPhone,
                                                address = registerAddress,
                                                district = registerDistrict,
                                                medicalInfo = registerMedicalInfo
                                            )
                                        }
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(36.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(
                                            brush = Brush.horizontalGradient(
                                                colors = listOf(
                                                    Color(0xFF10B981), // emerald-500
                                                    Color(0xFF059669)  // emerald-600
                                                )
                                            )
                                        )
                                        .scale(buttonScale),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color.Transparent,
                                        disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                    enabled = !uiState.isLoading && acceptTerms && registerName.isNotBlank() && 
                                            registerEmail.isNotBlank() && registerPhone.isNotBlank() && 
                                            registerDistrict.isNotBlank() && registerPassword.isNotBlank() && 
                                            registerConfirmPassword == registerPassword
                                ) {
                                    if (uiState.isLoading) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(14.dp),
                                            color = Color.White,
                                            strokeWidth = 1.5.dp
                                        )
                                    } else {
                                        Text(
                                            text = "Регистрация",
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 11.sp
                                            ),
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                    
                    // Ссылка на другую форму
                    Text(
                        text = if (currentTab == "login") 
                            "Нет аккаунта? Регистрация" 
                        else 
                            "Есть аккаунт? Войти",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontSize = 11.sp // уменьшено с 12sp
                        ),
                        color = Color(0xFF6B7280), // gray-500
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .clickable {
                                currentTab = if (currentTab == "login") "register" else "login"
                            }
                    )
                }
            }
        }
    }
} 

