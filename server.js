/* ==========================================================================
   server.js  -  Servidor de Sazón
   Hace tres cosas:
   1. Muestra las páginas que están en la carpeta "public"
   2. Se conecta a la base de datos MySQL
   3. Ofrece la API (las rutas /api/...) que usa la página
   ========================================================================== */

// Cargamos las variables que escribiste en el archivo .env
require("dotenv").config();

var express = require("express");
var mysql = require("mysql2/promise");
var crypto = require("crypto"); // viene con Node.js, sirve para encriptar claves
var path = require("path");

var app = express();
var COSTO_ENVIO = 10; // envio fijo en quetzales

// Permite leer datos JSON que llegan desde la página
app.use(express.json());

// Muestra los archivos de la carpeta public (html, css, js, imagenes)
app.use(express.static(path.join(__dirname, "public")));


// ---------- Conexión a la base de datos ----------
var db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});


// ---------- Funciones para proteger las claves ----------
// Nunca se guarda la clave tal cual. Se mezcla con un texto al azar ("sal")
// y se guarda el resultado, así nadie puede leer la clave original.

function encriptarClave(clave) {
  var sal = crypto.randomBytes(16).toString("hex");
  var hash = crypto.scryptSync(clave, sal, 64).toString("hex");
  return sal + ":" + hash;
}

function claveCorrecta(clave, claveGuardada) {
  var partes = claveGuardada.split(":");
  var sal = partes[0];
  var hashGuardado = partes[1];
  var hashNuevo = crypto.scryptSync(clave, sal, 64).toString("hex");
  return hashNuevo === hashGuardado;
}


/* ==========================================================================
   RUTAS DE USUARIOS
   ========================================================================== */

