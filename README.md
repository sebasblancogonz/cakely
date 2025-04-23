# Aura Bakery Dashboard

Panel de control interno para la gestión de pedidos, clientes, recetas, presupuestos y ajustes generales de Aura Bakery.

## Descripción

Esta aplicación web, construida con Next.js y el App Router, centraliza la administración de las operaciones clave de Aura Bakery. Permite al personal gestionar eficientemente los pedidos desde su creación hasta la entrega, administrar la base de datos de clientes, configurar costes detallados para asegurar la rentabilidad, generar presupuestos precisos, definir recetas y visualizar la planificación de entregas.

## Funcionalidades Principales

- **Gestión de Pedidos:** Crear, ver, editar, eliminar y cambiar el estado de los pedidos. Búsqueda y paginación.
- **Gestión de Clientes:** Crear, ver, editar y eliminar clientes. Búsqueda y paginación.
- **Gestión de Ajustes:**
  - Configurar costes operativos (alquiler, precios de suministros como luz/gas/agua).
  - Definir coste por hora de mano de obra.
  - Establecer márgenes de beneficio e IVA aplicable.
  - Gestionar precios de materias primas (ingredientes) por unidad.
  - Definir y gestionar recetas base (ingredientes, cantidades, tiempo de elaboración).
- **Generador de Presupuestos:** Calcular precios de venta recomendados (PVP) para productos basados en recetas, costes configurados y margen de beneficio, mostrando desglose de costes.
- **Calendario de Entregas:** Visualizar los pedidos por entregar en una vista semanal o mensual.
- **Estadísticas:** Gráficas y resúmenes básicos sobre estados de pedidos, tipos de producto, métodos de pago e ingresos (filtrado por fecha).
- **Autenticación:** Sistema de inicio de sesión para usuarios autorizados (usando NextAuth.js).
- **Interfaz Responsiva:** Diseño adaptable a diferentes tamaños de pantalla.

## Tecnologías Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) (v15+ con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/) (gestionada en [NeonDB Serverless](https://neon.tech/))
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Gestor de Paquetes:** [pnpm](https://pnpm.io/)
- **UI:** [shadcn/ui](https://ui.shadcn.com/)
  - **Primitivos UI:** [Radix UI](https://www.radix-ui.com/)
  - **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Formularios:** [React Hook Form](https://react-hook-form.com/)
- **Validación:** [Zod](https://zod.dev/)
- **Autenticación:** [NextAuth.js](https://next-auth.js.org/) (v5 Beta)
- **Gráficas:** [Recharts](https://recharts.org/)
- **Manejo de Fechas:** [date-fns](https://date-fns.org/)
- **Gestión de Imágenes:** [ImageKit.io](https://imagekit.io/) (`imagekit`, `@imagekit/next`)
- **Utilidades:** `server-only`, `client-only`, `clsx`, `tailwind-merge`
- **Analytics:** `@vercel/analytics`

## Prerrequisitos

Antes de comenzar, necesitarás tener instalado en tu sistema:

- [Node.js](https://nodejs.org/) (v18.18 o superior)
- [pnpm](https://pnpm.io/installation) (v8 o v9 recomendada)
- [Git](https://git-scm.com/)
- Una cuenta y un proyecto creado en [NeonDB](https://neon.tech/) (para obtener la cadena de conexión PostgreSQL).

## Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local:

### 1. Clonar Repositorio

    git clone [URL_DEL_REPOSITORIO_GIT]
    cd aura-dashboard

_(Reemplaza `[URL_DEL_REPOSITORIO_GIT]` con la URL real)_

### 2. Instalar Dependencias

Usa `pnpm` para instalar todos los paquetes necesarios.

    pnpm install

_(Si encuentras errores ERESOLVE o de peer dependencies, asegúrate de que las versiones en `package.json` sean compatibles y considera limpiar `node_modules` y `pnpm-lock.yaml` antes de reinstalar)._

### 3. Configurar Variables de Entorno

- Crea una copia del archivo de ejemplo:

        cp .env.example .env.local

- Edita el archivo `.env.local` y añade los valores correspondientes:
  - **`POSTGRES_URL`**: Tu cadena de conexión de NeonDB. **Importante:** Usa la cadena de conexión estándar `postgresql://...` que soporta WebSockets (necesaria para las transacciones de Drizzle con `neon-serverless`), no la del proxy HTTP.
  - **`NEXTAUTH_URL`**: La URL base donde correrá tu aplicación en desarrollo. Por defecto: `http://localhost:3000`.
  - **`NEXTAUTH_SECRET`**: Una cadena secreta y aleatoria para NextAuth. Puedes generar una con: `openssl rand -base64 32` en tu terminal.
  - **(Opcional) Credenciales OAuth:** Si has configurado proveedores como Google o GitHub, añade aquí sus `CLIENT_ID` y `CLIENT_SECRET`.
    ```
    # AUTH_GOOGLE_ID=...
    # AUTH_GOOGLE_SECRET=...
    ```
  - **(Opcional) Claves ImageKit:** Si usas ImageKit para las imágenes de pedidos, añade tus claves:
    ```
    # IMAGEKIT_PUBLIC_KEY=...
    # IMAGEKIT_PRIVATE_KEY=...
    # IMAGEKIT_URL_ENDPOINT=...
    ```

### 4. Configurar Base de Datos (Migraciones)

- Con tu `POSTGRES_URL` configurada en `.env.local`, ejecuta las migraciones de Drizzle para crear la estructura de tablas en tu base de datos Neon:

        pnpm drizzle-kit push

  _Este comando aplica directamente los cambios definidos en tu schema Drizzle a la base de datos. Es útil para desarrollo._
  _(Para entornos de producción, es más recomendable generar archivos de migración SQL (`pnpm drizzle-kit generate:pg`) y aplicarlos con una herramienta de migración o manualmente)._

### 5. Ejecutar Servidor de Desarrollo

- Inicia la aplicación:

        pnpm run dev

  _(Este comando usará Turbopack por defecto, según tu `package.json`. Si prefieres Webpack, usa `pnpm run dev --no-turbo`)._

- Abre tu navegador y ve a [http://localhost:3000](http://localhost:3000) (o el puerto que indique la terminal).
