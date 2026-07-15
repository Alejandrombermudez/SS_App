package com.ae.ss_app.model

import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.PropertyName

data class Client(
    // El ID del documento será la CÉDULA / NIT
    @get:Exclude var id: String = "", 

    @get:PropertyName("name") @set:PropertyName("name")
    var name: String = "",

    @get:PropertyName("phone") @set:PropertyName("phone")
    var phone: String = "",

    @get:PropertyName("email") @set:PropertyName("email")
    var email: String = "",

    @get:PropertyName("address") @set:PropertyName("address")
    var address: String = "",

    @get:PropertyName("city") @set:PropertyName("city")
    var city: String = "",

    @get:PropertyName("profession") @set:PropertyName("profession")
    var profession: String = ""
) {
    constructor() : this("", "", "", "", "", "")
}