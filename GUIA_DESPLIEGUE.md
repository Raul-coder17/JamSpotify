# Guía de Despliegue y Arquitectura — JamSpotify

Esta guía detalla paso a paso cómo desplegar JamSpotify en producción de forma 100% gratuita utilizando **Render** para el servidor web/frontend y **Supabase** para la base de datos PostgreSQL permanente. También explica conceptos clave de seguridad sobre el funcionamiento de la autenticación con la API de Spotify.

---

## 🧠 Concepto Clave: Credenciales de App vs. Cuentas de Usuario

Es muy común preguntarse: *¿Por qué configuro mis credenciales de Spotify en el servidor si cada usuario va a usar sus propios datos?*

La autenticación de Spotify (OAuth 2.0) funciona en dos niveles independientes:

1. **La Identidad de la Aplicación (`SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET`):**
   * Estas llaves actúan como la **firma o licencia de tu aplicación** ante los servidores de Spotify. 
   * Le dicen a Spotify: *"Este servidor de Render está ejecutando la aplicación JamSpotify creada por Raúl"*.
   * **No dan acceso a tu cuenta personal de Spotify**. Solo le dan permiso a tu servidor para solicitar de manera segura la autorización de otros usuarios.
   * Por seguridad, estas llaves nunca deben escribirse directamente en el código de programación (para evitar que se expongan públicamente en GitHub). En su lugar, se configuran como **Variables de Entorno** en Render.

2. **La Identidad de los Usuarios (Cada Host/Anfitrión):**
   * Cuando un usuario entra a tu web y hace clic en **"Iniciar como Anfitrión"**, es redirigido a una página segura de Spotify.
   * El usuario inicia sesión con **su propia cuenta personal de Spotify** y hace clic en "Aceptar".
   * Spotify detecta tu `CLIENT_ID` y emite un token de acceso específico para *ese* usuario.
   * Tu servidor guarda ese token de forma cifrada en la base de datos para controlar la reproducción de esa sala específica. **Ningún usuario puede acceder a la cuenta de otro.**

> **La Analogía del Condominio:**
> Tu `CLIENT_ID` y `CLIENT_SECRET` son la **licencia de construcción** otorgada por Spotify para levantar el edificio (tu web). Las cuentas de tus usuarios son las **llaves de cada departamento** privado. Cada persona entra con su propia llave a su respectivo espacio, de forma 100% aislada.

---

## 🛠️ Paso 1: Configurar la Base de Datos en Supabase (Gratis y Eterna)

La base de datos gratuita de Render expira automáticamente a los 90 días. Usaremos **Supabase** porque te ofrece una base de datos PostgreSQL permanente que nunca caduca.

