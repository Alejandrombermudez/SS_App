package com.ae.ss_app.ui.clients

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.zIndex
import com.ae.ss_app.model.Client
import com.ae.ss_app.model.Vehicle
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import androidx.compose.material.icons.filled.AddCircle

// --- FUNCIONES AUXILIARES GLOBALES ---
fun calculateCategory(ccStr: String): String {
    val cc = ccStr.toIntOrNull() ?: 0
    return when {
        cc <= 200 -> "BAJO"
        cc <= 600 -> "MEDIO" // Actualizado a 600 según tu solicitud
        else -> "ALTO"
    }
}

// Mantén la función de colores igual
fun getCategoryColor(category: String): Color {
    return when (category.uppercase()) {
        "BAJO" -> Color(0xFF4CAF50)   // Verde
        "MEDIO" -> Color(0xFFFFC107)  // Ámbar/Amarillo
        "ALTO" -> Color(0xFFF44336)   // Rojo
        else -> Color.Gray
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientScreen(onNavigateBack: () -> Unit) {
    val db = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    // --- ESTADOS ---
    var allClients by remember { mutableStateOf<List<Client>>(emptyList()) }
    var filteredClients by remember { mutableStateOf<List<Client>>(emptyList()) }
    var client by remember { mutableStateOf<Client?>(null) }
    var vehiclesList by remember { mutableStateOf<List<Vehicle>>(emptyList()) }

    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var isNewClient by remember { mutableStateOf(false) }
    var isLoadingVehicles by remember { mutableStateOf(false) }
    var showAddVehicleDialog by remember { mutableStateOf(false) }
    var selectedVehicleForDetail by remember { mutableStateOf<Vehicle?>(null) }

    var clientIdInput by remember { mutableStateOf("") }

    // Campos Formulario Cliente
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }

    var profession by remember { mutableStateOf("") } // El valor seleccionado
    var availableProfessions by remember { mutableStateOf<List<String>>(emptyList()) }
    var expandedProfessionMenu by remember { mutableStateOf(false) }
    var showAddProfessionDialog by remember { mutableStateOf(false) }

    // 1. CARGA INICIAL
    LaunchedEffect(Unit) {
        db.collection("clients").addSnapshotListener { snapshot, _ ->
            if (snapshot != null) {
                val loaded = snapshot.toObjects(Client::class.java)
                loaded.forEachIndexed { i, c -> c.id = snapshot.documents[i].id }
                allClients = loaded
            }
        }
    }

    LaunchedEffect(Unit) {
        // Escuchamos la colección "professions" ordenada alfabéticamente
        db.collection("professions").orderBy("name").addSnapshotListener { snapshot, _ ->
            if (snapshot != null) {
                // Mapeamos los documentos a una lista de Strings
                availableProfessions = snapshot.documents.map { it.getString("name") ?: "" }.filter { it.isNotEmpty() }
            }
        }
    }

    // 2. BUSCADOR
    LaunchedEffect(searchQuery) {
        if (searchQuery.isBlank()) {
            filteredClients = emptyList()
            isSearching = false
        } else {
            isSearching = true
            val tokens = searchQuery.trim().lowercase().split(" ")
            filteredClients = allClients.filter { c ->
                val fullText = "${c.id} ${c.name} ${c.phone}".lowercase()
                tokens.all { token -> fullText.contains(token) }
            }.take(5)
        }
    }

    fun selectClient(selected: Client) {
        client = selected
        clientIdInput = selected.id

        name = selected.name
        phone = selected.phone
        email = selected.email
        address = selected.address
        city = selected.city
        profession = selected.profession

        isNewClient = false
        isSearching = false
        searchQuery = ""

        isLoadingVehicles = true
        db.collection("vehicles")
            .whereEqualTo("client_id", selected.id)
            .get()
            .addOnSuccessListener { qs ->
                val bikes = qs.toObjects(Vehicle::class.java)
                bikes.forEachIndexed { i, v -> v.plate = qs.documents[i].id }
                vehiclesList = bikes
                isLoadingVehicles = false
            }
    }

    fun prepareNewClient() {
        client = null
        isNewClient = true
        isSearching = false
        searchQuery = ""
        clientIdInput = ""
        name = ""; phone = ""; email = ""; address = ""; city = ""
        profession = ""
        vehiclesList = emptyList()
    }

    fun clearSelection() {
        client = null
        isNewClient = false
        clientIdInput = "";
        vehiclesList = emptyList()
        name = ""; phone = ""; email = ""; address = ""; city = ""
        profession = ""
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gestión de Clientes", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Black),
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Volver", tint = Color.White)
                    }
                },
                actions = {
                    if (client != null) {
                        TextButton(onClick = { clearSelection() }) {
                            Text("Limpiar", color = Color(0xFFE63946))
                        }
                    }
                }
            )
        },
        containerColor = Color(0xFF0A192F)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
            contentPadding = PaddingValues(16.dp)
        ) {
            // --- BUSCADOR ---
            item {
                Box(modifier = Modifier
                    .fillMaxWidth()
                    .zIndex(1f)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        label = { Text("Buscar Cédula o Nombre...") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = customClientColors(),
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Close, null, tint = Color.Gray) }
                            } else {
                                Icon(Icons.Default.Search, null, tint = Color.Gray)
                            }
                        },
                        singleLine = true
                    )
                    if (isSearching && filteredClients.isNotEmpty()) {
                        Card(
                            modifier = Modifier
                                .padding(top = 60.dp)
                                .fillMaxWidth(),
                            elevation = CardDefaults.cardElevation(8.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2D45))
                        ) {
                            Column {
                                filteredClients.forEach { suggestion ->
                                    ListItem(
                                        headlineContent = { Text(suggestion.name, color = Color.White, fontWeight = FontWeight.Bold) },
                                        supportingContent = { Text("CC: ${suggestion.id}", color = Color.Gray) },
                                        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                                        modifier = Modifier.clickable { selectClient(suggestion) }
                                    )
                                    HorizontalDivider(color = Color.Gray.copy(alpha = 0.2f))
                                }
                            }
                        }
                    } else if (isSearching && filteredClients.isEmpty() && searchQuery.length > 3) {
                        Button(
                            onClick = {
                                val potentialId = if(searchQuery.all { it.isDigit() }) searchQuery else ""
                                prepareNewClient()
                            },
                            modifier = Modifier
                                .padding(top = 60.dp)
                                .fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE63946))
                        ) {
                            Text("Cliente no encontrado. ¿Crear Nuevo?")
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            // --- FORMULARIO CLIENTE ---
            item {
                Text("Datos del Cliente", color = Color.Gray, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF112240)), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {

                        // Campo Cédula
                        OutlinedTextField(
                            value = clientIdInput,
                            onValueChange = { if (isNewClient) clientIdInput = it },
                            label = { Text("Cédula / NIT") }, modifier = Modifier.fillMaxWidth(),
                            readOnly = !isNewClient,
                            colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true,
                            trailingIcon = { if (!isNewClient) Icon(Icons.Default.Lock, "Bloqueado", tint = Color.Gray) }
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        // Campos Nombre y Teléfono
                        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre Completo") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors(), keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words))
                        Spacer(modifier = Modifier.height(8.dp))
                        Row {
                            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Teléfono") }, modifier = Modifier.weight(1f), colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                            Spacer(modifier = Modifier.width(8.dp))
                            OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("Ciudad") }, modifier = Modifier.weight(1f), colors = customClientColors())
                        }

                        // --- NUEVA SECCIÓN DE PROFESIÓN ---
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Menú Desplegable (Dropdown)
                            ExposedDropdownMenuBox(
                                expanded = expandedProfessionMenu,
                                onExpandedChange = { expandedProfessionMenu = !expandedProfessionMenu },
                                modifier = Modifier.weight(1f)
                            ) {
                                OutlinedTextField(
                                    value = profession,
                                    onValueChange = {}, // No dejamos escribir manualmente aquí
                                    readOnly = true, // Solo selección
                                    label = { Text("Profesión / Ocupación") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedProfessionMenu) },
                                    colors = customClientColors(),
                                    modifier = Modifier.menuAnchor().fillMaxWidth()
                                )
                                ExposedDropdownMenu(
                                    expanded = expandedProfessionMenu,
                                    onDismissRequest = { expandedProfessionMenu = false },
                                    modifier = Modifier.background(Color(0xFF1E2D45))
                                ) {
                                    if (availableProfessions.isEmpty()) {
                                        DropdownMenuItem(text = { Text("Sin profesiones registradas", color = Color.Gray) }, onClick = { })
                                    }
                                    availableProfessions.forEach { item ->
                                        DropdownMenuItem(
                                            text = { Text(item, color = Color.White) },
                                            onClick = {
                                                profession = item
                                                expandedProfessionMenu = false
                                            }
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            // Botón "+" para agregar nueva profesión
                            IconButton(
                                onClick = { showAddProfessionDialog = true },
                                modifier = Modifier.background(Color(0xFF4CAF50), RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.Add, "Nueva Profesión", tint = Color.White)
                            }
                        }
                        // ----------------------------------

                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Correo") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Dirección") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors())

                        Spacer(modifier = Modifier.height(24.dp))

                        // Botones Guardar/Cancelar
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            if (!isNewClient) {
                                TextButton(onClick = { prepareNewClient() }) { Text("Cancelar / Nuevo", color = Color.Gray) }
                                Spacer(modifier = Modifier.width(8.dp))
                            }

                            Button(
                                onClick = {
                                    if (clientIdInput.isBlank()) { Toast.makeText(context, "La Cédula es obligatoria", Toast.LENGTH_SHORT).show(); return@Button }

                                    val clientToSave = Client(
                                        id = clientIdInput,
                                        name = name,
                                        phone = phone,
                                        email = email,
                                        address = address,
                                        city = city,
                                        profession = profession //
                                    )

                                    db.collection("clients").document(clientIdInput).set(clientToSave, SetOptions.merge())
                                        .addOnSuccessListener {
                                            client = clientToSave
                                            isNewClient = false
                                            Toast.makeText(context, if(isNewClient) "Cliente Creado" else "Datos Actualizados", Toast.LENGTH_SHORT).show()
                                        }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isNewClient) Color.White else Color(0xFF4CAF50))
                            ) {
                                Text(text = if (isNewClient) "CREAR CLIENTE" else "ACTUALIZAR DATOS", color = if (isNewClient) Color.Black else Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
            // --- LISTAS ---
            if (client != null && !isNewClient) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Vehículos del Cliente", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        SmallFloatingActionButton(onClick = { showAddVehicleDialog = true }, containerColor = Color(0xFFE63946), contentColor = Color.White) { Icon(Icons.Default.Add, "Agregar") }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    if (isLoadingVehicles) CircularProgressIndicator(color = Color.White) else if (vehiclesList.isEmpty()) Text("Este cliente no tiene vehículos.", color = Color.Gray)
                }
                items(vehiclesList) { vehicle ->
                    VehicleItemRow(vehicle = vehicle, onClick = { selectedVehicleForDetail = vehicle })
                }
            } else {
                item {
                    Text("Directorio de Clientes", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Seleccione uno para ver detalles", color = Color.Gray, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                items(allClients) { clientItem ->
                    ClientDirectoryRow(client = clientItem, onClick = { selectClient(clientItem) })
                }
            }
        }
    }

    if (showAddVehicleDialog && client != null) {
        AddVehicleDialog(clientId = client!!.id, onDismiss = { showAddVehicleDialog = false }, onSave = { selectClient(client!!); showAddVehicleDialog = false })
    }

    if (selectedVehicleForDetail != null) {
        VehicleDetailDialog(
            vehicle = selectedVehicleForDetail!!,
            allClients = allClients, // <--- NUEVO: Pasamos la lista completa para buscar
            onDismiss = { selectedVehicleForDetail = null },
            onUpdate = {
                selectedVehicleForDetail = null
                if (client != null) selectClient(client!!)
            }
        )
    }
    if (showAddProfessionDialog) {
        AddProfessionDialog(
            onDismiss = { showAddProfessionDialog = false },
            onSave = { newProf ->
                profession = newProf // Auto-seleccionamos la nueva profesión
                showAddProfessionDialog = false
            }
        )
    }
}