// POST /api/registro  ->  crea un usuario nuevo
app.post("/api/registro", async function (req, res) {
  try {
    var nombre = (req.body.nombre || "").trim();
    var correo = (req.body.correo || "").trim().toLowerCase();
    var clave = req.body.clave || "";

    if (nombre === "" || correo === "" || clave === "") {
      return res.status(400).json({ error: "Completa todos los campos" });
    }
    if (clave.length < 6) {
      return res.status(400).json({ error: "La clave debe tener al menos 6 caracteres" });
    }

    // Revisamos que el correo no esté ya registrado
    var consulta = await db.query("SELECT id FROM usuarios WHERE correo = ?", [correo]);
    if (consulta[0].length > 0) {
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    }

    var resultado = await db.query(
      "INSERT INTO usuarios (nombre, correo, clave) VALUES (?, ?, ?)",
      [nombre, correo, encriptarClave(clave)]
    );

    res.status(201).json({ id: resultado[0].insertId, nombre: nombre, correo: correo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// POST /api/login  ->  revisa correo y clave
app.post("/api/login", async function (req, res) {
  try {
    var correo = (req.body.correo || "").trim().toLowerCase();
    var clave = req.body.clave || "";

    var consulta = await db.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);
    var usuario = consulta[0][0];

    if (!usuario || !claveCorrecta(clave, usuario.clave)) {
      return res.status(401).json({ error: "Correo o clave incorrectos" });
    }

    res.json({ id: usuario.id, nombre: usuario.nombre, correo: usuario.correo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


/* ==========================================================================
   RUTAS DE PRODUCTOS
   ========================================================================== */

// GET /api/productos  ->  lista de todos los platillos disponibles
app.get("/api/productos", async function (req, res) {
  try {
    var consulta = await db.query("SELECT * FROM productos WHERE disponible = 1 ORDER BY id");
    var lista = consulta[0].map(function (p) {
      return {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: Number(p.precio),
        imagen: p.imagen
      };
    });
    res.json(lista);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// GET /api/productos/:id  ->  un solo platillo
app.get("/api/productos/:id", async function (req, res) {
  try {
    var consulta = await db.query(
      "SELECT * FROM productos WHERE id = ? AND disponible = 1",
      [req.params.id]
    );
    var p = consulta[0][0];
    if (!p) {
      return res.status(404).json({ error: "Platillo no encontrado" });
    }
    res.json({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: Number(p.precio),
      imagen: p.imagen
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


/* ==========================================================================
   RUTAS DE PEDIDOS
   ========================================================================== */

// POST /api/pedidos  ->  crea un pedido con sus platillos
// La página manda: usuario_id, metodo_pago, notas e items (producto_id y cantidad)
app.post("/api/pedidos", async function (req, res) {
  var conexion = await db.getConnection();

  try {
    var usuarioId = req.body.usuario_id;
    var metodoPago = req.body.metodo_pago;
    var notas = (req.body.notas || "").trim().substring(0, 200);
    var items = req.body.items;

    // 1. Revisamos que los datos básicos estén bien
    if (metodoPago !== "tarjeta" && metodoPago !== "contra_entrega") {
      return res.status(400).json({ error: "Método de pago no válido" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "El pedido está vacío" });
    }

    var usuario = await conexion.query("SELECT id FROM usuarios WHERE id = ?", [usuarioId]);
    if (usuario[0].length === 0) {
      return res.status(400).json({ error: "Usuario no válido, inicia sesión otra vez" });
    }

    // 2. Empezamos una "transacción": o se guarda todo el pedido o no se guarda nada
    await conexion.beginTransaction();

    // 3. Calculamos el subtotal con los precios REALES de la base de datos
    //    (no confiamos en los precios que manda la página)
    var subtotal = 0;
    var detalles = [];

    for (var i = 0; i < items.length; i++) {
      var cantidad = parseInt(items[i].cantidad);
      if (!cantidad || cantidad < 1) {
        throw new Error("Cantidad no válida");
      }

      var producto = await conexion.query(
        "SELECT id, precio FROM productos WHERE id = ? AND disponible = 1",
        [items[i].producto_id]
      );
      if (producto[0].length === 0) {
        throw new Error("Producto no encontrado");
      }

      var precio = Number(producto[0][0].precio);
      subtotal = subtotal + precio * cantidad;
      detalles.push({ producto_id: producto[0][0].id, cantidad: cantidad, precio: precio });
    }

    var total = subtotal + COSTO_ENVIO;

    // 4. Guardamos el pedido
    var pedido = await conexion.query(
      "INSERT INTO pedidos (usuario_id, metodo_pago, notas, subtotal, envio, total) VALUES (?, ?, ?, ?, ?, ?)",
      [usuarioId, metodoPago, notas, subtotal, COSTO_ENVIO, total]
    );
    var pedidoId = pedido[0].insertId;

    // 5. Guardamos cada platillo del pedido
    for (var j = 0; j < detalles.length; j++) {
      await conexion.query(
        "INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
        [pedidoId, detalles[j].producto_id, detalles[j].cantidad, detalles[j].precio]
      );
    }

    await conexion.commit(); // todo salió bien, confirmamos
    res.status(201).json({ id: pedidoId, total: total });
  } catch (error) {
    console.log(error);
    await conexion.rollback(); // algo falló, deshacemos todo
    res.status(400).json({ error: "No se pudo crear el pedido. Revisa los datos." });
  } finally {
    conexion.release();
  }
});

// GET /api/pedidos/:id  ->  datos de un pedido y sus platillos
app.get("/api/pedidos/:id", async function (req, res) {
  try {
    var consulta = await db.query("SELECT * FROM pedidos WHERE id = ?", [req.params.id]);
    var pedido = consulta[0][0];
    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    var detalles = await db.query(
      "SELECT d.cantidad, d.precio_unitario, p.nombre " +
      "FROM detalles_pedido d JOIN productos p ON p.id = d.producto_id " +
      "WHERE d.pedido_id = ?",
      [pedido.id]
    );

    res.json({
      id: pedido.id,
      metodo_pago: pedido.metodo_pago,
      notas: pedido.notas,
      subtotal: Number(pedido.subtotal),
      envio: Number(pedido.envio),
      total: Number(pedido.total),
      estado: pedido.estado,
      creado_en: pedido.creado_en,
      items: detalles[0].map(function (d) {
        return {
          nombre: d.nombre,
          cantidad: d.cantidad,
          precio_unitario: Number(d.precio_unitario)
        };
      })
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// ---------- Encender el servidor ----------
var puerto = process.env.PORT || 3000;
app.listen(puerto, function () {
  console.log("Servidor listo en http://localhost:" + puerto);
});
