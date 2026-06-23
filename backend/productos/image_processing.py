"""
Pipeline de procesamiento de imágenes para productos:
  1. Eliminar fondo (rembg IA si hay RAM suficiente, o PIL+numpy para fondos sólidos)
  2. Recortar espacio vacío
  3. Mejorar calidad: nitidez, contraste, saturación, brillo
  4. Escalar a 1200px con LANCZOS
"""
import io
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

_bg_session = None


def _get_rembg_session():
    """Carga la sesión rembg una sola vez. Lanza excepción si no hay RAM suficiente."""
    global _bg_session
    if _bg_session is None:
        from rembg import new_session
        # u2netp: modelo ligero ~4 MB, probado OK en esta máquina
        # isnet-general-use: mejor calidad pero requiere ~1 GB RAM libre
        for modelo in ('u2netp', 'isnet-general-use', 'u2net'):
            try:
                _bg_session = new_session(modelo)
                print(f'[Casa Rosa] Modelo de recorte: {modelo}')
                break
            except Exception:
                continue
        if _bg_session is None:
            raise RuntimeError('Ningún modelo rembg pudo cargarse')
    return _bg_session


def _remove_bg_rembg(imagen_bytes: bytes) -> Image.Image:
    from rembg import remove
    session = _get_rembg_session()
    result = remove(
        imagen_bytes,
        session=session,
        post_process_mask=True,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
    )
    buf: bytes = result  # type: ignore[assignment]
    return Image.open(io.BytesIO(buf)).convert('RGBA')


def _remove_bg_pil(img: Image.Image) -> Image.Image:
    """
    Eliminación de fondo basada en color usando PIL + numpy.
    Excelente para fotos de producto con fondo blanco, gris o sólido.

    Algoritmo:
      1. Samplea el color de fondo desde el borde de la imagen (mediana robusta)
      2. Calcula distancia euclidiana en RGB para cada píxel
      3. Genera máscara alpha suavizada
      4. Aplica refinado morfológico para bordes limpios
    """
    img = img.convert('RGBA')
    data = np.array(img, dtype=np.float32)
    h, w = data.shape[:2]

    # Borde de 8px alrededor para samplear el fondo
    margin = max(8, min(h, w) // 20)
    border_pixels = np.concatenate([
        data[:margin, :, :3].reshape(-1, 3),
        data[-margin:, :, :3].reshape(-1, 3),
        data[:, :margin, :3].reshape(-1, 3),
        data[:, -margin:, :3].reshape(-1, 3),
    ])
    bg_color = np.median(border_pixels, axis=0)

    # Distancia euclidiana de cada píxel al color de fondo
    rgb = data[:, :, :3]
    dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))

    # Tolerancia: bajo (fondos muy limpios) → alto (fondos irregulares)
    # 40 cubre fondos blancos/grises con variación de iluminación normal
    tol_low, tol_high = 25.0, 65.0
    alpha_arr = np.clip((dist - tol_low) / (tol_high - tol_low) * 255, 0, 255).astype(np.uint8)

    # Suavizar la máscara para bordes naturales
    alpha_img = Image.fromarray(alpha_arr, mode='L')
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=1.5))

    # Umbralizar: píxeles muy opacos → totalmente opacos; casi transparentes → totalmente transparentes
    alpha_np = np.array(alpha_img)
    alpha_np = np.where(alpha_np > 200, 255, np.where(alpha_np < 35, 0, alpha_np)).astype(np.uint8)

    # Segunda pasada de suavizado para el borde producto/fondo
    alpha_final = Image.fromarray(alpha_np, mode='L')
    alpha_final = alpha_final.filter(ImageFilter.GaussianBlur(radius=1.0))

    result = img.copy()
    result.putalpha(alpha_final)
    return result


def _remove_background(imagen_bytes: bytes) -> Image.Image:
    """Intenta rembg IA; si falla, usa el método PIL."""
    try:
        return _remove_bg_rembg(imagen_bytes)
    except Exception as e:
        print(f'[Casa Rosa] rembg no disponible ({e}), usando PIL fallback')
        img = Image.open(io.BytesIO(imagen_bytes))
        return _remove_bg_pil(img)


def _crop_to_content(img: Image.Image, padding: int = 20) -> Image.Image:
    """Recorta al bounding-box del contenido + margen."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    x1, y1, x2, y2 = bbox
    w, h = img.size
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    return img.crop((x1, y1, x2, y2))


def _upscale_to(img: Image.Image, target: int = 1200) -> Image.Image:
    """Escala al lado más largo = target px si la imagen es más pequeña."""
    w, h = img.size
    max_dim = max(w, h)
    if max_dim >= target:
        return img
    scale = target / max_dim
    return img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def _enhance(img: Image.Image) -> Image.Image:
    """Aplica mejoras de calidad al canal RGB preservando el alfa."""
    r, g, b, a = img.split()
    rgb = Image.merge('RGB', (r, g, b))

    # Nitidez con Unsharp Mask (radio, intensidad, umbral)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.8, percent=160, threshold=2))

    # Contraste moderado
    rgb = ImageEnhance.Contrast(rgb).enhance(1.18)

    # Saturación (colores más vivos y apetitosos)
    rgb = ImageEnhance.Color(rgb).enhance(1.30)

    # Brillo leve
    rgb = ImageEnhance.Brightness(rgb).enhance(1.06)

    r2, g2, b2 = rgb.split()
    return Image.merge('RGBA', (r2, g2, b2, a))


def procesar_imagen_producto(imagen_bytes: bytes) -> bytes:
    """
    Recibe bytes de imagen (JPG/PNG/WEBP).
    Devuelve bytes PNG con fondo transparente y calidad mejorada.
    """
    img = _remove_background(imagen_bytes)
    img = _crop_to_content(img)
    img = _upscale_to(img, target=1200)
    img = _enhance(img)

    out = io.BytesIO()
    img.save(out, format='PNG', optimize=True, compress_level=6)
    return out.getvalue()
