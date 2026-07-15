package com.ae.ss_app.ui.admin

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ae.ss_app.R
import com.ae.ss_app.model.Service
import com.ae.ss_app.utils.SECTIONS_MAP
import com.ae.ss_app.utils.getNextCode
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class,
    ExperimentalLayoutApi::class
)
@Composable
fun AdminServicesScreen(
    onNavigateBack: () -> Unit = {}
) {
    var servicesList by remember { mutableStateOf<List<Service>>(emptyList()) }
    var filteredList by remember { mutableStateOf<List<Service>>(emptyList()) }

    var searchText by remember { mutableStateOf(TextFieldValue("")) }
    var selectedGroupFilters by remember { mutableStateOf<Set<String>>(emptySet()) }

    var isLoading by remember { mutableStateOf(true) }
    var expandedSections by remember { mutableStateOf(setOf<String>()) }
    var showDialog by remember { mutableStateOf(false) }
    var currentService by remember { mutableStateOf<Service?>(null) }

    val db = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    val groupOptions = listOf("Especifico", "Elemental", "Esencial", "General")
    val bgBlack = Color(0xFF000000)
    val textWhite = Color(0xFFFFFFFF)
    val pureWhite = Color.White

    // 1. CARGA DE DATOS
    LaunchedEffect(Unit) {
        db.collection("services")
            .orderBy("item_code")
            .addSnapshotListener { snapshot, e ->
                if (e != null) {
                    isLoading = false
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val services = snapshot.toObjects(Service::class.java)
                    services.forEachIndexed { index, service ->
                        service.id = snapshot.documents[index].id
                    }
                    servicesList = services
                    filteredList = services
                    isLoading = false
                }
            }
    }

    // 2. FILTRADO
    LaunchedEffect(searchText.text, selectedGroupFilters) {
        val queryRaw = searchText.text.trim().lowercase()
        val textFiltered = if (queryRaw.isEmpty()) {
            servicesList
        } else {
            val tokens = queryRaw.split(Regex("\\s+"))
            servicesList.filter { service ->
                val fullText = "${service.itemCode} ${service.description} ${service.section}".lowercase()
                tokens.all { token -> fullText.contains(token) }
            }
        }
        filteredList = if (selectedGroupFilters.isEmpty()) {
            textFiltered
        } else {
            textFiltered.filter { service ->
                selectedGroupFilters.all { filter -> service.serviceGroup.contains(filter, ignoreCase = true) }
            }
        }
    }

    val groupedServices = filteredList.groupBy { it.section }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gestión de Servicios", color = textWhite) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = bgBlack, titleContentColor = textWhite, navigationIconContentColor = textWhite),
                navigationIcon = { IconButton(onClick = onNavigateBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = textWhite) } }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { currentService = null; showDialog = true }, containerColor = pureWhite, contentColor = bgBlack) {
                Icon(Icons.Default.Add, "Nuevo")
            }
        },
        containerColor = Color.Transparent
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
            Image(painter = painterResource(id = R.drawable.admin_background), contentDescription = "Fondo", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            Column(modifier = Modifier.fillMaxSize().padding(padding)) {

                // BUSCADOR
                OutlinedTextField(
                    value = searchText, onValueChange = { searchText = it },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text("Buscar...", color = Color.Gray) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.Gray) },
                    trailingIcon = { if (searchText.text.isNotEmpty()) IconButton(onClick = { searchText = TextFieldValue("") }) { Icon(Icons.Default.Close, null, tint = Color.Gray) } },
                    colors = customTextFieldColors(), singleLine = true
                )

                // FILTROS
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    groupOptions.forEach { groupName ->
                        val isSelected = selectedGroupFilters.contains(groupName)
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedGroupFilters = if (isSelected) selectedGroupFilters - groupName else selectedGroupFilters + groupName },
                            label = { Text(groupName) },
                            leadingIcon = if (isSelected) { { Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) } } else null,
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color.White, selectedLabelColor = Color.Black, containerColor = Color.Black.copy(alpha = 0.5f), labelColor = Color.LightGray)
                        )
                    }
                    if (selectedGroupFilters.isNotEmpty()) IconButton(onClick = { selectedGroupFilters = emptySet() }) { Icon(Icons.Default.Clear, "Limpiar", tint = Color.White) }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (isLoading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = pureWhite) }
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 80.dp)) {
                        groupedServices.forEach { (section, services) ->
                            val isExpanded = expandedSections.contains(section) || searchText.text.isNotEmpty() || selectedGroupFilters.isNotEmpty()
                            item { SectionHeader(title = section, count = services.size, isExpanded = isExpanded, onToggle = { expandedSections = if (isExpanded) expandedSections - section else expandedSections + section }) }
                            if (isExpanded) {
                                items(services) { service ->
                                    ServiceItemRow(service = service, onClick = { currentService = service; showDialog = true })
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        ServiceFormDialog(
            service = currentService,
            existingServices = servicesList, // Pasamos la lista completa para buscar dependencias
            onDismiss = { showDialog = false },
            onSave = { serviceToSave, oldCode ->
                if (oldCode != null && oldCode != serviceToSave.itemCode) db.collection("services").document(oldCode).delete()
                db.collection("services").document(serviceToSave.itemCode).set(serviceToSave, SetOptions.merge())
                    .addOnSuccessListener { Toast.makeText(context, "Guardado", Toast.LENGTH_SHORT).show(); showDialog = false }
                    .addOnFailureListener { Toast.makeText(context, "Error", Toast.LENGTH_SHORT).show() }
            }
        )
    }
}

// --- COMPONENTES AUXILIARES ---

@Composable
fun SectionHeader(title: String, count: Int, isExpanded: Boolean, onToggle: () -> Unit) {
    val headerBg = Color.Black.copy(alpha = 0.7f)
    Row(modifier = Modifier.fillMaxWidth().clickable { onToggle() }.background(headerBg).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = title.uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Box(modifier = Modifier.background(Color.White.copy(alpha = 0.1f), shape = MaterialTheme.shapes.small).padding(horizontal = 8.dp, vertical = 2.dp)) {
                Text(text = count.toString(), color = Color.LightGray, fontSize = 11.sp)
            }
        }
        Icon(imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.Gray)
    }
}

@Composable
fun ServiceItemRow(service: Service, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).clickable { onClick() }, colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E))) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = service.itemCode, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp, modifier = Modifier.background(Color(0xFF333333), shape = MaterialTheme.shapes.extraSmall).padding(horizontal = 6.dp, vertical = 2.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    if (service.costType.equals("Variable", ignoreCase = true)) Icon(Icons.Default.Build, "Variable", tint = Color.White, modifier = Modifier.size(14.dp))
                    // Indicador visual si tiene dependencias
                    if (service.dependencies.isNotEmpty()) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Default.Link, "Dependencias", tint = Color(0xFF4CAF50), modifier = Modifier.size(14.dp))
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(text = service.description, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                if (service.serviceGroup.isNotBlank()) Text(text = service.serviceGroup, color = Color.Gray, fontSize = 10.sp)
            }
            Text(text = "$ ${service.price}", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        }
    }
}

