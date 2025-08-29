# 📊 Sistema de Inventario de Equipos

Un sistema completo de gestión de inventario desarrollado en PHP con SQLite, que incluye autenticación de usuarios, seguimiento de estados de activos, auditoría completa y funcionalidades avanzadas de búsqueda y paginación.

## 🚀 Características Principales

### ✨ **Gestión de Activos**
- **CRUD completo** de equipos de inventario
- **Estados de condición** (Bueno, Perdido, Dañado, De baja)
- **Campo de observaciones** para información adicional
- **Búsqueda avanzada** por categoría, marca, serial, ubicación y observaciones
- **Paginación inteligente** para manejo de grandes volúmenes de datos

### 🔐 **Sistema de Autenticación**
- **Login seguro** con sesiones SQLite
- **Gestión de usuarios** con roles (admin/user)
- **Control de acceso** por permisos
- **Sesiones persistentes** con expiración automática

### 📈 **Dashboard y Reportes**
- **Estadísticas en tiempo real** del inventario
- **Gráficos interactivos** (categorías y ubicaciones)
- **Exportación a Excel y PDF** de reportes
- **Resumen visual** con métricas clave

### 🕒 **Auditoría y Trazabilidad**
- **Log completo de auditoría** de todas las acciones
- **Historial de cambios de estado** con usuario y fecha
- **Modal detallado** para ver información de auditoría
- **Trazabilidad completa** de modificaciones

### 🎨 **Interfaz de Usuario**
- **Diseño responsive** compatible con móviles
- **Interfaz moderna** con iconos intuitivos
- **Modales profesionales** para formularios
- **Badges de estado** con códigos de color
- **Timeline visual** para historial de cambios

## 📋 Requerimientos del Sistema

### **Servidor Web**
- **PHP 8.0+** con extensiones:
  - `pdo_sqlite`
  - `sqlite3`
  - `json`
  - `session`
- **Servidor HTTP** (Apache, Nginx, o servidor integrado de PHP)

### **Cliente (Navegador)**
- **Navegadores modernos** que soporten:
  - JavaScript ES6+
  - CSS3
  - HTML5
  - LocalStorage/SessionStorage

### **Dependencias JavaScript** (CDN)
- Chart.js 3.x
- jsPDF 2.x
- SheetJS (xlsx) 0.18.x

## 🛠️ Proceso de Instalación

### **1. Clonar/Descargar el Proyecto**
```bash
# Clonar el repositorio (si aplica)
git clone [URL_DEL_REPOSITORIO]

# O descomprimir el archivo zip en el directorio web
unzip inventario.zip -d /var/www/html/inventario
```

### **2. Configurar Permisos**
```bash
# Dar permisos de escritura a la carpeta de base de datos
chmod 755 /path/to/inventario/database/
chmod 666 /path/to/inventario/database/inventario.db
```

### **3. Verificar Extensiones PHP**
```bash
# Verificar que SQLite esté habilitado
php -m | grep -i sqlite

# Debe mostrar:
# pdo_sqlite
# sqlite3
```

### **4. Iniciar el Servidor**

#### **Opción A: Servidor Integrado de PHP (Desarrollo)**
```bash
cd /path/to/inventario
php -S localhost:8080
```

#### **Opción B: Apache/Nginx (Producción)**
```bash
# Copiar archivos al directorio web
cp -r inventario/ /var/www/html/

# Configurar virtual host si es necesario
# Reiniciar servidor web
sudo systemctl restart apache2  # o nginx
```

### **5. Inicialización Automática**
- La base de datos SQLite se crea automáticamente al primer acceso
- Los usuarios por defecto se insertan automáticamente
- Si existe un archivo `inventario.json`, se migra automáticamente a SQLite

### **6. Acceder a la Aplicación**
```
http://localhost:8080/login.html
```

## 🔑 Credenciales de Acceso

### **👑 Administrador Principal**
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** Administrador
- **Permisos:** Acceso completo al sistema

### **👤 Usuarios de Prueba**
- **Usuario:** `user1` | **Contraseña:** `admin123` | **Rol:** Usuario
- **Usuario:** `user2` | **Contraseña:** `admin123` | **Rol:** Usuario

## 📊 Estructura de la Base de Datos

### **🗂️ Tablas Principales**

#### **users** - Gestión de Usuarios
```sql
- id (INTEGER PRIMARY KEY)
- username (VARCHAR UNIQUE)
- password (VARCHAR - bcrypt hash)
- full_name (VARCHAR)
- email (VARCHAR)
- role (VARCHAR: 'admin'/'user')
- is_active (INTEGER)
- created_at, updated_at (DATETIME)
```