// --- NUEVO COMPONENTE: DIÁLOGO DE PROFESIÓN ---
@Composable
fun AddProfessionDialog(onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var newProfession by remember { mutableStateOf("") }
    val db = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    Dialog(onDismissRequest = onDismiss) {
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2D45)), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Nueva Profesión", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = newProfession,
                    onValueChange = { newProfession = it.replaceFirstChar { char -> char.uppercase() } }, // Auto mayúscula inicial
                    label = { Text("Nombre (Ej: Ingeniero)") },
                    colors = customClientColors(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancelar", color = Color.Gray) }
                    Button(
                        onClick = {
                            if (newProfession.isBlank()) return@Button
                            // Guardamos en la colección "professions"
                            val data = hashMapOf("name" to newProfession.trim())
                            db.collection("professions").add(data)
                                .addOnSuccessListener {
                                    Toast.makeText(context, "Profesión agregada", Toast.LENGTH_SHORT).show()
                                    onSave(newProfession.trim())
                                }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                    ) {
                        Text("Guardar")
                    }
                }
            }
        }
    }
}
// --- DIÁLOGO DE AGREGAR MOTO (CON CÁLCULO DE CATEGORÍA) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddVehicleDialog(clientId: String, onDismiss: () -> Unit, onSave: () -> Unit) {
    val db = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    var plate by remember { mutableStateOf("") }
    var brand by remember { mutableStateOf("") }
    var line by remember { mutableStateOf("") }
    var model by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("") }
    var cc by remember { mutableStateOf("") }
    // Cálculo automático de categoría
    val category = remember(cc) { calculateCategory(cc) }

    var km by remember { mutableStateOf("") }
    var soat by remember { mutableStateOf("") }
    var tecno by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0A192F)), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())) {
                Text("Agregar Motocicleta", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(value = plate, onValueChange = { plate = it.uppercase() }, label = { Text("Placa (Obligatorio)") }, colors = customClientColors(), modifier = Modifier.fillMaxWidth())
                Spacer(modifier = Modifier.height(8.dp))
                Row {
                    OutlinedTextField(value = brand, onValueChange = { brand = it }, label = { Text("Marca") }, modifier = Modifier.weight(1f), colors = customClientColors())
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedTextField(value = line, onValueChange = { line = it }, label = { Text("Línea") }, modifier = Modifier.weight(1f), colors = customClientColors())
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row {
                    OutlinedTextField(value = model, onValueChange = { model = it }, label = { Text("Modelo") }, modifier = Modifier.weight(1f), colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedTextField(value = cc, onValueChange = { cc = it }, label = { Text("CC") }, modifier = Modifier.weight(1f), colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }
                Spacer(modifier = Modifier.height(8.dp))
                // CAMPO CATEGORÍA AUTOMÁTICA
                OutlinedTextField(
                    value = category, onValueChange = {}, label = { Text("Categoría (Auto)") },
                    modifier = Modifier.fillMaxWidth(), enabled = false,
                    colors = OutlinedTextFieldDefaults.colors(disabledTextColor = getCategoryColor(category), disabledBorderColor = Color.Gray, disabledLabelColor = Color.White, disabledContainerColor = Color.Black.copy(alpha = 0.2f))
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = color, onValueChange = { color = it }, label = { Text("Color") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors())
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(value = km, onValueChange = { km = it }, label = { Text("Kilometraje") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                Spacer(modifier = Modifier.height(8.dp))
                Row {
                    OutlinedTextField(value = soat, onValueChange = { soat = it }, label = { Text("SOAT") }, modifier = Modifier.weight(1f), colors = customClientColors())
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedTextField(value = tecno, onValueChange = { tecno = it }, label = { Text("Tecno") }, modifier = Modifier.weight(1f), colors = customClientColors())
                }
                Spacer(modifier = Modifier.height(24.dp))
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    TextButton(onClick = onDismiss) { Text("Cancelar", color = Color.Gray) }
                    Button(
                        onClick = {
                            if (plate.isBlank()) { Toast.makeText(context, "Placa obligatoria", Toast.LENGTH_SHORT).show(); return@Button }
                            val vehicle = Vehicle(plate = plate, brand = brand, line = line, model = model, color = color, cc = cc, category = category, km = km, soatDate = soat, tecnoDate = tecno, clientId = clientId)
                            db.collection("vehicles").document(plate).set(vehicle).addOnSuccessListener { Toast.makeText(context, "Vehículo Agregado", Toast.LENGTH_SHORT).show(); onSave() }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                    ) { Text("Guardar", color = Color.Black) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleDetailDialog(
    vehicle: Vehicle,
    allClients: List<Client>,
    onDismiss: () -> Unit,
    onUpdate: () -> Unit
) {
    val db = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    // ESTADOS DE EDICIÓN
    var brand by remember { mutableStateOf(vehicle.brand) }
    var line by remember { mutableStateOf(vehicle.line) }
    var model by remember { mutableStateOf(vehicle.model) }
    var color by remember { mutableStateOf(vehicle.color) }
    var cc by remember { mutableStateOf(vehicle.cc) }
    var km by remember { mutableStateOf(vehicle.km) }
    var soat by remember { mutableStateOf(vehicle.soatDate) }
    var tecno by remember { mutableStateOf(vehicle.tecnoDate) }

    // --- LÓGICA DE CATEGORÍA ---
    // 1. Inicializamos con lo que tenga la moto.
    // 2. Si la moto no tiene categoría (datos viejos), calculamos una sugerencia inicial.
    var category by remember {
        mutableStateOf(
            if (vehicle.category.isNotBlank()) vehicle.category
            else calculateCategory(vehicle.cc)
        )
    }

    // Estado para el menú desplegable de categorías
    var expandedCategoryMenu by remember { mutableStateOf(false) }
    val categoryOptions = listOf("BAJO", "MEDIO", "ALTO")

    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showTransferDialog by remember { mutableStateOf(false) }

    // Estados transferencia
    var transferQuery by remember { mutableStateOf("") }
    var transferFilteredClients by remember { mutableStateOf<List<Client>>(emptyList()) }
    var selectedNewOwner by remember { mutableStateOf<Client?>(null) }

    LaunchedEffect(transferQuery) {
        if (transferQuery.isBlank()) {
            transferFilteredClients = emptyList()
        } else {
            val tokens = transferQuery.trim().lowercase().split(" ")
            transferFilteredClients = allClients.filter { c ->
                val fullText = "${c.id} ${c.name}".lowercase()
                tokens.all { token -> fullText.contains(token) }
            }.take(4)
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0A192F)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())) {
                // CABECERA
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Editar Ficha Técnica", color = Color.Gray, fontSize = 12.sp)
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null, tint = Color.White) }
                }

                // PLACA
                Text(text = vehicle.plate, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color(0xFFE63946), modifier = Modifier.align(Alignment.CenterHorizontally))
                Spacer(modifier = Modifier.height(8.dp))

                // --- CATEGORÍA EDITABLE ---
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "$brand $line", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.width(12.dp))

                    // CAJA CON MENÚ DESPLEGABLE
                    Box {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = getCategoryColor(category)),
                            shape = RoundedCornerShape(50),
                            modifier = Modifier.clickable { expandedCategoryMenu = true } // CLICK PARA CAMBIAR
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = category,
                                    color = Color.Black,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(Icons.Default.ArrowDropDown, null, tint = Color.Black, modifier = Modifier.size(16.dp))
                            }
                        }

                        // EL MENÚ DESPLEGABLE
                        DropdownMenu(
                            expanded = expandedCategoryMenu,
                            onDismissRequest = { expandedCategoryMenu = false },
                            modifier = Modifier.background(Color(0xFF1E2D45))
                        ) {
                            categoryOptions.forEach { option ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            option,
                                            color = getCategoryColor(option), // Texto del color de la categoría
                                            fontWeight = FontWeight.Bold
                                        )
                                    },
                                    onClick = {
                                        category = option
                                        expandedCategoryMenu = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // CAMPOS EDITABLES
                Row(Modifier.fillMaxWidth()) {
                    EditInfoCell("Marca", brand, { brand = it }, Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    EditInfoCell("Línea", line, { line = it }, Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth()) {
                    EditInfoCell("Modelo", model, { model = it }, Modifier.weight(1f), true)
                    Spacer(modifier = Modifier.width(8.dp))
                    EditInfoCell("Color", color, { color = it }, Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth()) {
                    // Nota: Al cambiar CC aquí ya NO cambia la categoría automáticamente para respetar tu selección manual
                    EditInfoCell("CC", cc, { cc = it }, Modifier.weight(1f), true)
                    Spacer(modifier = Modifier.width(8.dp))
                    EditInfoCell("Km", km, { km = it }, Modifier.weight(1f), true)
                }
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth()) {
                    EditInfoCell("SOAT", soat, { soat = it }, Modifier.weight(1f))
                    Spacer(modifier = Modifier.width(8.dp))
                    EditInfoCell("Tecno", tecno, { tecno = it }, Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(24.dp))

                // BOTÓN GUARDAR
                Button(
                    onClick = {
                        val updated = vehicle.copy(brand = brand, line = line, model = model, color = color, cc = cc, category = category, km = km, soatDate = soat, tecnoDate = tecno)
                        db.collection("vehicles").document(vehicle.plate).set(updated, SetOptions.merge())
                            .addOnSuccessListener { Toast.makeText(context, "Cambios guardados", Toast.LENGTH_SHORT).show(); onUpdate() }
                            .addOnFailureListener { Toast.makeText(context, "Error al guardar", Toast.LENGTH_SHORT).show() }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                ) { Text("GUARDAR CAMBIOS", color = Color.Black, fontWeight = FontWeight.Bold) }

                Spacer(modifier = Modifier.height(16.dp))

                // BOTONES TRANSFERIR / ELIMINAR
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    OutlinedButton(onClick = { showDeleteConfirm = true }, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE63946)), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE63946))) {
                        Icon(Icons.Default.Delete, null, modifier = Modifier.size(16.dp)); Spacer(modifier = Modifier.width(4.dp)); Text("Eliminar", fontSize = 12.sp)
                    }
                    OutlinedButton(onClick = { showTransferDialog = true }, colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF4CAF50)), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4CAF50))) {
                        Icon(Icons.AutoMirrored.Filled.Send, null, modifier = Modifier.size(16.dp)); Spacer(modifier = Modifier.width(4.dp)); Text("Transferir", fontSize = 12.sp)
                    }
                }
            }
        }
    }

    // --- DIÁLOGO DE TRANSFERENCIA ---
    if (showTransferDialog) {
        Dialog(onDismissRequest = { showTransferDialog = false }) {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2D45)), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Transferir Propiedad", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))

                    if (selectedNewOwner == null) {
                        Text("Buscar nuevo propietario:", color = Color.Gray, fontSize = 12.sp)
                        OutlinedTextField(value = transferQuery, onValueChange = { transferQuery = it }, placeholder = { Text("Nombre o Cédula") }, modifier = Modifier.fillMaxWidth(), colors = customClientColors(), singleLine = true, trailingIcon = { Icon(Icons.Default.Search, null, tint = Color.Gray) })
                        Spacer(modifier = Modifier.height(8.dp))
                        if (transferFilteredClients.isNotEmpty()) {
                            transferFilteredClients.forEach { client ->
                                Row(modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { if (client.id == vehicle.clientId) Toast.makeText(context, "Ya es el dueño", Toast.LENGTH_SHORT).show() else selectedNewOwner = client }
                                    .padding(vertical = 8.dp)
                                    .background(Color.Black.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                                    .padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Person, null, tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column { Text(client.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp); Text("CC: ${client.id}", color = Color.Gray, fontSize = 12.sp) }
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                            }
                        } else if (transferQuery.isNotEmpty()) Text("No encontrado", color = Color.Gray)
                    } else {
                        Text("Transferir a:", color = Color.Gray, fontSize = 12.sp)
                        Row(modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF4CAF50).copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                            .padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Person, null, tint = Color(0xFF4CAF50))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) { Text(selectedNewOwner!!.name, color = Color.White, fontWeight = FontWeight.Bold); Text("CC: ${selectedNewOwner!!.id}", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp) }
                            IconButton(onClick = { selectedNewOwner = null; transferQuery = "" }) { Icon(Icons.Default.Close, null, tint = Color.Gray) }
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { showTransferDialog = false }) { Text("Cancelar", color = Color.Gray) }
                        Button(onClick = { if (selectedNewOwner != null) db.collection("vehicles").document(vehicle.plate).update("client_id", selectedNewOwner!!.id).addOnSuccessListener { Toast.makeText(context, "Transferido", Toast.LENGTH_SHORT).show(); showTransferDialog = false; onUpdate() } }, enabled = selectedNewOwner != null, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))) { Text("Confirmar") }
                    }
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("¿Eliminar?") }, text = { Text("Se borrará permanentemente.") },
            confirmButton = { TextButton(onClick = { db.collection("vehicles").document(vehicle.plate).delete().addOnSuccessListener { onUpdate(); showDeleteConfirm = false } }) { Text("Eliminar", color = Color.Red) } },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancelar") } }
        )
    }
}

