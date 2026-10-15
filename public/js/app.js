/* ==========================================================================
   app.js  -  Lógica de todas las páginas de Sazón
   Cada página tiene su función "iniciarPagina...". Al final del archivo se
   llaman todas, pero cada una se sale sola si no es la página actual.
   ========================================================================== */

var COSTO_ENVIO = 10; // debe ser igual al del servidor


/* ==========================================================================
   FUNCIONES GENERALES
   ========================================================================== */

// Muestra un número como precio: 100 -> "Q100", 38.5 -> "Q38.50"
function formatoQ(numero) {
  var n = Number(numero);
  if (n % 1 === 0) {
    return "Q" + n;
  }
  return "Q" + n.toFixed(2);
}

// Mensaje pequeño que aparece unos segundos y se quita
function mostrarMensaje(texto) {
  var mensaje = document.createElement("div");
  mensaje.className = "toast";
  mensaje.textContent = texto;
  document.querySelector(".phone").appendChild(mensaje);
  setTimeout(function () {
    mensaje.remove();
  }, 1800);
}

// Habla con el servidor (la API). Devuelve la respuesta ya convertida a datos.
async function llamarApi(url, metodo, datos) {
  var opciones = {
    method: metodo,
    headers: { "Content-Type": "application/json" }
  };
  if (datos) {
    opciones.body = JSON.stringify(datos);
  }

  var respuesta = await fetch(url, opciones);
  var json = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(json.error || "Ocurrió un error");
  }
  return json;
}

// Lee un valor de la dirección, ejemplo: menu.html?id=3  ->  obtenerParametro("id") = "3"
function obtenerParametro(nombre) {
  var parametros = new URLSearchParams(window.location.search);
  return parametros.get(nombre);
}


/* ==========================================================================
   USUARIO (se guarda en el navegador con localStorage)
   ========================================================================== */

function guardarUsuario(usuario) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

function obtenerUsuario() {
  var datos = localStorage.getItem("usuario");
  if (datos) {
    return JSON.parse(datos);
  }
  return null;
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
}


/* ==========================================================================
   CARRITO (lista de platillos que el usuario va eligiendo)
   ========================================================================== */

function obtenerCarrito() {
  var datos = localStorage.getItem("carrito");
  if (datos) {
    return JSON.parse(datos);
  }
  return [];
}

function guardarCarrito(carrito) {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function vaciarCarrito() {
  localStorage.removeItem("carrito");
  localStorage.removeItem("notas");
}

// Agrega un platillo. Si ya estaba en el carrito, solo suma la cantidad.
function agregarAlCarrito(producto, cantidad) {
  var carrito = obtenerCarrito();
  var encontrado = false;

  for (var i = 0; i < carrito.length; i++) {
    if (carrito[i].id === producto.id) {
      carrito[i].cantidad = carrito[i].cantidad + cantidad;
      encontrado = true;
    }
  }

  if (!encontrado) {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad
    });
  }

  guardarCarrito(carrito);
}

function calcularSubtotal(carrito) {
  var subtotal = 0;
  for (var i = 0; i < carrito.length; i++) {
    subtotal = subtotal + carrito[i].precio * carrito[i].cantidad;
  }
  return subtotal;
}


/* ==========================================================================
   PÁGINA: index.html  (menú del día)
   ========================================================================== */

var listaProductos = []; // aquí guardamos los platillos que llegan del servidor

// Muestra "Hola, Nombre · Cerrar sesión" si hay un usuario con sesión
function mostrarSaludo() {
  var saludo = document.getElementById("saludo");
  var usuario = obtenerUsuario();

  if (!usuario) {
    saludo.style.display = "none";
    return;
  }

  saludo.textContent = "Hola, " + usuario.nombre + " · ";
  var enlace = document.createElement("a");
  enlace.href = "#";
  enlace.textContent = "Cerrar sesión";
  enlace.addEventListener("click", function (evento) {
    evento.preventDefault();
    cerrarSesion();
    window.location.reload();
  });
  saludo.appendChild(enlace);
}

