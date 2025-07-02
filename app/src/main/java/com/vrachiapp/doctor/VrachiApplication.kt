package com.vrachiapp.doctor

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class VrachiApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Инициализация различных сервисов приложения
        initializeServices()
    }
    
    private fun initializeServices() {
        // Здесь можно добавить инициализацию различных сервисов
        // например, аналитика, crash reporting, и т.д.
    }
} 