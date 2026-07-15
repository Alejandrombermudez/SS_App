package com.ae.ss_app.model

import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.PropertyName

data class Vehicle(
    @get:Exclude var plate: String = "",

    @get:PropertyName("brand") @set:PropertyName("brand")
    var brand: String = "",

    @get:PropertyName("line") @set:PropertyName("line")
    var line: String = "",

    @get:PropertyName("model") @set:PropertyName("model")
    var model: String = "",

    @get:PropertyName("color") @set:PropertyName("color")
    var color: String = "", // En tu CSV nuevo no viene, quedará vacío por ahora

    @get:PropertyName("cc") @set:PropertyName("cc")
    var cc: String = "",

    // NUEVO CAMPO IMPORTANTE
    @get:PropertyName("category") @set:PropertyName("category")
    var category: String = "", // ALTO, MEDIO, BAJO

    @get:PropertyName("km") @set:PropertyName("km")
    var km: String = "", // En tu CSV nuevo no viene

    @get:PropertyName("soat_date") @set:PropertyName("soat_date")
    var soatDate: String = "",

    @get:PropertyName("tecno_date") @set:PropertyName("tecno_date")
    var tecnoDate: String = "",

    @get:PropertyName("client_id") @set:PropertyName("client_id")
    var clientId: String = "",
    
    // NUEVO CAMPO
    @get:PropertyName("license_image") @set:PropertyName("license_image")
    var licenseImage: String = ""
) {
    constructor() : this("", "", "", "", "", "", "", "", "", "", "", "")
}