// Dibuja las tarjetas de los platillos que se pasen en la lista
function dibujarTarjetas(lista) {
  var cuadricula = document.getElementById("menuGrid");

  if (lista.length === 0) {
    cuadricula.innerHTML = '<p class="mensaje-vacio">No hay platillos con ese nombre.</p>';
    return;
  }

  var html = "";
  for (var i = 0; i < lista.length; i++) {
    var p = lista[i];
    html += '<a class="dish-card" href="menu.html?id=' + p.id + '">';
    html += '  <div class="dish-photo">';
    html += '    <img src="' + p.imagen + '" alt="' + p.nombre + '">';
    html += '    <span class="dish-tag">' + p.nombre + '</span>';
    html += '  </div>';
    html += '  <div class="dish-foot">';
    html += '    <span class="dish-price">' + formatoQ(p.precio) + '</span>';
    html += '    <button class="add-btn" type="button" data-id="' + p.id + '" aria-label="Agregar ' + p.nombre + '">+</button>';
    html += '  </div>';
    html += '</a>';
  }
  cuadricula.innerHTML = html;

  // Botones "+" de cada tarjeta
  var botones = cuadricula.querySelectorAll(".add-btn");
  botones.forEach(function (boton) {
    boton.addEventListener("click", function (evento) {
      evento.preventDefault();   // evita que se abra la página de detalle
      evento.stopPropagation();

      var id = Number(boton.getAttribute("data-id"));
      var producto = listaProductos.find(function (p) {
        return p.id === id;
      });

      agregarAlCarrito(producto, 1);
      mostrarMensaje(producto.nombre + " agregado");
    });
  });
}

async function iniciarPaginaInicio() {
  var cuadricula = document.getElementById("menuGrid");
  if (!cuadricula) {
    return; // no estamos en index.html
  }

  mostrarSaludo();

  // Pedimos los platillos al servidor
  try {
    listaProductos = await llamarApi("/api/productos", "GET");
  } catch (error) {
    cuadricula.innerHTML = '<p class="mensaje-vacio">No se pudo cargar el menú. Revisa que el servidor y la base de datos estén encendidos.</p>';
    return;
  }

  document.getElementById("contadorPlatillos").textContent = listaProductos.length + " platillos";
  dibujarTarjetas(listaProductos);

  // Buscador: filtra los platillos mientras se escribe
  var cajaBusqueda = document.getElementById("searchInput");
  cajaBusqueda.addEventListener("input", function () {
    var texto = cajaBusqueda.value.toLowerCase();
    var filtrados = listaProductos.filter(function (p) {
      return p.nombre.toLowerCase().indexOf(texto) !== -1;
    });
    dibujarTarjetas(filtrados);
  });

  // Botón de abajo: "Crear pedido / Ingresar"
  document.getElementById("botonPedido").addEventListener("click", function () {
    if (!obtenerUsuario()) {
      window.location.href = "login.html";
    } else if (obtenerCarrito().length === 0) {
      mostrarMensaje("Agrega al menos un platillo");
    } else {
      window.location.href = "checkout.html";
    }
  });
}


/* ==========================================================================
   PÁGINA: menu.html  (detalle de un platillo)
   ========================================================================== */

async function iniciarPaginaDetalle() {
  var titulo = document.getElementById("nombrePlatillo");
  if (!titulo) {
    return;
  }

  var id = obtenerParametro("id") || 1;
  var producto;

  try {
    producto = await llamarApi("/api/productos/" + id, "GET");
  } catch (error) {
    titulo.textContent = "Platillo no encontrado";
    return;
  }

  document.getElementById("fotoPlatillo").innerHTML =
    '<img src="' + producto.imagen + '" alt="' + producto.nombre + '">';
  titulo.textContent = producto.nombre;
  document.getElementById("precioPlatillo").textContent = formatoQ(producto.precio);
  document.getElementById("descripcionPlatillo").textContent = producto.descripcion;

  var cantidad = 1;

  function actualizarTotal() {
    document.getElementById("cantidad").textContent = cantidad;
    document.getElementById("totalPlatillo").textContent = formatoQ(producto.precio * cantidad);
  }
  actualizarTotal();

  document.getElementById("menos").addEventListener("click", function () {
    if (cantidad > 1) {
      cantidad = cantidad - 1;
      actualizarTotal();
    }
  });

  document.getElementById("mas").addEventListener("click", function () {
    cantidad = cantidad + 1;
    actualizarTotal();
  });

  document.getElementById("agregarPedido").addEventListener("click", function () {
    agregarAlCarrito(producto, cantidad);
    window.location.href = "checkout.html";
  });
}


/* ==========================================================================
   PÁGINA: login.html  (registro e inicio de sesión)
   ========================================================================== */

