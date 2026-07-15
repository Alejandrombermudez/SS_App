package com.ae.ss_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.ae.ss_app.ui.theme.SS_AppTheme
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider

class LoginActivity : ComponentActivity() {

    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var firebaseAuth: FirebaseAuth

    // Define admin emails
    private val adminEmails = listOf("alejucha@gmail.com", "831.ronald.leon@gmail.com")

    private val launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        val task = GoogleSignIn.getSignedInAccountFromIntent(it.data)
        try {
            val account = task.getResult(ApiException::class.java)
            firebaseAuthWithGoogle(account.idToken!!)
        } catch (e: ApiException) {
            Log.w("LoginActivity", "Google sign in failed", e)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)
        firebaseAuth = FirebaseAuth.getInstance()

        setContent {
            SS_AppTheme {
                LoginScreen { 
                    signIn()
                }
            }
        }
    }

    private fun signIn() {
        googleSignInClient.signOut().addOnCompleteListener {
            val signInIntent = googleSignInClient.signInIntent
            launcher.launch(signInIntent)
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        firebaseAuth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    val user = firebaseAuth.currentUser
                    val userRole = if (adminEmails.contains(user?.email)) "admin" else "user"

                    val intent = Intent(this, MainActivity::class.java)
                    intent.putExtra("USER_ROLE", userRole)
                    startActivity(intent)
                    finish()
                } else {
                    Log.w("LoginActivity", "signInWithCredential:failure", task.exception)
                }
            }
    }
}

@Composable
fun LoginScreen(onSignInClick: () -> Unit) {
    val darkBlue = Color(0xFF0A192F)
    val almostBlack = Color(0xFF020C1B)
    val lightRed = Color(0xFFE63946)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(colors = listOf(darkBlue, almostBlack))
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height

            // Web of new lines in the top half
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.3f), lightRed.copy(alpha = 0.05f))),
                start = Offset(x = 0f, y = canvasHeight * 0.1f),
                end = Offset(x = canvasWidth * 0.8f, y = canvasHeight * 0.4f),
                strokeWidth = 1.dp.toPx()
            )
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.2f), lightRed.copy(alpha = 0.1f))),
                start = Offset(x = canvasWidth * 0.2f, y = 0f),
                end = Offset(x = canvasWidth, y = canvasHeight * 0.2f),
                strokeWidth = 2.dp.toPx()
            )
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.6f), lightRed.copy(alpha = 0.2f))),
                start = Offset(x = 0f, y = canvasHeight * 0.5f),
                end = Offset(x = canvasWidth * 0.7f, y = 0f),
                strokeWidth = 2.5.dp.toPx()
            )
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.1f), lightRed.copy(alpha = 0.4f))),
                start = Offset(x = 0f, y = canvasHeight * 0.2f),
                end = Offset(x = canvasWidth * 0.9f, y = canvasHeight * 0.5f),
                strokeWidth = 1.5.dp.toPx()
            )

            // Keep original lines
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.1f), lightRed.copy(alpha = 0.5f))),
                start = Offset(x = 0f, y = canvasHeight * 0.7f),
                end = Offset(x = canvasWidth, y = canvasHeight * 0.4f),
                strokeWidth = 3.dp.toPx()
            )
            drawLine(
                brush = Brush.linearGradient(colors = listOf(lightRed.copy(alpha = 0.4f), lightRed.copy(alpha = 0.05f))),
                start = Offset(x = canvasWidth * 0.1f, y = canvasHeight),
                end = Offset(x = canvasWidth, y = canvasHeight * 0.8f),
                strokeWidth = 2.dp.toPx()
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(120.dp)
            ) {
                // Glow effect
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(lightRed.copy(alpha = 0.4f), Color.Transparent)
                            ),
                            shape = CircleShape
                        )
                )
                // Icon
                Icon(
                    imageVector = Icons.Filled.Shield,
                    contentDescription = "Secret Service Icon",
                    modifier = Modifier.size(80.dp),
                    tint = Color.White.copy(alpha = 0.9f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Servicio Secreto de Motocicletas",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Acceso exclusivo para agentes",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = onSignInClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = lightRed.copy(alpha = 0.9f),
                    contentColor = Color.White
                )
            ) {
                Text("Ingresar con Google")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    SS_AppTheme {
        LoginScreen {}
    }
}
