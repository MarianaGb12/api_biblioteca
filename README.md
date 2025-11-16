# Proyecto 1: Biblioteca Backend 
Autor: Mariana Guerrero Benavides

# Estructura del Proyecto
```
src/
├── config/
│   └── db.js              # Conexión a MongoDB
├── controllers/           # Controladores	
│   ├── usuariosControllers.js         
│   ├── librosControllers.js           
│   └── reservasControllers.js         
├── middleware/
│   └── auth.js            # Middleware de autenticación (JWT)
├── models/					  # Modelos del proyecto(usuario, libro)	
│   ├── Usuario.js         
│   ├── Libro.js           
│   └── Reserva.js         # Modelo para reservas
├── routes/					# Rutas
│   ├── usuarios.js        
│   ├── libros.js          
│   └── reservas.js  
├── tests/           # Pruebas	
│   ├── usuariosControllers.test.js         
│   ├── librosControllers.test.js           
│   └── reservasControllers.test.js      
└── server.js              # Servidor principal
```

# Clone repository
> https://github.com/MarianaGb12/api_biblioteca.git

# Enter to folder project
> cd api_biblioteca

# Install dependencies
> npm install


# Se debe crear un archivo .env con lo siguiente: 
```
MONGO_URI= url_MongoDB
JWT_SECRET= clave_secreta
PORT=4000

```

#Ejecutar el servidor
> npm run dev

## Endpoints Disponibles

### Usuarios
- `POST /api/usuarios/register` - registrar un usuario
- `POST /api/usuarios/login` - iniciar sesión
- `GET /api/usuarios/me` -  obtiene el perfil (requiere auth)
- `PUT /api/usuarios/:id` - actualizar info de usuario (requiere auth)
- `DELETE /api/usuarios/:id` - inhabilitar usuario (requiere auth)

### Libros
- `POST /api/libros/` - crear un libro (requiere auth admin/editor)
- `GET /api/libros/` - ver libros, se puede usar filtros de busqueda
- `GET /api/libros/:id` - leer un libro específico con su id
- `PUT /api/libros/:id` - actualizar info de libro (requiere auth admin/editor)
- `DELETE /api/libros/:id` - inhabilitar libro (requiere auth admin)

### Reservas
- `POST /api/reservas/` - Crear reserva (requiere auth)
- `GET /api/reservas/usuario/:id` - se observa historial de reservas con id de usuario
- `GET /api/reservas/libro/:id` - se observa historial de reservas con id de libro
