package com.ae.ss_app

import android.content.Intent
import android.os.Build.VERSION.SDK_INT
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import coil.ImageLoader
import coil.compose.rememberAsyncImagePainter
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import com.ae.ss_app.ui.theme.SS_AppTheme
import kotlinx.coroutines.delay

class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            SS_AppTheme {
                val context = LocalContext.current
                // Prepara el cargador de imágenes para poder decodificar GIFs
                val imageLoader = ImageLoader.Builder(context)
                    .components {
                        if (SDK_INT >= 28) {
                            add(ImageDecoderDecoder.Factory())
                        } else {
                            add(GifDecoder.Factory())
                        }
                    }
                    .build()

                // Un efecto que se lanza una sola vez para navegar después de una pausa
                LaunchedEffect(key1 = true) {
                    delay(5000) // Espera 5 segundos
                    startActivity(Intent(context, LoginActivity::class.java))
                    finish() // Cierra la SplashActivity para que no se pueda volver a ella
                }

                // Muestra el GIF
                Image(
                    painter = rememberAsyncImagePainter(
                        R.raw.splash, // <-- OJO: Usa el nombre de tu archivo GIF
                        imageLoader
                    ),
                    contentDescription = "Splash Screen",
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}
