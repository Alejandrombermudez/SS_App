package com.ae.ss_app.utils

import com.ae.ss_app.model.Service

// Mapa OFICIAL de secciones y sus rangos de inicio según tu archivo Excel
val SECTIONS_MAP = mapOf(
    "Admisión" to 1000,
    "Carenado" to 2000,
    "Chasis" to 3000,
    "Controles" to 4000,
    "Frenos" to 5000,
    "Iluminación" to 6000,
    "Instrumentos" to 7000,
    "Motor" to 8000,
    "Sis. Eléctrico" to 9000,
    "Transmisión" to 10000,
    "Tren Del." to 11000,
    "Tren Del./Tras." to 12000,
    "Tren Tras." to 13000,
    "General" to 14000
)

/**
 * Calcula el siguiente código disponible basado en la sección elegida.
 * Ejemplo: Si eliges "Motor" (8000), busca el más alto (ej. 8045) y devuelve 8046.
 */
fun getNextCode(section: String, allServices: List<Service>): String {
    // 1. Obtener el código base (Ej: 8000)
    val baseCode = SECTIONS_MAP[section] ?: return ""

    // 2. Definir el límite del rango (asumimos bloques de 1000)
    val rangeEnd = baseCode + 1000

    // 3. Filtrar servicios existentes en ese rango
    val codesInSection = allServices
        .mapNotNull { it.itemCode.toIntOrNull() }
        .filter { it in baseCode until rangeEnd }

    // 4. Si no hay ninguno, devolver el primero (Ej: 8001)
    if (codesInSection.isEmpty()) {
        return (baseCode + 1).toString()
    }

    // 5. Si hay, buscar el máximo y sumar 1
    val nextCode = codesInSection.maxOrNull()!! + 1
    return nextCode.toString()
}