#### **assets** - Inventario de Activos
```sql
- id (INTEGER PRIMARY KEY)
- categoria (VARCHAR)
- marca (VARCHAR)
- serial (VARCHAR UNIQUE)
- cantidad (INTEGER)
- ubicacion (VARCHAR)
- observaciones (TEXT)
- condition_status (VARCHAR: 'Bueno'/'Perdido'/'Dañado'/'De baja')
- status (VARCHAR)
- created_by (INTEGER FK)
- created_at, updated_at (DATETIME)
```

#### **asset_status_history** - Historial de Cambios
```sql
- id (INTEGER PRIMARY KEY)
- asset_id (INTEGER FK)
- old_status, new_status (VARCHAR)
- changed_by (INTEGER FK)
- change_reason (TEXT)
- created_at (DATETIME)
```

#### **audit_log** - Registro de Auditoría
```sql
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FK)
- action (VARCHAR)
- table_name (VARCHAR)
- record_id (INTEGER)
- old_values, new_values (TEXT JSON)
- ip_address (VARCHAR)
- user_agent (TEXT)
- created_at (DATETIME)
```

## 🎯 Guía de Uso

### **1. Acceso Inicial**
1. Navegar a `http://localhost:8080/login.html`
2. Usar credenciales de administrador: `admin` / `admin123`
3. El sistema redirige automáticamente al dashboard

### **2. Gestión de Equipos**
- **Agregar:** Botón "Agregar Equipo" → Completar formulario
- **Editar:** Clic en icono ✏️ → Modificar datos → Guardar
- **Eliminar:** Clic en icono ✖️ → Confirmar eliminación
- **Cambiar Estado:** Clic en badge de estado → Seleccionar nuevo estado → Indicar razón

### **3. Búsqueda y Filtrado**
- Usar la barra de búsqueda para filtrar por cualquier campo
- La paginación se actualiza automáticamente
- Presionar Enter o clic en "Buscar"

### **4. Historial y Auditoría**
- **Ver historial:** Clic en icono 📋 → Modal con timeline de cambios
- **Auditoría:** Sección "Auditoría" → Ver todas las acciones del sistema
- **Detalles:** Clic en "Ver" en auditoría → Modal con información completa

### **5. Exportación**
- **Excel:** Botón "📊 Exportar Excel" → Descarga automática
- **PDF:** Botón "📄 Exportar PDF" → Descarga automática

## 🔧 Configuración Avanzada

### **Agregar Nuevos Usuarios**
```sql
INSERT INTO users (username, password, full_name, email, role) VALUES 
('nuevo_usuario', '$2y$10$[HASH_BCRYPT]', 'Nombre Completo', 'email@example.com', 'user');
```

### **Backup de Base de Datos**
```bash
# Crear backup
cp database/inventario.db database/backup_$(date +%Y%m%d_%H%M%S).db

# Restaurar backup
cp database/backup_YYYYMMDD_HHMMSS.db database/inventario.db
```

### **Personalización de Estados**
Modificar en `js/app.js` la variable `statusColors` para agregar/cambiar estados.

## 🐛 Solución de Problemas

### **Error: "Authentication required"**
- Verificar que las sesiones PHP estén habilitadas
- Comprobar permisos de escritura en directorio de sesiones

### **Error: "Database connection failed"**
- Verificar permisos en directorio `database/`
- Comprobar que SQLite esté instalado: `php -m | grep sqlite`

### **No se muestran gráficos**
- Verificar conexión a internet (Chart.js se carga desde CDN)
- Revisar consola del navegador para errores JavaScript

### **Exportación no funciona**
- Verificar que las librerías jsPDF y xlsx se carguen correctamente
- Comprobar configuración de popup blocker del navegador

## 👨‍💻 Información Técnica

### **Arquitectura**
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** PHP 8+ con SQLite
- **Base de Datos:** SQLite con esquema normalizado
- **Autenticación:** Sesiones PHP con tokens seguros

### **Seguridad**
- **Passwords:** Hasheados con bcrypt (cost 10)
- **Sesiones:** Tokens aleatorios con expiración
- **SQL Injection:** Prevención con PDO prepared statements
- **XSS:** Escapado de datos en frontend

### **Performance**
- **Paginación:** Consultas optimizadas con LIMIT/OFFSET
- **Índices:** Base de datos indexada en campos críticos
- **Caching:** Reutilización de conexiones PDO
- **Lazy Loading:** Carga bajo demanda de historiales

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, contactar al equipo de desarrollo.

---

**Versión:** 2.0  
**Última Actualización:** Agosto 2025  
**Compatibilidad:** PHP 8.0+, Navegadores modernos  
