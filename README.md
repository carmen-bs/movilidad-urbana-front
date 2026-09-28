# 🏙️ Movilidad Urbana

Aplicación web para consultar información de movilidad urbana y generar itinerarios entre diferentes lugares de una ciudad.

El proyecto permite seleccionar una ciudad, elegir lugares que se quieren visitar y generar diferentes alternativas de itinerario según el medio de transporte. También incorpora una sección de **aforos**, donde se visualiza la concentración estimada de personas por distrito y se muestran predicciones de afluencia.

## 🌐 Demo

**Aplicación:** https://movilidad-urbana-front.vercel.app

> El proyecto está desplegado en Vercel y utiliza una API desarrollada con FastAPI como backend.

---

## ✨ Funcionalidades

### 🗺️ Itinerarios

* Selección de ciudad.
* Consulta de lugares disponibles.
* Selección de varios lugares para visitar.
* Generación de diferentes alternativas de itinerario.
* Comparación de rutas según el medio de transporte.
* Visualización de las rutas sobre un mapa.
* Resumen de cada itinerario generado.

### 🚦 Aforos

* Selección de ciudad, fecha y hora.
* Visualización de los aforos por distrito sobre un mapa.
* Diferenciación de los niveles de afluencia mediante colores.
* Consulta de datos agrupados por zonas.
* Visualización de datos descriptivos de aforo.
* Predicción de afluencia para las horas siguientes.

### 🔐 Autenticación

* Inicio de sesión mediante Google.
* Gestión de la autenticación mediante Firebase Authentication.

---

## 🛠️ Tecnologías utilizadas

### Frontend

* **React**
* **Vite**
* **JavaScript / JSX**
* **Tailwind CSS**
* **shadcn/ui**
* **Leaflet**
* **React Router**

### Servicios y herramientas

* **Firebase Authentication**
* **Supabase**
* **OSRM** para el cálculo de rutas
* **Vercel** para el despliegue
* **Git / GitHub**

---

## 🧩 Arquitectura

El frontend está desarrollado como una aplicación React basada en componentes.

La comunicación con el backend se realiza mediante peticiones HTTP a una API REST desarrollada con FastAPI.

De forma simplificada:

```text
┌──────────────────────────────┐
│          React + Vite        │
│                              │
│  Login                       │
│  Itinerarios                 │
│  Mapas                       │
│  Aforos                      │
└──────────────┬───────────────┘
               │
               │ HTTP / REST
               ▼
┌──────────────────────────────┐
│       FastAPI Backend        │
│                              │
│  Itinerarios                 │
│  Rutas                       │
│  Lugares                     │
│  Aforos                      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           Supabase           │
│        Base de datos         │
└──────────────────────────────┘
```

Firebase Authentication se utiliza para gestionar el inicio de sesión.

---

## 📁 Estructura principal

```text
src/
├── components/
│   ├── AforosMap.jsx
│   ├── AforosPanel.jsx
│   ├── ItinerarySummaryPanel.jsx
│   ├── MapView.jsx
│   └── RoutesPanel.jsx
│
├── pages/
│   ├── AforosPage.jsx
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   └── NotFound.jsx
│
├── hooks/
│   └── useApi.js
│
├── lib/
│   └── firebase.js
│
└── ...
```

Los mapas de aforos utilizan archivos GeoJSON para representar los distritos de las diferentes ciudades.

---

## 🚀 Ejecutar el proyecto localmente

### 1. Clonar el repositorio

```bash
git clone https://github.com/carmen-bs/movilidad-urbana-front.git
cd movilidad-urbana-front
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las variables necesarias para Firebase y la API.

> Las credenciales y claves privadas no están incluidas en el repositorio.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible normalmente en:

```text
http://localhost:8080
```

---

## 🔗 Backend

El frontend utiliza una API independiente desarrollada con **FastAPI**.

**Repositorio:**
https://github.com/carmen-bs/movilidad-urbana-api

La API proporciona los datos necesarios para lugares, itinerarios, rutas y aforos.

---

## ☁️ Despliegue

El frontend está desplegado mediante **Vercel**.

La rama utilizada para producción es:

```text
main
```

Durante el desarrollo se utiliza:

```text
dev
```

Las nuevas funcionalidades se desarrollan y prueban en ramas de trabajo antes de incorporarse a `dev` y posteriormente a `main`.

---

## 📌 Estado del proyecto

Proyecto funcional con:

* Autenticación.
* Consulta de ciudades y lugares.
* Generación de itinerarios.
* Visualización de rutas sobre mapas.
* Consulta de aforos.
* Visualización de aforos por distrito.
* Datos descriptivos y predicciones de afluencia.
* Despliegue del frontend en Vercel.

---

## 👩‍💻 Autor

**Carmen**

Proyecto desarrollado como parte de mi formación en **Desarrollo de Aplicaciones Multiplataforma (DAM)**, con el objetivo de aplicar conocimientos de desarrollo frontend, backend, APIs, bases de datos, autenticación y despliegue.

### Tecnologías principales

`React` · `JavaScript` · `Vite` · `Python` · `FastAPI` · `Supabase` · `Firebase` · `Leaflet` · `Git` · `Vercel`