function iniciarPaginaLogin() {
  var formulario = document.getElementById("authForm");
  if (!formulario) {
    return;
  }

  var titulo = document.getElementById("authTitle");
  var botonEnviar = document.getElementById("authSubmit");
  var enlaceCambiar = document.getElementById("authToggle");
  var campoNombre = document.getElementById("nameField");
  var inputNombre = document.getElementById("nombre");
  var mensajeError = document.getElementById("mensajeError");
  var esRegistro = true;

  // Cambiar entre "Regístrate" e "Inicia sesión"
  enlaceCambiar.addEventListener("click", function (evento) {
    if (evento.target.tagName !== "A") {
      return;
    }
    evento.preventDefault();
    esRegistro = !esRegistro;
    mensajeError.textContent = "";

    if (esRegistro) {
      titulo.textContent = "Regístrate";
      botonEnviar.textContent = "Crear cuenta";
      campoNombre.style.display = "block";
      inputNombre.required = true;
      enlaceCambiar.innerHTML = '¿Ya tienes cuenta? <a href="#">Inicia sesión</a>';
    } else {
      titulo.textContent = "Inicia sesión";
      botonEnviar.textContent = "Ingresar";
      campoNombre.style.display = "none";
      inputNombre.required = false;
      enlaceCambiar.innerHTML = '¿Aún no tienes cuenta? <a href="#">Regístrate</a>';
    }
  });

  // Enviar el formulario
  formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    mensajeError.textContent = "";
    botonEnviar.disabled = true;

    var correo = document.getElementById("correo").value.trim();
    var clave = document.getElementById("clave").value;

    try {
      var usuario;
      if (esRegistro) {
        usuario = await llamarApi("/api/registro", "POST", {
          nombre: inputNombre.value.trim(),
          correo: correo,
          clave: clave
        });
      } else {
        usuario = await llamarApi("/api/login", "POST", {
          correo: correo,
          clave: clave
        });
      }

      guardarUsuario(usuario);

      // Si ya había platillos elegidos, seguimos al pedido; si no, volvemos al menú
      if (obtenerCarrito().length > 0) {
        window.location.href = "checkout.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      mensajeError.textContent = error.message;
      botonEnviar.disabled = false;
    }
  });
}


/* ==========================================================================
   PÁGINA: checkout.html  (resumen del pedido)
   ========================================================================== */

function dibujarPedido() {
  var carrito = obtenerCarrito();
  var lista = document.getElementById("listaPedido");

  if (carrito.length === 0) {
    lista.innerHTML = '<p class="mensaje-vacio">Tu pedido está vacío. Regresa al menú para elegir platillos.</p>';
  } else {
    var html = "";
    for (var i = 0; i < carrito.length; i++) {
      var item = carrito[i];
      html += '<div class="item-row">';
      html += '  <div><strong>' + item.nombre + '</strong>';
      html += '  <small>' + formatoQ(item.precio) + ' x ' + item.cantidad + '</small></div>';
      html += '  <div class="item-right">' + formatoQ(item.precio * item.cantidad);
      html += '    <button class="quitar-btn" type="button" data-id="' + item.id + '">Quitar</button>';
      html += '  </div>';
      html += '</div>';
    }
    lista.innerHTML = html;
  }

  var subtotal = calcularSubtotal(carrito);
  var envio = carrito.length > 0 ? COSTO_ENVIO : 0;
  document.getElementById("subtotal").textContent = formatoQ(subtotal);
  document.getElementById("envio").textContent = formatoQ(envio);
  document.getElementById("total").textContent = formatoQ(subtotal + envio);

  // Botones "Quitar"
  var botones = lista.querySelectorAll(".quitar-btn");
  botones.forEach(function (boton) {
    boton.addEventListener("click", function () {
      var id = Number(boton.getAttribute("data-id"));
      var nuevo = obtenerCarrito().filter(function (item) {
        return item.id !== id;
      });
      guardarCarrito(nuevo);
      dibujarPedido();
    });
  });
}

function iniciarPaginaResumen() {
  var lista = document.getElementById("listaPedido");
  if (!lista) {
    return;
  }

  var cajaNotas = document.getElementById("notas");
  cajaNotas.value = localStorage.getItem("notas") || "";

  dibujarPedido();

  document.getElementById("continuarPago").addEventListener("click", function () {
    if (obtenerCarrito().length === 0) {
      mostrarMensaje("Tu pedido está vacío");
      return;
    }
    localStorage.setItem("notas", cajaNotas.value);

    if (!obtenerUsuario()) {
      window.location.href = "login.html";
    } else {
      window.location.href = "payment.html";
    }
  });
}