// --- DIÁLOGO PRINCIPAL DE EDICIÓN ---
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ServiceFormDialog(
    service: Service?,
    existingServices: List<Service>,
    onDismiss: () -> Unit,
    onSave: (Service, String?) -> Unit
) {
    val isEditing = service != null
    val originalCode = service?.itemCode
    val availableSections = SECTIONS_MAP.keys.toList().sorted()
    val groupOptions = listOf("Especifico", "Elemental", "Esencial", "General")

    var section by remember { mutableStateOf(service?.section ?: "Admisión") }
    var itemCode by remember { mutableStateOf(service?.itemCode ?: getNextCode(section, existingServices)) }
    var description by remember { mutableStateOf(service?.description ?: "") }
    var priceStr by remember { mutableStateOf(service?.price?.toString() ?: "0") }
    var costType by remember { mutableStateOf(service?.costType ?: "Fijo") }

    // --- ESTADO DE DEPENDENCIAS ---
    // Guardamos los CÓDIGOS de los servicios dependientes
    var dependencies by remember { mutableStateOf(service?.dependencies ?: emptyList()) }
    var showDependencySelector by remember { mutableStateOf(false) }

    var selectedGroups by remember { mutableStateOf(if (service?.serviceGroup.isNullOrBlank()) setOf("Especifico") else service!!.serviceGroup.split("/").map { it.trim() }.toSet()) }
    var expandedSection by remember { mutableStateOf(false) }

    LaunchedEffect(section) {
        if (isEditing && section == service?.section) itemCode = service.itemCode else itemCode = getNextCode(section, existingServices)
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2D45)), shape = MaterialTheme.shapes.medium) {
            Column(modifier = Modifier.padding(24.dp).verticalScroll(rememberScrollState())) {
                Text(text = if (isEditing) "Editar Servicio" else "Nuevo Servicio", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Spacer(modifier = Modifier.height(24.dp))

                // Campos Básicos
                if (isEditing) {
                    OutlinedTextField(
                        value = section,
                        onValueChange = {},
                        label = { Text("Sección") },
                        enabled = false,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            disabledTextColor = Color.White,
                            disabledBorderColor = Color.Gray,
                            disabledLabelColor = Color.Gray,
                            disabledContainerColor = Color.Black.copy(alpha = 0.2f)
                        )
                    )
                } else {
                    ExposedDropdownMenuBox(expanded = expandedSection, onExpandedChange = { expandedSection = !expandedSection }) {
                        OutlinedTextField(
                            value = section,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Sección") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedSection) },
                            colors = customTextFieldColors(),
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedSection,
                            onDismissRequest = { expandedSection = false },
                            modifier = Modifier.heightIn(max = 250.dp)
                        ) {
                            availableSections.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option) },
                                    onClick = { section = option; expandedSection = false }
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(value = itemCode, onValueChange = {}, label = { Text("Código") }, enabled = false, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(disabledTextColor = Color.White, disabledBorderColor = Color.Gray, disabledLabelColor = Color.Gray, disabledContainerColor = Color.Black.copy(alpha = 0.2f)))
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Descripción") }, modifier = Modifier.fillMaxWidth(), colors = customTextFieldColors(), maxLines = 3)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(value = priceStr, onValueChange = { if (it.all { c -> c.isDigit() }) priceStr = it }, label = { Text("Precio") }, modifier = Modifier.fillMaxWidth(), colors = customTextFieldColors(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))

                // Grupos
                Spacer(modifier = Modifier.height(16.dp))
                Text("Grupos:", color = Color.Gray, fontSize = 14.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    groupOptions.forEach { option ->
                        val isSelected = selectedGroups.contains(option)
                        FilterChip(selected = isSelected, onClick = { selectedGroups = if (isSelected) (if (selectedGroups.size > 1) selectedGroups - option else selectedGroups) else selectedGroups + option }, label = { Text(option) }, leadingIcon = if (isSelected) { { Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp)) } } else null)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Costo:", color = Color.Gray); Spacer(modifier = Modifier.width(8.dp))
                    FilterChip(selected = costType == "Fijo", onClick = { costType = "Fijo" }, label = { Text("Fijo") }); Spacer(modifier = Modifier.width(8.dp))
                    FilterChip(selected = costType == "Variable", onClick = { costType = "Variable" }, label = { Text("Variable") })
                }

                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Color.Gray.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(16.dp))

                // --- ZONA DE DEPENDENCIAS ---
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Dependencias", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    IconButton(onClick = { showDependencySelector = true }) {
                        Icon(Icons.Default.AddCircle, "Añadir dependencia", tint = Color(0xFF4CAF50))
                    }
                }

                if (dependencies.isEmpty()) {
                    Text("No tiene dependencias.", color = Color.Gray, fontSize = 12.sp, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                } else {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        dependencies.forEach { depCode ->
                            val depService = existingServices.find { it.itemCode == depCode }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .background(Color.Black.copy(alpha = 0.3f), MaterialTheme.shapes.small)
                                    .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(depService?.description ?: "Servicio desconocido ($depCode)", color = Color.White, fontSize = 12.sp, maxLines = 1)
                                    Text("Código: $depCode", color = Color.Gray, fontSize = 10.sp)
                                }
                                IconButton(onClick = { dependencies = dependencies - depCode }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Delete, "Quitar", tint = Color(0xFFE63946), modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Botones Guardar
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)) { Text("Cancelar", color = Color.Gray) }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val finalGroupString = selectedGroups.sorted().joinToString("/")
                            val newService = Service(itemCode = itemCode, section = section, description = description, price = priceStr.toIntOrNull() ?: 0, costType = costType, serviceGroup = finalGroupString, dependencies = dependencies, id = service?.id ?: "")
                            onSave(newService, originalCode)
                        }, colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                    ) { Text(if (isEditing) "Guardar" else "Crear", color = Color.Black) }
                }
            }
        }
    }

    // --- DIÁLOGO SELECCIONAR DEPENDENCIA ---
    if (showDependencySelector) {
        ServiceSelectionDialog(
            allServices = existingServices,
            currentServiceCode = itemCode, // Para no seleccionarse a sí mismo
            currentDependencies = dependencies, // Para no duplicar
            onDismiss = { showDependencySelector = false },
            onServiceSelected = { selectedCode ->
                dependencies = dependencies + selectedCode
                showDependencySelector = false
            }
        )
    }
}

