# Primera carga de información

Los documentos de cotización existentes son la fuente de la carga histórica: no se suben directamente a la base de datos. Primero se extraen sus datos, se normalizan y se validan antes de registrarlos en CotizaPro.

## Información mínima por documento

- Cliente: razón social y, cuando esté disponible, RUC, contacto, correo y teléfono.
- Ubicación: nombre de planta/sede, dirección, distrito, provincia, departamento y coordenadas si existen.
- Cotización: código, fecha, vigencia, tipo y descripción del servicio, estado y moneda.
- Partidas: descripción, cantidad, unidad, precio unitario, subtotal, IGV y total.

## Proceso recomendado

1. Consolidar los documentos en una hoja de revisión, una fila por cotización y otra por partida.
2. Normalizar nombres repetidos de clientes y sedes; confirmar los RUC y direcciones ambiguas.
3. Revisar que los importes, el IGV y el total de cada documento coincidan.
4. Importar inicialmente clientes y sedes, y después las cotizaciones y sus partidas.
5. Conservar el documento original fuera de la base de datos como respaldo; esta primera versión no almacena archivos PDF o DOCX.

No se deben inventar campos ausentes. Para completar la primera tanda hacen falta, como mínimo, los documentos legibles y una confirmación del nombre correcto de cada cliente/sede cuando aparezca de más de una forma. Si no hay coordenadas, la sede puede cargarse sin ellas.