/* ==========================================================================
   PÁGINA: payment.html  (método de pago y confirmar pedido)
   ========================================================================== */

function iniciarPaginaPago() {
  var opciones = document.querySelectorAll(".pay-option");
  if (opciones.length === 0) {
    return;
  }

  // Si no hay sesión o no hay platillos, no tiene sentido estar aquí
  if (!obtenerUsuario()) {
    window.location.href = "login.html";
    return;
  }
  if (obtenerCarrito().length === 0) {
    window.location.href = "index.html";
    return;
  }

  var formularioTarjeta = document.getElementById("cardForm");
  var botonConfirmar = document.getElementById("confirmPayment");
  var mensajeError = document.getElementById("mensajeError");
  var metodo = "tarjeta"; // método elegido por defecto

  // Elegir método de pago
  opciones.forEach(function (opcion) {
    opcion.addEventListener("click", function () {
      opciones.forEach(function (o) {
        o.classList.remove("selected");
      });
      opcion.classList.add("selected");

      metodo = opcion.getAttribute("data-method");
      if (metodo === "tarjeta") {
        formularioTarjeta.style.display = "block";
      } else {
        formularioTarjeta.style.display = "none";
      }
      mensajeError.textContent = "";
    });
  });

  // Confirmar el pedido
  botonConfirmar.addEventListener("click", async function () {
    mensajeError.textContent = "";

    // Si paga con tarjeta, revisamos que los datos estén completos.
    // Los datos de la tarjeta NO se guardan ni se envían al servidor (es un proyecto de práctica).
    if (metodo === "tarjeta") {
      var nombreTarjeta = document.getElementById("cardName").value.trim();
      var numeroTarjeta = document.getElementById("cardNumber").value.replace(/\s/g, "");
      var codigoTarjeta = document.getElementById("cardCode").value.trim();

      if (nombreTarjeta === "" || numeroTarjeta.length < 12 || codigoTarjeta.length < 3) {
        mensajeError.textContent = "Completa los datos de la tarjeta";
        return;
      }
    }

    // Armamos la lista de platillos para mandar al servidor
    var carrito = obtenerCarrito();
    var items = [];
    for (var i = 0; i < carrito.length; i++) {
      items.push({ producto_id: carrito[i].id, cantidad: carrito[i].cantidad });
    }

    botonConfirmar.disabled = true;

    try {
      var pedido = await llamarApi("/api/pedidos", "POST", {
        usuario_id: obtenerUsuario().id,
        metodo_pago: metodo === "tarjeta" ? "tarjeta" : "contra_entrega",
        notas: localStorage.getItem("notas") || "",
        items: items
      });

      vaciarCarrito();
      window.location.href = "confirmation.html?id=" + pedido.id;
    } catch (error) {
      mensajeError.textContent = error.message;
      botonConfirmar.disabled = false;
    }
  });
}


/* ==========================================================================
   PÁGINA: confirmation.html  (pedido confirmado)
   ========================================================================== */

async function iniciarPaginaConfirmacion() {
  var espacioNumero = document.getElementById("numeroPedido");
  if (!espacioNumero) {
    return;
  }

  var id = obtenerParametro("id");
  var pedido;

  try {
    pedido = await llamarApi("/api/pedidos/" + id, "GET");
  } catch (error) {
    espacioNumero.textContent = "No encontrado";
    return;
  }

  // El número se muestra con ceros: pedido 1 -> "No.001"
  espacioNumero.textContent = "No." + String(pedido.id).padStart(3, "0");

  var html = "";
  for (var i = 0; i < pedido.items.length; i++) {
    var item = pedido.items[i];
    html += '<div class="fila"><span>' + item.nombre + ' x ' + item.cantidad + '</span>';
    html += '<span>' + formatoQ(item.precio_unitario * item.cantidad) + '</span></div>';
  }
  html += '<div class="fila"><span>Envío</span><span>' + formatoQ(pedido.envio) + '</span></div>';
  html += '<div class="fila total"><span>Total</span><span>' + formatoQ(pedido.total) + '</span></div>';
  document.getElementById("resumenFinal").innerHTML = html;

  if (pedido.notas) {
    document.getElementById("notaPedido").textContent = "Nota: " + pedido.notas;
  }
}


/* ==========================================================================
   Al cargar la página, iniciamos la que corresponda
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  iniciarPaginaInicio();
  iniciarPaginaDetalle();
  iniciarPaginaLogin();
  iniciarPaginaResumen();
  iniciarPaginaPago();
  iniciarPaginaConfirmacion();
});