// --- CÉLULA DE EDICIÓN ---
@Composable
fun EditInfoCell(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, isNumber: Boolean = false) {
    Column(modifier = modifier) {
        Text(label, color = Color.Gray, fontSize = 11.sp, modifier = Modifier.padding(start = 4.dp, bottom = 2.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange, modifier = Modifier.fillMaxWidth(),
            textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color.White, unfocusedBorderColor = Color.Gray.copy(alpha = 0.5f), cursorColor = Color.White, focusedContainerColor = Color.Black.copy(alpha = 0.2f), unfocusedContainerColor = Color.Black.copy(alpha = 0.2f)),
            keyboardOptions = if (isNumber) KeyboardOptions(keyboardType = KeyboardType.Number) else KeyboardOptions.Default,
        )
    }
}

// --- CÉLULAS UI ---
@Composable
fun ClientDirectoryRow(client: Client, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF15202B)), elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier
            .padding(16.dp)
            .fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier
                .size(40.dp)
                .background(Color(0xFFE63946), RoundedCornerShape(50)), contentAlignment = Alignment.Center) {
                Text(text = client.name.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = client.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = "CC: ${client.id}", color = Color.Gray, fontSize = 12.sp)
                if (client.phone.isNotEmpty()) Text(text = "Tel: ${client.phone}", color = Color.Gray, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun VehicleItemRow(vehicle: Vehicle, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2D45)), border = androidx.compose.foundation.BorderStroke(1.dp, Color.Gray.copy(alpha = 0.3f))
    ) {
        Row(modifier = Modifier
            .padding(16.dp)
            .fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Settings, null, tint = Color.Gray)
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = "${vehicle.brand} ${vehicle.line}", color = Color.White, fontWeight = FontWeight.Bold)
                Text(text = vehicle.plate, color = Color(0xFFE63946), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun customClientColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White, unfocusedTextColor = Color.White.copy(alpha = 0.9f),
    cursorColor = Color.White, focusedBorderColor = Color.White, unfocusedBorderColor = Color.Gray,
    focusedLabelColor = Color.White, unfocusedLabelColor = Color.Gray, unfocusedContainerColor = Color.Black.copy(alpha = 0.3f)
)
