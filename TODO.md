# Tareas pendientes

## Pedidos

- [ ] Corregir el registro público de pedidos en Supabase sin habilitar la lectura anónima de `orders`.
- [ ] Probar el checkout completo con un usuario no autenticado: subir comprobante, registrar pedido y mostrar el número generado.
- [ ] Mantener el flujo alternativo por WhatsApp cuando el comprobante se suba pero el pedido no pueda registrarse.
- [ ] Definir la limpieza de comprobantes huérfanos cuando su carga termine correctamente pero falle el registro del pedido.

## Inventario y stock

- [ ] Configurar en el entorno del servidor `INVENTARIO_SUPABASE_URL` para el proyecto `scpmqbhdtybryxcejkxc`.
- [ ] Configurar `INVENTARIO_SUPABASE_SERVICE_ROLE_KEY` como secreto privado en Cloudflare/Lovable. No usar el prefijo `VITE_` ni guardar la clave en el repositorio.
- [ ] Crear una operación backend atómica que valide las existencias y descuente `products.current_stock` según las cantidades compradas.
- [ ] Impedir que una compra deje stock negativo cuando dos clientes compren simultáneamente.
- [ ] Definir si el stock se descuenta al registrar el pedido o después de confirmar el pago.
- [ ] Reponer el stock automáticamente si un pedido se cancela después de haberlo descontado.
- [ ] Actualizar o invalidar el catálogo después de una compra para mostrar el stock vigente.

## Configuración y publicación

- [ ] Mantener separadas las variables del proyecto de pedidos y las de Inventario Amigo:
  - `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: pedidos.
  - `VITE_INVENTARIO_SUPABASE_URL` y `VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY`: lectura pública del inventario.
  - `INVENTARIO_SUPABASE_URL` e `INVENTARIO_SUPABASE_SERVICE_ROLE_KEY`: operaciones privadas de inventario desde el servidor.
- [ ] Publicar la aplicación después de implementar el registro de pedidos y el descuento de stock.
- [ ] Realizar una compra de prueba en producción y comprobar el pedido, el comprobante, el mensaje de WhatsApp y el stock final.

