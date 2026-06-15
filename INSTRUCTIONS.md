# 🚀 Instrucciones de Operación - JamSpotify

Esta guía detalla cómo iniciar, detener y administrar los servidores de **JamSpotify** en tu ordenador.

---

## 🛠️ Requisitos Previos
1. Tener instalado **Node.js** (versión 18 o superior recomendada).
2. Haber configurado el archivo [backend/.env](file:///c:/JamSpotify/backend/.env) con tus credenciales de Spotify Developer.

---

## 🏁 Cómo Iniciar el Servidor

Tienes dos modalidades para ejecutar JamSpotify según tus necesidades de uso o desarrollo:

### Opción A: Modo de Desarrollo (Recomendado para pruebas)
Inicia el backend y el frontend al mismo tiempo en modo observador. Cualquier cambio que hagas en los archivos reiniciará el servidor automáticamente.

1. Abre tu terminal en la carpeta raíz del proyecto (`c:/JamSpotify`).
2. Ejecuta el comando:
   ```bash
   npm run dev
   ```
   * **Frontend (Vite):** http://localhost:5173 (Acceso para el host)
   * **Backend (API):** http://localhost:3000

### Opción B: Modo de Producción (Servidor único y más óptimo)
Compila el frontend estáticamente y lo sirve todo en un único puerto (el 3000), ahorrando recursos.

1. Abre tu terminal en la carpeta raíz (`c:/JamSpotify`).
2. Compila el cliente frontend (solo se requiere hacer una vez o tras cambios visuales):
   ```bash
   npm run build
   ```
3. Inicia el servidor de backend en modo producción:
   ```bash
   npm start
   ```
   * **Acceso Host e Invitados:** http://localhost:3000

---

## 🔄 Restablecer Datos de la Sala

Si la aplicación experimenta desincronizaciones severas con Spotify, fallos de API o deseas iniciar una fiesta completamente limpia:

1. En el panel superior derecho del **Dashboard del Anfitrión**, haz clic en el botón rojo **Restablecer Sala**.
2. Confirma la acción en la ventana emergente.
3. El sistema realizará las siguientes acciones:
   * Vaciar la cola colaborativa (`jamQueue`) y el historial (`jamHistory`).
   * Desconectar a todos los usuarios invitados aprobados y en lista de espera.
   * Eliminar el archivo de persistencia `jam_state.json` del disco.
   * Eliminar las credenciales de sesión activas `tokens.json`.
4. El navegador te redirigirá automáticamente a la pantalla de bienvenida para que puedas iniciar sesión como anfitrión de nuevo.

---

## 🛑 Cómo Detener/Cerrar el Servidor

Para apagar la aplicación de forma segura:

1. Ve a la terminal donde se está ejecutando el comando de inicio (`npm run dev` o `npm start`).
2. Presiona la combinación de teclas en tu teclado:
   * **`Ctrl + C`**
3. Si la terminal te pregunta `¿Desea terminar el trabajo por lotes (S/N)?` o `Terminate batch job (Y/N)?`, presiona **`S`** (o **`Y`**) y pulsa **Enter**.

El servidor se apagará inmediatamente y liberará los puertos.

---

## ⚠️ Resolución de Problemas: "Puerto ya en uso" (EADDRINUSE)

Si al intentar iniciar el servidor obtienes un error como `Error: listen EADDRINUSE: address already in use :::3000`, significa que hay un proceso fantasma del backend que no se cerró correctamente.

### Solución en Windows (PowerShell / CMD)
Para encontrar y forzar el cierre del proceso que está ocupando el puerto `3000`:

1. Abre una terminal de PowerShell y escribe:
   ```powershell
   netstat -ano | findstr :3000
   ```
2. Verás una lista de conexiones. Busca el número al final de la línea (el PID). Ejemplo:
   ```text
   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12432
   ```
   *(En este ejemplo, el PID es `12432`)*.
3. Termina ese proceso ejecutando:
   ```powershell
   taskkill /F /PID 12432
   ```

### Solución en macOS / Linux (Terminal)
1. Ejecuta el siguiente comando para encontrar el PID en el puerto 3000:
   ```bash
   lsof -i :3000
   ```
2. Termina el proceso usando su PID:
   ```bash
   kill -9 <PID>
   ```
