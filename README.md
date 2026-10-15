# Sazón - App de pedidos de comida

Aplicación web para ver el menú del día, registrarse, armar un pedido y pagarlo.
Hecha con **HTML, CSS y JavaScript** (sin frameworks de CSS) en el frontend y
**Node.js + Express + MySQL** en el backend.

## Prerrequisitos

| Herramienta | Versión requerida |
|-------------|-------------------|
| Node.js     | 18 o superior (recomendado 20 LTS) |
| npm         | viene incluido con Node.js |
| MySQL       | 8.0 o superior |

Para comprobar las versiones instaladas:

```bash
node -v
npm -v
mysql --version
```

## Instalación

1. Clona o descarga este repositorio y entra a la carpeta del proyecto:

   ```bash
   cd sazon-pedidos
   ```

2. Instala las dependencias (`express`, `mysql2` y `dotenv`):

   ```bash
   npm install
   ```

## Base de datos

1. Asegúrate de que MySQL esté encendido.

2. Ejecuta el script `schema.sql`. Crea la base de datos `pedidos_db`, las tablas
   `usuarios`, `productos`, `pedidos` y `detalles_pedido`, y agrega 8 platillos de prueba.

   Desde la terminal, estando dentro de la carpeta del proyecto (funciona en
   CMD, PowerShell, Mac y Linux):

   ```bash
   mysql -u root -p -e "source schema.sql"
   ```

   (También puedes abrir `schema.sql` en MySQL Workbench y ejecutarlo completo.)

3. Crea tu archivo de variables de entorno copiando el ejemplo:

   - Windows (CMD o PowerShell): `copy .env.example .env`
   - Mac / Linux: `cp .env.example .env`

4. Abre el archivo `.env` y escribe tus datos de MySQL:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_clave_de_mysql
   DB_NAME=pedidos_db
   PORT=3000
   ```

   El archivo `.env` está en `.gitignore`, por eso no se sube al repositorio.

## Ejecución

Inicia el servidor local:

```bash
npm start
```

(o directamente `node server.js`)

Cuando aparezca el mensaje `Servidor listo en http://localhost:3000`, abre esa
dirección en el navegador.

## Cómo usar la app

1. En el menú del día, toca el botón **+** de un platillo (o entra a él para elegir la cantidad).
2. Toca **Crear pedido / Ingresar**. Si no tienes sesión, regístrate o inicia sesión.
3. Revisa el resumen, agrega notas si quieres y continúa al pago.
4. Elige tarjeta o pago contra entrega y confirma. Verás el número de tu pedido.

## Rutas de la API

| Método | Ruta                  | Qué hace |
|--------|-----------------------|----------|
| POST   | `/api/registro`       | Crea un usuario (`nombre`, `correo`, `clave`) |
| POST   | `/api/login`          | Inicia sesión (`correo`, `clave`) |
| GET    | `/api/productos`      | Lista los platillos disponibles |
| GET    | `/api/productos/:id`  | Devuelve un platillo |
| POST   | `/api/pedidos`        | Crea un pedido (`usuario_id`, `metodo_pago`, `notas`, `items`) |
| GET    | `/api/pedidos/:id`    | Devuelve un pedido con sus platillos |

Ejemplo de cuerpo para `POST /api/pedidos`:

```json
{
  "usuario_id": 1,
  "metodo_pago": "contra_entrega",
  "notas": "Sin cebolla",
  "items": [
    { "producto_id": 1, "cantidad": 2 },
    { "producto_id": 3, "cantidad": 1 }
  ]
}
```

`metodo_pago` puede ser `tarjeta` o `contra_entrega`. El servidor calcula los
precios con los datos de la base de datos (no usa los que manda la página).

## Estructura del proyecto

```
sazon-pedidos/
├── server.js          Servidor y rutas de la API
├── schema.sql         Base de datos y tablas
├── package.json       Dependencias y comando npm start
├── .env.example       Ejemplo de variables de entorno
├── .gitignore         Archivos que no se suben (node_modules, .env)
└── public/            Frontend
    ├── index.html, menu.html, login.html,
    │   checkout.html, payment.html, confirmation.html
    ├── css/style.css
    ├── js/app.js
    └── images/        Fotos de los platillos
```

## Notas

- Las claves de usuario se guardan encriptadas (módulo `crypto` de Node.js).
- Los datos de la tarjeta solo se validan en pantalla; no se guardan ni se envían al servidor.
- Es un proyecto académico: la sesión se guarda en el navegador (`localStorage`) y no usa tokens.
