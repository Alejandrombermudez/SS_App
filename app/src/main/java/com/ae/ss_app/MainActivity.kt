package com.ae.ss_app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.ae.ss_app.ui.admin.AdminServicesScreen
import com.ae.ss_app.ui.theme.SS_AppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val userRole = intent.getStringExtra("USER_ROLE") ?: "user"

        setContent {
            SS_AppTheme {
                MainScreen(userRole = userRole)
            }
        }
    }
}

@Composable
fun MainScreen(
    userRole: String,
    modifier: Modifier = Modifier
) {
    var currentScreen by remember { mutableStateOf("menu") }

    when (currentScreen) {
        "services" -> {
            AdminServicesScreen(onNavigateBack = { currentScreen = "menu" })
        }
        "clients" -> {
            com.ae.ss_app.ui.clients.ClientScreen(onNavigateBack = { currentScreen = "menu" })
        }
        else -> {
            val darkBlue = Color(0xFF0A192F)
            val almostBlack = Color(0xFF020C1B)

            Column(
                modifier = modifier
                    .fillMaxSize()
                    .background(brush = Brush.verticalGradient(colors = listOf(darkBlue, almostBlack)))
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                val title = if (userRole == "admin") "Panel de Administrador" else "Estación de Trabajo"
                
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(48.dp))

                ActionButton(text = "Crear Cotización") { /* Navegar a cotización */ }
                Spacer(modifier = Modifier.height(16.dp))
                ActionButton(text = "Buscar Cliente / Vehículos") { currentScreen = "clients" }

                if (userRole == "admin") {
                    Spacer(modifier = Modifier.height(16.dp))
                    ActionButton(text = "Gestionar Servicios") { 
                        currentScreen = "services" 
                    }
                }
            }
        }
    }
}

@Composable
fun ActionButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(text = text, modifier = Modifier.padding(8.dp))
    }
}

@Preview(showBackground = true)
@Composable
fun AdminScreenPreview() {
    SS_AppTheme {
        MainScreen(userRole = "admin")
    }
}

@Preview(showBackground = true)
@Composable
fun UserScreenPreview() {
    SS_AppTheme {
        MainScreen(userRole = "user")
    }
}