1. Entra a [supabase.com](https://supabase.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **New Project** (Nuevo Proyecto) y rellena los datos:
   * **Project Name:** `JamSpotify`
   * **Database Password:** Elige una contraseña segura y **anótala/guárdala**, ya que la usaremos a continuación.
   * **Region:** Selecciona una región cercana a tu servidor (ej. *East US* o *West US*).
   * **Plan:** Selecciona el plan **Free** ($0/mes).
3. Haz clic en **Create new project** y espera unos 2 minutos a que se aprovisione la base de datos.
4. En el menú lateral izquierdo de tu proyecto, haz clic en el icono de **engranaje (Project Settings)**.
5. Selecciona la pestaña **Database**.
6. En la parte superior derecha de la pantalla (o en la barra de navegación superior del proyecto), haz clic en el botón verde con el icono de un enchufe que dice **Connect**.
7. En la ventana emergente, ve a la pestaña **URI** y copia la cadena de conexión. Tendrá el siguiente formato:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.asumzpktvqjewotcpdjj.supabase.co:5432/postgres
   ```
8. **Edita la URL copiada:** Reemplaza `[YOUR-PASSWORD]` (incluyendo los corchetes) por tu contraseña de base de datos real. 
   *(Ej: si tu contraseña es `ClaveSegura123`, quedará como `postgresql://postgres:ClaveSegura123@db.asumzpktvqjewotcpdjj.supabase.co:5432/postgres`)*.

Guarda este enlace editado, será tu variable `DATABASE_URL`.

---

## 🚀 Paso 2: Crear y Configurar el Web Service en Render

Render descargará el código desde GitHub, lo compilará y lo pondrá en línea.

1. Ve a tu panel de [Render](https://dashboard.render.com/) e inicia sesión.
2. Haz clic en **New +** (arriba a la derecha) y selecciona **Web Service**.
3. Selecciona tu repositorio de GitHub `Raul-coder17/JamSpotify` y haz clic en **Connect**.
4. Llena los siguientes campos:
   * **Name:** `JamSpotify` (Render generará la URL: `https://jamspotify.onrender.com`).
   * **Language:** `Node`
   * **Branch:** `main`
   * **Region:** Elige la más conveniente (ej. *Oregon (US West)*).
   * **Root Directory:** Déjalo vacío.
   * **Build Command:** Borra el texto por defecto y escribe:
     ```bash
     npm run install-all && npm run build
     ```
   * **Start Command:** Borra el texto por defecto y escribe:
     ```bash
     npm start
     ```
5. **⚠️ Importante:** Bajo la sección *"For hobby projects"*, haz clic en la tarjeta de **Free** ($0/month) para asegurar que no se realice ningún cobro.
6. En la sección **Environment Variables**, haz clic en el botón **+ Add Environment Variable** para crear las siguientes 8 variables una por una:

| Variable (`Key`) | Valor (`Value`) | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | *Pega la URI que editaste de Supabase en el Paso 1* | Conexión a la Base de Datos externa. |
| `NODE_ENV` | `production` | Indica a la app que corra en modo optimizado de producción. |
| `TOKEN_ENCRYPTION_KEY` | `8f3e5b6d9c7a1e0f2b3a4c5d6e7f8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r` | Llave de 64 caracteres hex para cifrar con AES-256 los tokens de los hosts en DB. |
| `SPOTIFY_CLIENT_ID` | *Tu Client ID del panel de Spotify* | Identificador de tu aplicación ante Spotify. |
| `SPOTIFY_CLIENT_SECRET` | *Tu Client Secret del panel de Spotify* | Clave privada de tu aplicación ante Spotify. |
| `SPOTIFY_REDIRECT_URI` | `https://jamspotify.onrender.com/api/callback` | Dirección a la que Spotify enviará los tokens tras el login. |
| `FRONTEND_URL` | `https://jamspotify.onrender.com` | URL de tu frontend para restringir el acceso CORS por seguridad. |

7. Haz clic en el botón blanco **Deploy Web Service** al final de la página.

---

## 🔒 Paso 3: Configurar el Dashboard de Spotify Developers

Para que Spotify acepte inicios de sesión desde tu app en la nube y localmente:

1. Entra a tu [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) y abre tu aplicación.
2. Haz clic en el botón **Settings** en la esquina superior derecha.
3. En la sección **Redirect URIs**, asegúrate de tener añadidas estas dos direcciones exactas:
   * `http://127.0.0.1:3000/api/callback` (Para tus pruebas locales).
   * `https://jamspotify.onrender.com/api/callback` (Para producción en Render).
4. Haz clic en **Save** en la parte inferior para guardar los cambios.

### ⚠️ Limitación del "Modo Desarrollo" (Beta)
Por defecto, tu aplicación de Spotify estará en **Development Mode**. Esto significa que solo las personas que agregues explícitamente en el panel podrán iniciar sesión como **Hosts** (Anfitriones).

* Para permitir que tus amigos inicien sesión en tu app:
  1. En el panel de tu app de Spotify, haz clic en **Users and Access**.
  2. Añade el correo electrónico asociado a la cuenta de Spotify de cada persona que quiera crear una sala.
  3. *(Nota: Los invitados que solo escanean el código QR para añadir canciones no necesitan estar en esta lista, solo los hosts).*
* Si quieres abrir la web al público general para que cualquiera pueda entrar sin registrar su correo previamente, deberás hacer clic en **Request Extension** (o pasar a producción) en el dashboard de Spotify para que revisen tu diseño.

---

## ⚡ Cómo evitar que el servidor de Render se duerma gratis

El plan gratuito de Render apaga tu servidor si no recibe tráfico durante 15 minutos. El siguiente usuario que intente entrar experimentará una demora de unos 50 segundos mientras el servidor vuelve a despertar.

Para evitar esto de forma 100% gratuita:
1. Ve a [UptimeRobot](https://uptimerobot.com/) y regístrate gratis.
2. Haz clic en **Add New Monitor**.
3. Configura:
   * **Monitor Type:** `HTTP(s)`
   * **Friendly Name:** `JamSpotify Render`
   * **URL:** `https://jamspotify.onrender.com/`
   * **Monitoring Interval:** Cada `5 minutes`.
4. Guarda el monitor. 
5. UptimeRobot le hará una consulta rápida a tu web cada 5 minutos, engañando al servidor de Render para que se mantenga despierto e interactivo las 24 horas del día.
