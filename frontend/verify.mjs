import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// ── PASO 1: Cargar mesa/1 ──
console.log('\n=== PASO 1: Cargar http://localhost:5173/mesa/1 ===');
await page.goto('http://localhost:5173/mesa/1', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'verify_1_carga.png' });

const header = await page.locator('h1').first().textContent().catch(() => 'N/A');
const mesaNombre = await page.locator('p.text-xs.text-gray-400').first().textContent().catch(() => 'N/A');
console.log('Header:', header, '| Mesa:', mesaNombre);

// Contar banners
const banners = await page.locator('[class*="rounded-xl"]:has-text("En cocina"), [class*="rounded-xl"]:has-text("cocina")').count();
const bannersTotal = await page.locator('text=/En cocina|Listo para cobrar/').count();
console.log('Banners de estado visibles:', bannersTotal, '(esperado: 1 o 0)');

// ── PASO 2: Agregar producto ──
console.log('\n=== PASO 2: Agregar producto al carrito ===');
const agregarBtn = page.locator('button:has-text("Agregar")').first();
const tieneAgregar = await agregarBtn.count();
console.log('Botón Agregar visible:', tieneAgregar > 0);
if (tieneAgregar > 0) {
  await agregarBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verify_2_carrito.png' });
}

const verPedidoBtn = page.locator('button:has-text("Ver pedido")');
const tieneVerPedido = await verPedidoBtn.count();
console.log('Botón Ver pedido (carrito flotante):', tieneVerPedido > 0);

// ── PASO 3: Confirmar pedido ──
console.log('\n=== PASO 3: Confirmar pedido ===');
if (tieneVerPedido > 0) {
  await verPedidoBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verify_3_modal_carrito.png' });

  const confirmarBtn = page.locator('button:has-text("Confirmar pedido"), button:has-text("Agregar al pedido")').first();
  const tieneConfirmar = await confirmarBtn.count();
  console.log('Botón Confirmar/Agregar visible:', tieneConfirmar > 0);

  if (tieneConfirmar > 0) {
    const textoBtn = await confirmarBtn.textContent();
    console.log('Texto del botón:', textoBtn);
    await confirmarBtn.click();
    await page.waitForTimeout(3000); // esperar la mutation + notif
    await page.screenshot({ path: 'verify_4_pedido_enviado.png' });

    const notif = await page.locator('[class*="bg-green-500"], [class*="green"]').first().textContent().catch(() => '');
    console.log('Notificación visible:', notif || '(no encontrada)');
  }
}

// ── PASO 4: Verificar banner (solo 1) ──
console.log('\n=== PASO 4: Verificar banner "En cocina" ===');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'verify_5_banner.png' });
const bannersPost = await page.locator('text=/En cocina|cocina/i').count();
console.log('Banners de estado después del pedido:', bannersPost, '(esperado: 1)');

// ── PASO 5: Pedir la cuenta ──
console.log('\n=== PASO 5: Pedir la cuenta ===');
const pedirCuentaBtn = page.locator('button:has-text("Pedir la cuenta")');
const tienePedirCuenta = await pedirCuentaBtn.count();
console.log('Botón "Pedir la cuenta" visible:', tienePedirCuenta > 0);

if (tienePedirCuenta > 0) {
  await pedirCuentaBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'verify_6_cuenta.png' });

  const cuentaSolicitada = await page.locator('text=/Cuenta solicitada|Avisamos/i').count();
  const errorVisible = await page.locator('text=/error|Error/i').count();
  console.log('Badge "Cuenta solicitada":', cuentaSolicitada > 0);
  console.log('Error visible en pantalla:', errorVisible > 0);
} else {
  console.log('SKIP: no hay pedido activo aún para pedir cuenta');
}

// ── PASO 6: Verificar Caja ──
console.log('\n=== PASO 6: Verificar /panel/caja ===');
// Primero login
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first();
const passInput = page.locator('input[type="password"]').first();
const tieneLogin = await emailInput.count();
console.log('Formulario login encontrado:', tieneLogin > 0);

if (tieneLogin > 0) {
  await emailInput.fill('admin');
  await passInput.fill('admin');
  const loginBtn = page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar")').first();
  await loginBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_7_login.png' });

  await page.goto('http://localhost:5173/panel/caja', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_8_caja.png' });

  const cajaTexto = await page.locator('body').textContent();
  const tienePendiente = cajaTexto.includes('Pendientes') || cajaTexto.includes('Cobrar') || cajaTexto.includes('cobrar');
  const tieneAbrir = cajaTexto.includes('Abrir caja') || cajaTexto.includes('No hay caja');
  console.log('Caja: tiene pedidos pendientes:', tienePendiente);
  console.log('Caja: pide abrir caja:', tieneAbrir);
}

// ── Resumen errores ──
console.log('\n=== ERRORES DE CONSOLA ===');
if (consoleErrors.length === 0) {
  console.log('Ninguno');
} else {
  consoleErrors.forEach(e => console.log('ERROR:', e));
}

await browser.close();
console.log('\nScreenshots guardados: verify_*.png');
