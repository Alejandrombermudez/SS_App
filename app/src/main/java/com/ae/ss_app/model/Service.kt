package com.ae.ss_app.model

import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.PropertyName

data class Service(
    @get:Exclude var id: String = "",

    @get:PropertyName("item_code") @set:PropertyName("item_code")
    var itemCode: String = "",

    var section: String = "",
    var description: String = "",

    @get:PropertyName("cost_type") @set:PropertyName("cost_type")
    var costType: String = "",

    var price: Int = 0,

    @get:PropertyName("service_group") @set:PropertyName("service_group")
    var serviceGroup: String = "",

    @get:PropertyName("dependencies") @set:PropertyName("dependencies")
    var dependencies: List<String> = emptyList()

) {
    constructor() : this("", "", "", "", "", 0, "", emptyList())
}