// --- NUEVO DIÁLOGO DE BÚSQUEDA DE SERVICIOS ---
@Composable
fun ServiceSelectionDialog(
    allServices: List<Service>,
    currentServiceCode: String,
    currentDependencies: List<String>,
    onDismiss: () -> Unit,
    onServiceSelected: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }

    // Filtrar: Que no sea él mismo, que no esté ya agregado, y que coincida con la búsqueda
    val filtered = allServices.filter {
        it.itemCode != currentServiceCode &&
                !currentDependencies.contains(it.itemCode) &&
                (it.description.contains(query, ignoreCase = true) || it.itemCode.contains(query, ignoreCase = true))
    }.take(20) // Limitar resultados

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().height(500.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF15202B)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Agregar Dependencia", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = query, onValueChange = { query = it },
                    placeholder = { Text("Buscar servicio...") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = customTextFieldColors(),
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.Gray) }
                )

                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(filtered) { service ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onServiceSelected(service.itemCode) }
                                .padding(vertical = 8.dp)
                                .background(Color(0xFF1E2D45), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(service.description, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("${service.section} - Código: ${service.itemCode}", color = Color.Gray, fontSize = 12.sp)
                            }
                            Icon(Icons.Default.Add, null, tint = Color(0xFF4CAF50))
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }

                Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)) {
                    Text("Cerrar", color = Color.Gray)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun customTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White, unfocusedTextColor = Color.White.copy(alpha = 0.9f),
    cursorColor = Color(0xFFFFFFFF), focusedBorderColor = Color(0xFFFFFFFF), unfocusedBorderColor = Color.Gray,
    focusedLabelColor = Color(0xFFFFFFFF), unfocusedLabelColor = Color.Gray,
    unfocusedContainerColor = Color.Black.copy(alpha = 0.3f), focusedContainerColor = Color.Black.copy(alpha = 0.5f)
)
